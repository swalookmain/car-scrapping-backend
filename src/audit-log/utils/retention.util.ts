import { Role } from 'src/common/enum/role.enum';

export function getRetentionDate(role: Role): Date {
  const now = new Date();

  const retentionDays: Record<Role, number> = {
    SUPER_ADMIN: 30,
    ADMIN: 30,
    STAFF: 15,
    SYSTEM: 7,
  };
  now.setDate(now.getDate() + retentionDays[role]);
  return now;
}
