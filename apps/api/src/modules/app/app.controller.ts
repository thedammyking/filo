import { Controller, Get, Logger } from '@nestjs/common';

import { Public } from '@/commons/decorators/public.decorator';

@Controller()
export class AppController {
  // Instantiate Logger
  private readonly logger = new Logger(AppController.name);

  @Public()
  @Get()
  async app() {
    this.logger.log('Root endpoint / hit');
    return 'Hello Filo API';
  }
}
