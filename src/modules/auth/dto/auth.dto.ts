import { User } from '@entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '@utils/types/utils.constant';
import { BaseResponseTypeDTO } from '@utils/types/utils.types';

export class AuthResponse {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({
    enum: AppRole,
  })
  role: AppRole;

  @ApiProperty()
  dateCreated: Date;

  @ApiProperty()
  token: string;

  @ApiProperty()
  tokenInitializationDate: number;

  @ApiProperty()
  tokenExpiryDate: number;

  @ApiProperty({ type: User })
  user: User;
}

export class LoginUserDTO {
  @ApiProperty()
  email: string;

  @ApiProperty()
  password: string;
}

export class AuthResponseDTO extends BaseResponseTypeDTO {
  @ApiProperty()
  data: AuthResponse;
}
