import { Role } from '../enum/role.enum';

export interface AuthenticatedUser {
  userId: string;
  role: Role;
  orgId: string | null;
  email: string;
  name: string;
}
