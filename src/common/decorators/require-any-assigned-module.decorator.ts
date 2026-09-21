import { SetMetadata } from '@nestjs/common';
import { REQUIRE_ANY_ASSIGNED_MODULE_KEY } from '../access/access.constants';

export const RequireAnyAssignedModule = () =>
  SetMetadata(REQUIRE_ANY_ASSIGNED_MODULE_KEY, true);
