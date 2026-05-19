import { User, UserStatus } from '../../../domain/entities/user.entity';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;

  static fromDomain(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.fullName = user.fullName;
    dto.status = user.status;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
