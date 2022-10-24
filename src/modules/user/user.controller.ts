import {
  Controller,
  Body,
  Post,
  Patch,
  Get,
  Param,
  UseGuards,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthResponseDTO } from '@modules/auth/dto/auth.dto';
import { CurrentUser } from '@schematics/decorators/custom.decorator';
import { RolesGuard } from '@schematics/guards/roles.guard';
import { DecodedTokenKey } from '@utils/types/utils.constant';
import {
  BaseResponseTypeDTO,
  PaginationRequestType,
} from '@utils/types/utils.types';
import {
  ChangePasswordDTO,
  CreateUserDTO,
  UpdatePasswordDTO,
  UpdateUserDTO,
  UserResponseDTO,
  UsersResponseDTO,
} from './dto/user.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userSrv: UserService) {}

  @ApiOperation({ description: 'Sign up' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: AuthResponseDTO })
  @Post('/sign-up')
  async createUser(@Body() payload: CreateUserDTO): Promise<AuthResponseDTO> {
    return await this.userSrv.createUser(payload);
  }

  @ApiOperation({ description: 'Update user password' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @ApiBearerAuth('JWT')
  @UseGuards(RolesGuard)
  @Post('/change-account-password')
  async changeAccountPassword(
    @Body() payload: ChangePasswordDTO,
    @CurrentUser(DecodedTokenKey.USER_ID) userId: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.changeAccountPassword(payload, userId);
  }

  @ApiOperation({ description: 'Find user by ID' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: UserResponseDTO })
  @Get('/:userId')
  async findUserById(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserResponseDTO> {
    return await this.userSrv.findUserById(userId);
  }

  @ApiOperation({
    description: 'Find user profile by jwt token',
  })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: UserResponseDTO })
  @ApiBearerAuth('JWT')
  @UseGuards(RolesGuard)
  @Get('/profile/find-user-by-token')
  async findUserProfile(
    @CurrentUser(DecodedTokenKey.USER_ID) userId: string,
  ): Promise<UserResponseDTO> {
    return await this.userSrv.findUserById(userId);
  }

  @ApiOperation({ description: 'Find all users' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: UsersResponseDTO })
  @Get()
  async findAllUsers(
    @Query() payload?: PaginationRequestType,
  ): Promise<UsersResponseDTO> {
    return await this.userSrv.findAllUsers(payload);
  }

  @ApiOperation({ description: 'Resend OTP after login' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @Get('/resend-otp-code/:userId')
  async resendOTPAfterLogin(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.resendOTPAfterLogin(userId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({ description: 'Verify user with unique-code after signup' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @UseGuards(RolesGuard)
  @Get('/verification/verify-signup-code/:uniqueVerificationCode')
  async verifyCodeAfterSignup(
    @CurrentUser(DecodedTokenKey.USER_ID) userId: string,
    @Param('uniqueVerificationCode') uniqueVerificationCode: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.verifyCodeAfterSignup(
      uniqueVerificationCode,
      userId,
    );
  }

  @ApiOperation({ description: 'Initiate forgot-password flow' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @Get('/verification/initiate-forgot-password-flow/:email')
  async initiateForgotPasswordFlow(
    @Param('email') email: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.initiateForgotPasswordFlow(email);
  }

  @ApiOperation({ description: 'Finalize forgot-password flow' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @Get('/verification/finalize-forgot-password-flow/:uniqueVerificationCode')
  async finalizeForgotPasswordFlow(
    @Param('uniqueVerificationCode') uniqueVerificationCode: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.finalizeForgotPasswordFlow(
      uniqueVerificationCode,
    );
  }

  @ApiOperation({ description: 'Change password' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @Post('/verification/change-password')
  async changePassword(
    @Body() payload: UpdatePasswordDTO,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.changePassword(payload);
  }

  @ApiOperation({ description: 'Update user details' })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({ type: BaseResponseTypeDTO })
  @Patch()
  async updateUser(
    @Body() payload: UpdateUserDTO,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.updateUser(payload);
  }

  @ApiOperation({
    description: 'Delete user account',
  })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({
    type: BaseResponseTypeDTO,
  })
  @Delete('/:userId')
  async deleteUser(
    @Param('userId') userId: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.deleteUser([userId]);
  }

  @ApiOperation({
    description: 'Delete user account by email',
  })
  @ApiProduces('json')
  @ApiConsumes('application/json')
  @ApiResponse({
    type: BaseResponseTypeDTO,
  })
  @Delete('/delete-by-email/:email')
  async deleteUserByEmail(
    @Param('email') email: string,
  ): Promise<BaseResponseTypeDTO> {
    return await this.userSrv.deleteUserByEmail(email);
  }
}
