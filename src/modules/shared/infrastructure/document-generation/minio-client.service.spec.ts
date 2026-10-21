import {
  classifyStorageError,
  MinioClientService,
} from './minio-client.service';

// The S3 client is mocked so these tests need no running object store: they
// cover the service's own logic (provisioning, error classification, fail-fast
// start-up), which is what FR-007/FR-010/FR-011 bind.
const mockBucketExists = jest.fn();
const mockMakeBucket = jest.fn();
const mockPutObject = jest.fn();
const mockGetObject = jest.fn();
const mockRemoveObject = jest.fn();
const mockPresignedGetObject = jest.fn();

jest.mock('minio', () => ({
  Client: jest.fn(() => ({
    bucketExists: mockBucketExists,
    makeBucket: mockMakeBucket,
    putObject: mockPutObject,
    getObject: mockGetObject,
    removeObject: mockRemoveObject,
    presignedGetObject: mockPresignedGetObject,
  })),
}));

const UNREACHABLE = Object.assign(
  new Error('connect ECONNREFUSED 127.0.0.1:9000'),
  {
    code: 'ECONNREFUSED',
  },
);

describe('classifyStorageError', () => {
  it('classifies a missing object/bucket as not-found', () => {
    expect(classifyStorageError({ code: 'NoSuchKey' })).toBe('not-found');
    expect(classifyStorageError({ code: 'NoSuchBucket' })).toBe('not-found');
  });

  it('classifies rejected credentials as access-denied', () => {
    expect(classifyStorageError({ code: 'InvalidAccessKeyId' })).toBe(
      'access-denied',
    );
    expect(classifyStorageError({ code: 'SignatureDoesNotMatch' })).toBe(
      'access-denied',
    );
  });

  it('classifies connection failures as unreachable', () => {
    expect(classifyStorageError({ code: 'ECONNREFUSED' })).toBe('unreachable');
    expect(classifyStorageError({ code: 'ENOTFOUND' })).toBe('unreachable');
    expect(classifyStorageError({ code: 'ETIMEDOUT' })).toBe('unreachable');
  });

  it('detects an unreachable store from a bare message with no code', () => {
    expect(classifyStorageError(new Error('connect ECONNREFUSED'))).toBe(
      'unreachable',
    );
    expect(classifyStorageError(new Error('socket hang up'))).toBe(
      'unreachable',
    );
  });

  it('keeps the three operator-relevant categories distinct', () => {
    const kinds = [
      classifyStorageError({ code: 'NoSuchKey' }),
      classifyStorageError({ code: 'InvalidAccessKeyId' }),
      UNREACHABLE && classifyStorageError(UNREACHABLE),
    ];
    expect(new Set(kinds).size).toBe(3);
  });

  it('falls back to unknown rather than guessing', () => {
    expect(classifyStorageError({ code: 'SomethingElse' })).toBe('unknown');
    expect(classifyStorageError(undefined)).toBe('unknown');
  });
});

describe('MinioClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureBucket — idempotent provisioning (FR-007)', () => {
    it('creates the bucket when absent', async () => {
      mockBucketExists.mockResolvedValue(false);
      mockMakeBucket.mockResolvedValue(undefined);

      await new MinioClientService().ensureBucket('documents');

      expect(mockBucketExists).toHaveBeenCalledWith('documents');
      expect(mockMakeBucket).toHaveBeenCalledWith('documents');
    });

    it('does NOT recreate an existing bucket, and does not error', async () => {
      mockBucketExists.mockResolvedValue(true);
      mockMakeBucket.mockResolvedValue(undefined);

      await expect(
        new MinioClientService().ensureBucket('documents'),
      ).resolves.toBeUndefined();

      expect(mockBucketExists).toHaveBeenCalledWith('documents');
      expect(mockMakeBucket).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit — fail fast and visibly (FR-011, FR-010)', () => {
    it('refuses to start when the store is unreachable, naming the cause', async () => {
      mockBucketExists.mockRejectedValue(UNREACHABLE);

      await expect(new MinioClientService().onModuleInit()).rejects.toThrow(
        /ECONNREFUSED/,
      );
    });

    it('starts successfully when the bucket already exists', async () => {
      mockBucketExists.mockResolvedValue(true);

      await expect(
        new MinioClientService().onModuleInit(),
      ).resolves.toBeUndefined();
      expect(mockMakeBucket).not.toHaveBeenCalled();
    });
  });

  describe('operations preserve their contracts', () => {
    async function initialized(): Promise<MinioClientService> {
      mockBucketExists.mockResolvedValue(true);
      const svc = new MinioClientService();
      await svc.onModuleInit();
      return svc;
    }

    it('uploadFile returns `bucket/objectName`', async () => {
      mockPutObject.mockResolvedValue({ etag: 'x' });
      const svc = await initialized();
      const body = Buffer.from('payload');

      await expect(
        svc.uploadFile('documents', 'folder/file.pdf', body, 'application/pdf'),
      ).resolves.toBe('documents/folder/file.pdf');
      expect(mockPutObject).toHaveBeenCalledWith(
        'documents',
        'folder/file.pdf',
        body,
        body.length,
        { 'Content-Type': 'application/pdf' },
      );
    });

    it('rethrows a failed upload rather than swallowing it', async () => {
      mockPutObject.mockRejectedValue({ code: 'AccessDenied' });
      const svc = await initialized();

      await expect(
        svc.uploadFile(
          'documents',
          'a.pdf',
          Buffer.from('x'),
          'application/pdf',
        ),
      ).rejects.toMatchObject({ code: 'AccessDenied' });
    });

    it('rethrows a failed delete rather than swallowing it', async () => {
      mockRemoveObject.mockRejectedValue({ code: 'NoSuchKey' });
      const svc = await initialized();

      await expect(
        svc.deleteFile('documents', 'gone.pdf'),
      ).rejects.toMatchObject({
        code: 'NoSuchKey',
      });
    });

    it('getObjectStream returns the stream from the store', async () => {
      const stream = { pipe: jest.fn() };
      mockGetObject.mockResolvedValue(stream);
      const svc = await initialized();

      await expect(svc.getObjectStream('documents', 'a.pdf')).resolves.toBe(
        stream,
      );
    });
  });

  describe('getPublicDownloadUrl — the store is never exposed (FR-009)', () => {
    it('returns an application-hosted proxy URL, not a store URL', () => {
      const url = new MinioClientService().getPublicDownloadUrl(
        'documents',
        'a/b.pdf',
      );

      expect(url).toContain('/documents/download?');
      expect(url).toContain('bucket=documents');
      expect(url).toContain('object=a%2Fb.pdf');
      // The store's own endpoint must not leak into client-facing links.
      expect(url).not.toMatch(/:9000/);
    });
  });
});
