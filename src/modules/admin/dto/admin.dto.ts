import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsDate, IsEmail, IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum JenisKelamin {
  PRIA = 'L',
  WANITA = 'P',
}

export class CreateAdminDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @ApiProperty({ example: 'admin@gmail.com' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(50, { message: 'Password cannot exceed 50 characters' })
  @ApiProperty({ example: 'strongpassword123' })
  password: string;

  @IsString()
  @ApiProperty({ example: 'Lorem' })
  nama_depan: string;

  @IsString()
  @ApiProperty({ example: 'Ipsum' })
  nama_belakang: string;

  @IsDate({ message: 'Date of birth must be a valid date' })
  @Type(() => Date)
  @ApiProperty({ example: '2000-01-01' })
  tanggal_lahir: Date;

  @IsEnum(JenisKelamin, { message: 'Gender must be L or P' })
  @ApiProperty({ enum: JenisKelamin, example: JenisKelamin.PRIA })
  jenis_kelamin: JenisKelamin;
}

export class UpdateAdminDto extends PartialType(
  OmitType(CreateAdminDto, ['email'] as const)
) {}