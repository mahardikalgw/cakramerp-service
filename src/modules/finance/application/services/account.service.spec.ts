import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AccountService } from './account.service';
import {
  ACCOUNT_REPOSITORY,
  JOURNAL_ENTRY_LINE_REPOSITORY,
} from '../../domain/repositories/finance-repository.port';
import { CreateAccountCommand } from '../commands/create-account.command';
import { UpdateAccountCommand } from '../commands/update-account.command';

describe('AccountService', () => {
  let service: AccountService;

  const mockAccountRepo = {
    findAllFlat: jest.fn(),
    findActive: jest.fn(),
    findByCode: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockJournalLineRepo = {
    findByAccountIdsAndDateRange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: ACCOUNT_REPOSITORY, useValue: mockAccountRepo },
        {
          provide: JOURNAL_ENTRY_LINE_REPOSITORY,
          useValue: mockJournalLineRepo,
        },
      ],
    }).compile();

    service = module.get(AccountService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccountTree', () => {
    it('should return accounts organized as a tree', async () => {
      const accounts = [
        {
          id: '1',
          code: '1000',
          name: 'Assets',
          type: 'asset',
          isActive: true,
          parentId: undefined,
        },
        {
          id: '2',
          code: '1100',
          name: 'Cash',
          type: 'asset',
          isActive: true,
          parentId: '1',
        },
        {
          id: '3',
          code: '2000',
          name: 'Liabilities',
          type: 'liability',
          isActive: true,
          parentId: undefined,
        },
      ];
      mockAccountRepo.findAllFlat.mockResolvedValue(accounts);

      const result = await service.getAccountTree();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('1000');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].code).toBe('1100');
      expect(result[1].code).toBe('2000');
    });

    it('should sort roots by type order then code', async () => {
      const accounts = [
        {
          id: '3',
          code: '4000',
          name: 'Revenue',
          type: 'revenue',
          isActive: true,
          parentId: undefined,
        },
        {
          id: '1',
          code: '1000',
          name: 'Assets',
          type: 'asset',
          isActive: true,
          parentId: undefined,
        },
        {
          id: '2',
          code: '2000',
          name: 'Liabilities',
          type: 'liability',
          isActive: true,
          parentId: undefined,
        },
      ];
      mockAccountRepo.findAllFlat.mockResolvedValue(accounts);

      const result = await service.getAccountTree();

      expect(result[0].type).toBe('asset');
      expect(result[1].type).toBe('liability');
      expect(result[2].type).toBe('revenue');
    });
  });

  describe('getActiveAccounts', () => {
    it('should return active accounts', async () => {
      const accounts = [
        { id: '1', code: '1000', name: 'Cash', type: 'asset', isActive: true },
      ];
      mockAccountRepo.findActive.mockResolvedValue(accounts);

      const result = await service.getActiveAccounts();

      expect(result).toEqual(accounts);
      expect(mockAccountRepo.findActive).toHaveBeenCalled();
    });
  });

  describe('createAccount', () => {
    it('should create an account successfully', async () => {
      const command = new CreateAccountCommand('1000', 'Cash', 'asset');
      mockAccountRepo.findByCode.mockResolvedValue(null);
      mockAccountRepo.save.mockImplementation(async (acc) => ({
        id: '1',
        ...acc,
      }));

      const result = await service.createAccount(command);

      expect(result.code).toBe('1000');
      expect(result.name).toBe('Cash');
      expect(result.type).toBe('asset');
      expect(result.isActive).toBe(true);
      expect(mockAccountRepo.save).toHaveBeenCalled();
    });

    it('should throw if account code already exists', async () => {
      const command = new CreateAccountCommand('1000', 'Cash', 'asset');
      mockAccountRepo.findByCode.mockResolvedValue({ id: '1', code: '1000' });

      await expect(service.createAccount(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createAccount(command)).rejects.toThrow(
        'Account code "1000" already exists',
      );
    });

    it('should throw if parent account not found', async () => {
      const command = new CreateAccountCommand(
        '1100',
        'Cash',
        'asset',
        undefined,
        undefined,
        undefined,
        '999',
      );
      mockAccountRepo.findByCode.mockResolvedValue(null);
      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(service.createAccount(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createAccount(command)).rejects.toThrow(
        'Parent account not found',
      );
    });

    it('should create account with parent if parent exists', async () => {
      const command = new CreateAccountCommand(
        '1100',
        'Cash',
        'asset',
        undefined,
        undefined,
        undefined,
        '1',
      );
      mockAccountRepo.findByCode.mockResolvedValue(null);
      mockAccountRepo.findById.mockResolvedValue({
        id: '1',
        code: '1000',
        name: 'Assets',
      });
      mockAccountRepo.save.mockImplementation(async (acc) => ({
        id: '2',
        ...acc,
      }));

      const result = await service.createAccount(command);

      expect(result.parentId).toBe('1');
    });
  });

  describe('updateAccount', () => {
    it('should update account fields', async () => {
      const existing = {
        id: '1',
        code: '1000',
        name: 'Old Name',
        type: 'asset',
        isActive: true,
        updatedAt: new Date(),
      };
      const command = new UpdateAccountCommand(undefined, 'New Name');
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockAccountRepo.save.mockImplementation(async (acc) => acc);

      const result = await service.updateAccount('1', command);

      expect(result.name).toBe('New Name');
      expect(result.code).toBe('1000');
    });

    it('should throw if account not found', async () => {
      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateAccount('999', new UpdateAccountCommand('x')),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateAccount('999', new UpdateAccountCommand('x')),
      ).rejects.toThrow('Account not found');
    });

    it('should throw if new code already exists', async () => {
      const existing = { id: '1', code: '1000', name: 'Cash', type: 'asset' };
      const command = new UpdateAccountCommand('2000');
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockAccountRepo.findByCode.mockResolvedValue({ id: '2', code: '2000' });

      await expect(service.updateAccount('1', command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if account is set as its own parent', async () => {
      const existing = { id: '1', code: '1000', name: 'Cash', type: 'asset' };
      const command = new UpdateAccountCommand(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '1',
      );
      mockAccountRepo.findById.mockResolvedValue(existing);

      await expect(service.updateAccount('1', command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if new parent not found', async () => {
      const existing = { id: '1', code: '1000', name: 'Cash', type: 'asset' };
      const command = new UpdateAccountCommand(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '999',
      );
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockAccountRepo.findById
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);

      await expect(service.updateAccount('1', command)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account with no current transactions', async () => {
      const existing = {
        id: '1',
        code: '1000',
        name: 'Cash',
        type: 'asset',
        isActive: true,
      };
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockJournalLineRepo.findByAccountIdsAndDateRange.mockResolvedValue([]);
      mockAccountRepo.save.mockImplementation(async (acc) => acc);

      const result = await service.deactivateAccount('1');

      expect(result.isActive).toBe(false);
    });

    it('should throw if account has current period transactions', async () => {
      const existing = {
        id: '1',
        code: '1000',
        name: 'Cash',
        type: 'asset',
        isActive: true,
      };
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockJournalLineRepo.findByAccountIdsAndDateRange.mockResolvedValue([
        { id: 'line1' },
      ]);

      await expect(service.deactivateAccount('1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deactivateAccount('1')).rejects.toThrow(
        'Cannot deactivate account with transactions in the current open period',
      );
    });

    it('should throw if account not found', async () => {
      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(service.deactivateAccount('999')).rejects.toThrow(
        'Account not found',
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account with no journal lines', async () => {
      const existing = { id: '1', code: '1000', name: 'Cash', type: 'asset' };
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockJournalLineRepo.findByAccountIdsAndDateRange.mockResolvedValue([]);
      mockAccountRepo.delete.mockResolvedValue(undefined);

      await service.deleteAccount('1');

      expect(mockAccountRepo.delete).toHaveBeenCalledWith('1');
    });

    it('should throw if account has journal entry lines', async () => {
      const existing = { id: '1', code: '1000', name: 'Cash', type: 'asset' };
      mockAccountRepo.findById.mockResolvedValue(existing);
      mockJournalLineRepo.findByAccountIdsAndDateRange.mockResolvedValue([
        { id: 'line1' },
      ]);

      await expect(service.deleteAccount('1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteAccount('1')).rejects.toThrow(
        'Cannot delete account that has journal entry lines',
      );
    });

    it('should throw if account not found', async () => {
      mockAccountRepo.findById.mockResolvedValue(null);

      await expect(service.deleteAccount('999')).rejects.toThrow(
        'Account not found',
      );
    });
  });
});
