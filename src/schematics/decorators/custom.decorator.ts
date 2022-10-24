import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { DecodedTokenKey } from '@utils/types/utils.constant';

export const CurrentUser = createParamDecorator(
  (data: DecodedTokenKey, ctx: ExecutionContext) => {
    const requestData = ctx.switchToHttp().getRequest();
    const { userData } = requestData;
    return data ? userData[data] : userData;
  },
);

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
