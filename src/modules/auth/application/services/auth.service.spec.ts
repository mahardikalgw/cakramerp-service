import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { AuthService } from './auth.service';
import { USER_REPOSITORY } from '../../../user/domain/repositories/user-repository.port';
import { AUTH_REPOSITORY } from '../../domain/repositories/auth-repository.port';
import { USER_ROLE_ASSIGNER_PORT } from '../../../../shared/kernel/domain/ports/user-role-assigner.port';
import { ROLE_REPOSITORY } from '../../../iam/domain/repositories/role-repository.port';
import { LoginCommand } from '../commands/login.command';
import { RegisterCommand } from '../commands/register.command';
import { User } from '../../../user/domain/entities/user.entity';
import { Role } from '../../../iam/domain/entities/role.entity';
import { RefreshToken } from '../../domain/entities/refresh-token.entity';
import { MfaService } from './mfa.service';
import { TokenDenylistService } from '../../infrastructure/services/token-denylist.service';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
    bumpTokenVersion: jest.fn(),
  };

  const mockAuthRepository = {
    findByTokenHash: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByUserId: jest.fn(),
  };

  const mockRoleAssigner = {
    assignRoles: jest.fn(),
  };

  const mockRoleRepository = {
    findByName: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockMfaService = {
    verifyCode: jest.fn(),
  };

  const mockTokenDenylistService = {
    deny: jest.fn().mockResolvedValue(undefined),
    isDenied: jest.fn().mockResolvedValue(false),
  };

  const mockAuditLogQueue = {
    add: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: AUTH_REPOSITORY, useValue: mockAuthRepository },
        { provide: USER_ROLE_ASSIGNER_PORT, useValue: mockRoleAssigner },
        { provide: ROLE_REPOSITORY, useValue: mockRoleRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MfaService, useValue: mockMfaService },
        { provide: TokenDenylistService, useValue: mockTokenDenylistService },
        { provide: 'BullQueue_audit-log', useValue: mockAuditLogQueue },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user, assign customer role, and return tokens', async () => {
      const command = new RegisterCommand(
        'test@example.com',
        'Pass123!',
        'John',
        'Doe',
      );
      mockUserRepository.existsByEmail.mockResolvedValue(false);
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-password');
      const savedUser = new User({
        id: 'user-1',
        email: command.email,
        passwordHash: 'hashed-password',
        firstName: command.firstName,
        lastName: command.lastName,
      });
      mockUserRepository.save.mockResolvedValue(savedUser);
      const customerRole = new Role({
        id: 'customer-role-id',
        name: 'customer',
      });
      mockRoleRepository.findByName.mockResolvedValue(customerRole);
      mockRoleAssigner.assignRoles.mockResolvedValue(undefined);
      const userWithRole = new User({
        id: 'user-1',
        email: command.email,
        passwordHash: 'hashed-password',
        firstName: command.firstName,
        lastName: command.lastName,
        roles: ['customer'],
        permissions: [],
      });
      mockUserRepository.findById.mockResolvedValue(userWithRole);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      mockAuthRepository.save.mockResolvedValue({});

      const result = await service.register(command);

      expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockRoleRepository.findByName).toHaveBeenCalledWith('customer');
      expect(mockRoleAssigner.assignRoles).toHaveBeenCalledWith('user-1', [
        'customer-role-id',
      ]);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.expiresIn).toBe(900);
    });

    it('should throw ConflictException if email already exists', async () => {
      const command = new RegisterCommand(
        'existing@example.com',
        'Pass123!',
        'John',
        'Doe',
      );
      mockUserRepository.existsByEmail.mockResolvedValue(true);

      await expect(service.register(command)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens', async () => {
      const command = new LoginCommand('test@example.com', 'Pass123!');
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
      });
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(true);
      mockUserRepository.findById.mockResolvedValue(user);
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');
      mockAuthRepository.save.mockResolvedValue({});

      const result = await service.login(command);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(bcryptjs.compare).toHaveBeenCalledWith(
        'Pass123!',
        'hashed-password',
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const command = new LoginCommand('unknown@example.com', 'Pass123!');
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const command = new LoginCommand('test@example.com', 'WrongPass');
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
      });
      mockUserRepository.findByEmail.mockResolvedValue(user);
      (bcryptjs.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const storedToken = new RefreshToken({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      storedToken.isExpired = jest.fn().mockReturnValue(false);

      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockAuthRepository.findByTokenHash.mockResolvedValue(storedToken);
      const user = new User({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
      });
      mockUserRepository.findById.mockResolvedValue(user);
      mockAuthRepository.delete.mockResolvedValue(true);
      mockJwtService.sign
        .mockReturnValueOnce('new-access')
        .mockReturnValueOnce('new-refresh');
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-new-refresh');
      mockAuthRepository.save.mockResolvedValue({});

      const result = await service.refresh('some-refresh-token');

      expect(mockAuthRepository.findByTokenHash).toHaveBeenCalled();
      expect(mockAuthRepository.delete).toHaveBeenCalledWith('token-1');
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('should throw UnauthorizedException if refresh token not found', async () => {
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockAuthRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token is expired', async () => {
      const storedToken = new RefreshToken({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() - 86400000),
      });
      storedToken.isExpired = jest.fn().mockReturnValue(true);

      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockAuthRepository.findByTokenHash.mockResolvedValue(storedToken);

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found during refresh', async () => {
      const storedToken = new RefreshToken({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
      });
      storedToken.isExpired = jest.fn().mockReturnValue(false);

      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockAuthRepository.findByTokenHash.mockResolvedValue(storedToken);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.refresh('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should delete the refresh token on logout', async () => {
      const storedToken = new RefreshToken({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 86400000),
      });

      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockAuthRepository.findByTokenHash.mockResolvedValue(storedToken);
      mockAuthRepository.delete.mockResolvedValue(true);

      await service.logout('some-refresh-token');

      expect(mockAuthRepository.delete).toHaveBeenCalledWith('token-1');
    });

    it('should not throw if refresh token not found during logout', async () => {
      (bcryptjs.hash as jest.Mock).mockResolvedValue('hashed-token');
      mockAuthRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.logout('unknown-token')).resolves.toBeUndefined();
      expect(mockAuthRepository.delete).not.toHaveBeenCalled();
    });
  });
});
