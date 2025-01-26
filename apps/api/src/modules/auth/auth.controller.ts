import type { User } from '@filo/interfaces';
import { Controller, Get } from '@nestjs/common';

import { CurrentUser } from '@/commons/decorators/current-user.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserResponse } from './dto/auth.dto';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: 'Get the current user' })
  @ApiResponse({
    status: 200,
    description: 'The current user',
    type: UserResponse
  })
  async getProfile(@CurrentUser() user: User) {
    return user;
  }
}
