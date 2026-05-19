export const USER_ROLE_ASSIGNER_PORT = Symbol('USER_ROLE_ASSIGNER_PORT');

export interface UserRoleAssignerPort {
  assignRoles(userId: string, roleIds: string[]): Promise<void>;
}
