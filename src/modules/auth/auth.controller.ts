import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@schematics/decorators/custom.decorator';
import { DecodeTokenGuard } from '@schematics/guards/decodeToken.guard';
import { DecodedTokenKey } from '@utils/types/utils.constant';
import { AuthService } from './auth.service';
import { AuthResponseDTO, LoginUserDTO } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authSrv: AuthService) {}

  @ApiOperation({ description: 'Login' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: AuthResponseDTO })
  @Post('/login')
  async login(@Body() payload: LoginUserDTO): Promise<AuthResponseDTO> {
    return await this.authSrv.login(payload);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ description: 'Refresh token' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: AuthResponseDTO })
  @UseGuards(DecodeTokenGuard)
  @Get('/refresh-token')
  async refreshToken(
    @CurrentUser(DecodedTokenKey.USER_ID) userId: string,
  ): Promise<AuthResponseDTO> {
    return await this.authSrv.refreshToken(userId);
  }
}
