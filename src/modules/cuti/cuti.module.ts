import { Module } from '@nestjs/common';
import { CutiService } from './cuti.service';
import { CutiController } from './cuti.controller';
import { Cuti } from './cuti.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pegawai } from '../pegawai/pegawai.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cuti, Pegawai])],
  controllers: [CutiController],
  providers: [CutiService],
  exports: [CutiService]
})
export class CutiModule {}
