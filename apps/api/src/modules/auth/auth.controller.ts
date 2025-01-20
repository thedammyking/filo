import { User } from '@filo/types';
import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from '@/commons/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}
