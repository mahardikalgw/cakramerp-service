import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './modules/user';
import { AuthModule } from './modules/auth';
import { IAMModule } from './modules/iam';

@Module({
  imports: [DatabaseModule, UserModule, AuthModule, IAMModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
