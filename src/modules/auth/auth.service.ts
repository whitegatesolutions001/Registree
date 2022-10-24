import {
  Injectable,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { decode, sign } from 'jsonwebtoken';
import 'dotenv/config';
import { UserService } from '../user/user.service';
import { AuthResponseDTO, LoginUserDTO } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);
  private tokenExpiresIn: number;

  constructor(private readonly userSrv: UserService) {}

  private async signPayload(payload: any): Promise<string> {
    this.tokenExpiresIn = 86400; // ? 24 hours(milliseconds)
    return sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  }

  async login(payload: LoginUserDTO): Promise<AuthResponseDTO> {
    try {
      const { data: user } = await this.userSrv.findUserByEmailAndPassword(
        payload.email.toLowerCase(),
        payload.password,
      );
      if (user?.id) {
        const { dateCreated, email, role, id } = user;
        const token = await this.signPayload({
          dateCreated,
          email,
          role,
          id,
        });
        const decodedToken: any = decode(token);
        const { exp, iat } = decodedToken;
        return {
          success: true,
          message: 'Login successful',
          code: HttpStatus.OK,
          data: {
            userId: id,
            role,
            email,
            dateCreated,
            token,
            tokenInitializationDate: iat,
            tokenExpiryDate: exp,
            user,
          },
        };
      }
      throw new BadRequestException('Incorrect login details');
    } catch (ex) {
      this.logger.log(ex);
      throw ex;
    }
  }

  async refreshToken(userId: string): Promise<AuthResponseDTO> {
    try {
      if (!userId) {
        throw new BadRequestException('Field userId is required');
      }
      const payload = await this.userSrv.findUserById(userId);
      const {
        data: { dateCreated, email, role, id },
      } = payload;
      const token = await this.signPayload({
        dateCreated,
        email,
        role,
        id,
      });
      const decodedToken: any = decode(token);
      const { exp, iat } = decodedToken;
      return {
        success: true,
        message: 'Token refreshed',
        code: HttpStatus.OK,
        data: {
          userId: id,
          role,
          email,
          dateCreated,
          token,
          tokenInitializationDate: iat,
          tokenExpiryDate: exp,
          user: payload.data,
        },
      };
    } catch (ex) {
      this.logger.error(ex);
      throw ex;
    }
  }

  private setTokenExpiresIn(expiresIn: number): void {
    this.tokenExpiresIn = expiresIn;
  }

  private getTokenExpiresIn(): number {
    return this.tokenExpiresIn;
  }
}
