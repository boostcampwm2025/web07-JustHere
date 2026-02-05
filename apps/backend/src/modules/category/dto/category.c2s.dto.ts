import { IsNotEmpty, IsString, Length } from 'class-validator'

// [C->S] category:create
export class CreateCategoryPayload {
  @IsString({ message: 'name은 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'name은 비어있을 수 없습니다' })
  @Length(1, 15, { message: 'name은 1자 이상 15자 이하여야 합니다' })
  name: string
}

// [C->S] category:delete
export class DeleteCategoryPayload {
  @IsString({ message: 'categoryId는 문자열이어야 합니다' })
  @IsNotEmpty({ message: 'categoryId는 비어있을 수 없습니다' })
  categoryId: string
}
