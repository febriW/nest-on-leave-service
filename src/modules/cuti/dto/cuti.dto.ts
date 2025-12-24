import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsInt, IsEmail } from 'class-validator';

export class CreateCutiDto {

  @IsString()
  @IsNotEmpty({ message: 'Reason for leave is required' })
  @ApiProperty({ example: 'Family event' })
  alasan: string;

  @IsDateString({}, { message: 'Start date must be a valid date string' })
  @IsNotEmpty({ message: 'Start date is required' })
  @ApiProperty({ example: '2025-01-01' })
  tanggal_mulai: string;

  @IsDateString({}, { message: 'End date must be a valid date string' })
  @IsNotEmpty({ message: 'End date is required' })
  @ApiProperty({ example: '2025-01-05' })
  tanggal_selesai: string;

  @IsEmail({}, { message: 'Pegawai email must be a valid email' })
  @IsNotEmpty({ message: 'Pegawai email is required' })
  @ApiProperty({ example: 'pegawai@example.com' })
  pegawaiEmail: string;
}

export class UpdateCutiDto extends PartialType(CreateCutiDto) {}