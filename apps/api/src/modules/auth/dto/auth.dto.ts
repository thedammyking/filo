import { ApiProperty } from '@nestjs/swagger';
import { type User } from '@filo/interfaces';

export class UserResponse implements Partial<User> {
  @ApiProperty({
    example: '1234567890',
    description: 'The user ID'
  })
  id: string;

  @ApiProperty({
    example: 'John',
    description: 'The user first name'
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'The user last name'
  })
  lastName: string;

  @ApiProperty({
    example: 'john.doe',
    description: 'The user username'
  })
  username: string;

  @ApiProperty({
    example: 'https://filo.com',
    description: 'The user avatar URL'
  })
  imageUrl: string;
}
