import { User } from '@entities/user.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { AuthService } from '@modules/auth/auth.service';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService, AuthService],
  exports: [UserService],
})
export class UserModule {}
