export interface UserIdentity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export const USER_IDENTITY_PORT = Symbol('USER_IDENTITY_PORT');

export interface UserIdentityPort {
  getIdentity(userId: string): Promise<UserIdentity | null>;
}
