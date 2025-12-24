import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export enum JenisKelamin {
  PRIA = 'L',
  WANITA = 'P',
}

export class CreatePegawaiDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @ApiProperty({ example: 'Lorem' })
  nama_depan: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @ApiProperty({ example: 'Ipsu,' })
  nama_belakang: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @ApiProperty({ example: 'pegawai@gmail.com' })
  email: string;

  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+?\d+$/, { message: 'Phone number must contain only digits and optional + sign' })
  @ApiProperty({ example: '+6281234567890' })
  no_hp: string;
  

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @ApiProperty({ example: 'Jl. Merdeka No. 10, Jakarta' })
  alamat: string;

  @IsEnum(JenisKelamin, { message: 'Gender must be L or P' })
  @ApiProperty({ enum: JenisKelamin, example: JenisKelamin.PRIA })
  jenis_kelamin: JenisKelamin;
}

export class UpdatePegawaiDto extends PartialType(
  OmitType(CreatePegawaiDto, ['email'] as const)
) {}