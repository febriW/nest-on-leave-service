import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class SignInDto {
    @IsEmail({}, { message: 'Invalid email format' })
    @ApiProperty({ example: 'admin@gmail.com' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @ApiProperty({ example: 'strongpassword123' })
    password: string;
}