import { SetMetadata } from '@nestjs/common';
import { SKIP_MODULE_CHECK_KEY } from '../access/access.constants';

export const SkipModuleCheck = () => SetMetadata(SKIP_MODULE_CHECK_KEY, true);
