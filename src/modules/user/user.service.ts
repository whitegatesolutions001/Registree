import {
  Injectable,
  forwardRef,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  calculatePaginationControls,
  checkForRequiredFields,
  compareEnumValueFields,
  generateUniqueCode,
  hashPassword,
  sendEmail,
  validateEmailField,
  verifyPasswordHash,
} from '@utils/functions/utils.function';
import { User } from '@entities/user.entity';
import { GenericService } from '@schematics/services/generic.service';
import { AppRole } from '@utils/types/utils.constant';
import {
  BaseResponseTypeDTO,
  PaginationRequestType,
} from '@utils/types/utils.types';
import {
  ChangePasswordDTO,
  UpdatePasswordDTO,
  UpdateUserDTO,
  UserResponseDTO,
  UsersResponseDTO,
  CreateUserDTO,
} from './dto/user.dto';
import { AuthResponseDTO } from '@modules/auth/dto/auth.dto';
import { FindManyOptions, In } from 'typeorm';
import { AuthService } from '@modules/auth/auth.service';

@Injectable()
export class UserService extends GenericService(User) {
  constructor(
    @Inject(forwardRef(() => AuthService))
    private readonly authSrv: AuthService,
  ) {
    super();
  }

  async createUser(payload: CreateUserDTO): Promise<AuthResponseDTO> {
    try {
      checkForRequiredFields(
        [
          'email',
          'password',
          'password',
          'firstName',
          'lastName',
          'email',
          'phoneNumber',
          'role',
        ],
        payload,
      );
      validateEmailField(payload.email);
      compareEnumValueFields(payload.role, Object.values(AppRole), 'role');

      const emailLowercase = payload.email.toLowerCase();
      const findMatch = await this.getRepo().findOne({
        where: [
          { email: emailLowercase },
          { phoneNumber: payload.phoneNumber },
        ],
        select: ['id', 'phoneNumber', 'email'],
      });
      if (findMatch?.id) {
        let message = 'User already exists';
        if (findMatch.email === emailLowercase) {
          message = 'User with email already exists';
        }
        if (findMatch.phoneNumber === payload.phoneNumber) {
          message = 'User with phone number already exists';
        }
        throw new ConflictException(message);
      }
      const record = await this.create<Partial<User>>({
        ...payload,
        email: emailLowercase,
        password: payload.password,
        uniqueVerificationCode: generateUniqueCode(),
      });
      const loginResult = await this.authSrv.login({
        email: record.email,
        password: payload.password,
      });
      return {
        ...loginResult,
        message: 'Account created',
      };
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  async verifyCodeAfterSignup(
    uniqueVerificationCode: string,
    userId: string,
  ): Promise<BaseResponseTypeDTO> {
    try {
      const codeExists = await this.getRepo().findOne({
        where: { uniqueVerificationCode },
        select: ['id'],
      });
      if (codeExists?.id) {
        if (codeExists.id !== userId) {
          throw new ForbiddenException('This code does not belong to you');
        }
        // Activate the user account
        await this.getRepo().update({ id: codeExists.id }, { status: true });
        return {
          success: true,
          code: HttpStatus.OK,
          message: 'Code verified',
        };
      }
      throw new NotFoundException('Code was not found');
    } catch (ex) {
      throw ex;
    }
  }

  async resendOTPAfterLogin(userId: string): Promise<BaseResponseTypeDTO> {
    try {
      if (!userId) {
        throw new BadRequestException('Field userId is required');
      }
      const record = await this.findOne({ id: userId });
      if (!record?.id) {
        throw new NotFoundException();
      }
      let token = record.uniqueVerificationCode;
      if (!token) {
        token = generateUniqueCode();
        await this.getRepo().update(
          { id: record.id },
          { uniqueVerificationCode: token },
        );
      }
      const htmlEmailTemplate = `
          <h2>Please copy the code below to verify your account</h2>
          <h3>${token}</h3>
        `;
      await sendEmail(htmlEmailTemplate, 'Verify Account', [record.email]);
      return {
        success: true,
        code: HttpStatus.OK,
        message: 'Token has been resent',
      };
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  async initiateForgotPasswordFlow(
    email: string,
  ): Promise<BaseResponseTypeDTO> {
    try {
      const userExists = await this.findOne({ email: email.toLowerCase() });
      if (userExists?.id) {
        const uniqueCode = generateUniqueCode();
        await this.getRepo().update(
          { id: userExists.id },
          { uniqueVerificationCode: uniqueCode },
        );

        // Send email
        const htmlEmailTemplate = `
            <h2>Please copy the code below to verify your account ownership</h2>
            <h3>${uniqueCode}</h3>
          `;
        const emailResponse = await sendEmail(
          htmlEmailTemplate,
          'Verify Account Ownership',
          [email],
        );
        if (emailResponse.success) {
          return {
            ...emailResponse,
            message: 'Confirmation email sent',
          };
        }
        throw new InternalServerErrorException('Email was not sent');
      }
      throw new NotFoundException('User was not found');
    } catch (ex) {
      throw ex;
    }
  }

  async finalizeForgotPasswordFlow(
    uniqueVerificationCode: string,
  ): Promise<BaseResponseTypeDTO> {
    try {
      const userExists = await this.findOne({
        uniqueVerificationCode,
      });
      if (userExists?.id) {
        return {
          success: true,
          code: HttpStatus.OK,
          message: 'Unique token is valid',
        };
      }
      throw new NotFoundException('Invalid verification code');
    } catch (ex) {
      throw ex;
    }
  }

  async changePassword({
    uniqueVerificationCode,
    newPassword,
  }: UpdatePasswordDTO): Promise<BaseResponseTypeDTO> {
    try {
      const userExists = await this.findOne({
        uniqueVerificationCode,
      });
      if (userExists?.id) {
        const doesOldAndNewPasswordMatch = await verifyPasswordHash(
          newPassword,
          userExists.password,
        );
        if (doesOldAndNewPasswordMatch) {
          const message = 'Both old and new password match';
          throw new ConflictException(message);
        }
        const hashedPassword = await hashPassword(newPassword);
        await this.getRepo().update(
          { id: userExists.id },
          {
            uniqueVerificationCode: null,
            password: hashedPassword,
          },
        );
        return {
          success: true,
          code: HttpStatus.OK,
          message: 'Password changed successfully',
        };
      }
      throw new NotFoundException('Invalid verification code');
    } catch (ex) {
      throw ex;
    }
  }

  async findUserById(userId: string): Promise<UserResponseDTO> {
    try {
      const data = await this.findOne({ id: userId });
      if (data?.id) {
        return {
          success: true,
          code: HttpStatus.OK,
          data,
          message: 'User found',
        };
      }
      throw new NotFoundException('User not found');
    } catch (ex) {
      throw ex;
    }
  }

  async findAllUsers(
    payload?: PaginationRequestType,
  ): Promise<UsersResponseDTO> {
    try {
      if (payload?.pageNumber) {
        payload = {
          pageSize: parseInt(`${payload.pageSize}`),
          pageNumber: parseInt(`${payload.pageNumber}`),
        };

        const options: FindManyOptions = {
          take: payload.pageSize,
          skip: (payload.pageNumber - 1) * payload.pageSize,
        };
        const { response, paginationControl } =
          await calculatePaginationControls<User>(
            this.getRepo(),
            options,
            payload,
          );
        return {
          success: true,
          message: 'Users found',
          code: HttpStatus.OK,
          data: response,
          paginationControl: paginationControl,
        };
      } else {
        const data = await this.findAll();
        return {
          code: HttpStatus.FOUND,
          data,
          message: 'Users found',
          success: true,
        };
      }
    } catch (ex) {
      throw ex;
    }
  }

  async findUserByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserResponseDTO> {
    try {
      const user = await this.findOne({ email });
      if (user?.id && (await verifyPasswordHash(password, user.password))) {
        return {
          success: true,
          code: HttpStatus.OK,
          data: user,
          message: 'User found',
        };
      }
      throw new NotFoundException('Invalid credentials');
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  async updateUser(payload: UpdateUserDTO): Promise<BaseResponseTypeDTO> {
    try {
      checkForRequiredFields(['userId'], payload);
      const record = await this.findOne({ id: payload.userId });
      if (!record?.id) {
        throw new NotFoundException();
      }
      if (payload.email) {
        const emailLowercase = payload.email.toLowerCase();
        if (emailLowercase !== record.email) {
          record.email = emailLowercase;
        }
      }
      if (
        payload.profileImageUrl &&
        record.profileImageUrl !== payload.profileImageUrl
      ) {
        record.profileImageUrl = payload.profileImageUrl;
      }
      if (payload.phoneNumber && record.phoneNumber !== payload.phoneNumber) {
        record.phoneNumber = payload.phoneNumber;
      }
      if ('status' in payload) {
        record.status = payload.status;
      }
      if (payload.password) {
        const encryptedPassword = await hashPassword(payload.password);
        record.password = encryptedPassword;
      }
      if (payload.firstName) {
        const firstToLowercase = payload.firstName.toLowerCase();
        if (firstToLowercase !== record.firstName) {
          record.firstName = firstToLowercase;
        }
      }
      if (payload.lastName) {
        const lastToLowercase = payload.lastName.toLowerCase();
        if (lastToLowercase !== record.firstName) {
          record.firstName = lastToLowercase;
        }
      }
      if (payload.email && record.email !== payload.email) {
        validateEmailField(payload.email);
        record.email = payload.email;
      }
      if (payload.phoneNumber && record.phoneNumber !== payload.phoneNumber) {
        record.phoneNumber = payload.phoneNumber;
      }
      if (payload.role && record.role !== payload.role) {
        compareEnumValueFields(payload.role, Object.values(AppRole), 'role');
        record.role = payload.role;
      }
      const updatedRecord: Partial<User> = {
        email: record.email,
        phoneNumber: record.phoneNumber,
        firstName: record.firstName,
        lastName: record.lastName,
        password: record.password,
        status: record.status,
        profileImageUrl: record.profileImageUrl,
      };
      await this.getRepo().update({ id: record.id }, updatedRecord);
      return {
        success: true,
        code: HttpStatus.OK,
        message: 'Updated',
      };
    } catch (ex) {
      throw ex;
    }
  }

  async deleteUser(userIds: string[]): Promise<BaseResponseTypeDTO> {
    try {
      await this.delete({ id: In(userIds) });
      return {
        code: HttpStatus.OK,
        message: 'User deleted',
        success: true,
      };
    } catch (ex) {
      throw ex;
    }
  }

  async changeAccountPassword(
    payload: ChangePasswordDTO,
    userId: string,
  ): Promise<BaseResponseTypeDTO> {
    try {
      checkForRequiredFields(['currentPassword', 'newPassword'], payload);
      const record = await this.findOne({ id: userId });
      if (!record?.id) {
        throw new NotFoundException();
      }
      const verifyCurrentPassword = await verifyPasswordHash(
        payload.currentPassword,
        record.password,
      );
      if (!verifyCurrentPassword) {
        throw new BadRequestException('Could not verify current password');
      }
      const newPasswordHash = await hashPassword(payload.newPassword);
      await this.getRepo().update(
        { id: record.id },
        { password: newPasswordHash },
      );
      return {
        success: true,
        code: HttpStatus.OK,
        message: 'Password changed',
      };
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  async deleteUserByEmail(email: string): Promise<BaseResponseTypeDTO> {
    try {
      const userExists = await this.findOne({ email });
      if (userExists?.id) {
        await this.delete({ email });
        return {
          code: HttpStatus.OK,
          message: 'User deleted',
          success: true,
        };
      }
      throw new NotFoundException('User was not found');
    } catch (ex) {
      throw ex;
    }
  }
}
