import { Controller, Get, Logger } from '@nestjs/common';

import { Public } from '@/commons/decorators/public.decorator';

@Controller()
export class AppController {
  // Instantiate Logger
  private readonly logger = new Logger(AppController.name);

  @Public()
  @Get()
  async app() {
    this.logger.log('Root endpoint /api hit');
    return 'Hello Filo API';
  }

  @Public()
  @Get('health')
  healthCheck() {
    this.logger.log('Health check endpoint /api/v1/health hit');
    return {
      status: 'ok',
      message: 'Filo API is healthy',
      timestamp: new Date().toISOString()
    };
  }
}
