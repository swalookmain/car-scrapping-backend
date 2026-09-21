import { SetMetadata } from '@nestjs/common';
import { SET_MODULE_KEY } from '../access/access.constants';

export const SetModule = (...moduleIds: string[]) =>
  SetMetadata(SET_MODULE_KEY, moduleIds);
