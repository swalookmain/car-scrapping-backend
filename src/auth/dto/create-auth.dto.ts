import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Min, MinLength } from "class-validator";

export class CreateAuthDto {

    @ApiProperty()
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MinLength(6)
    password: string;
}
