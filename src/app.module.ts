import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ListModules } from './modules';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthGuard } from './middleware/auth.guard';
import { PegawaiModule } from './modules/pegawai/pegawai.module';
import { CutiModule } from './modules/cuti/cuti.module';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true}),
    DatabaseModule,
    ...ListModules,
    PegawaiModule,
    CutiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    }
  ],
})
export class AppModule {}
