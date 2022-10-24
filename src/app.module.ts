import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { MulterModule } from '@nestjs/platform-express';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpExceptionFilter } from '@schematics/filters/http-exception.filter';
import { HideObjectPropertyInterceptor } from '@schematics/interceptors/hide-object-prop.interceptor';
import { JsonMaskInterceptor } from '@schematics/interceptors/json-mask.interceptor';
import { LoggingInterceptor } from '@schematics/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '@schematics/interceptors/timeout.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import ormConfig from './orm.config';

export function DatabaseOrmModule(): DynamicModule {
  // we could load the configuration from dotEnv here,
  // but typeORM cli would not be able to find the configuration file.
  return TypeOrmModule.forRoot(ormConfig);
}

@Module({
  imports: [
    DatabaseOrmModule(),
    MulterModule.register({
      dest: './uploads',
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 15,
    }),
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: JsonMaskInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HideObjectPropertyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
