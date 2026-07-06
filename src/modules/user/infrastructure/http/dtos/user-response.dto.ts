import { User, UserStatus } from '../../../domain/entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  status: UserStatus;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  roles?: string[];
  permissions?: string[];

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.username = user.username ?? null;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.fullName = user.fullName;
    dto.status = user.status;
    dto.lastLogin = undefined;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.roles = user.roles;
    dto.permissions = user.permissions;
    return dto;
  }
}
