import { Controller, Get } from '@nestjs/common';

import { Public } from '@/commons/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  async app() {
    return 'Hello World';
  }
}
