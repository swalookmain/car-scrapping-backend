import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { SkipModuleCheck } from './common/decorators/skip-module-check.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @SkipModuleCheck()
  getHello(): string {
    return this.appService.getHello();
  }
}
