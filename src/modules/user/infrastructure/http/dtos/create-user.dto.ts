export class CreateUserHttpDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
  status?: 'active' | 'inactive' | 'suspended';
}
