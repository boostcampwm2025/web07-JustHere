import { IsNumber, IsString } from 'class-validator';

export class RouteRequestDto {
    @IsString() // 혹은 @IsNumber() - 프론트에서 보내는 타입에 맞춤
    startX: string;

    @IsString()
    startY: string;

    @IsString()
    endX: string;

    @IsString()
    endY: string;
}