import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserSessionStore } from './user-session.store';

@Module({
  providers: [UserService, UserSessionStore],
  exports: [UserService],
})
export class UserModule {}
