import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../access/access.constants';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
