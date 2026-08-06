import { IsString, IsOptional } from 'class-validator';

export class AskDto {
  @IsString()
  question: string;

  @IsString()
  @IsOptional()
  session_id?: string;
}
