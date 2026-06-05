export const USER_PROVISIONING_PORT = Symbol('USER_PROVISIONING_PORT');

export interface CreateUserDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  roles?: string[];
  status?: string;
}

export interface UserProvisioningPort {
  createUser(dto: CreateUserDto): Promise<{ id: string; email: string }>;
  linkUserToEmployee(userId: string, employeeId: string): Promise<void>;
}

export const USER_PROVISIONING_RESULT_PORT = Symbol(
  'USER_PROVISIONING_RESULT_PORT',
);

export interface UserProvisioningResult {
  id: string;
  email: string;
}
