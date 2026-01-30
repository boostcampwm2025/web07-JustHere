import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { SearchTextDto } from './search-text.dto'

describe('SearchTextDto', () => {
  it('유효한 데이터로 검증에 성공해야 한다', async () => {
    const dto = plainToInstance(SearchTextDto, {
      textQuery: '맛집',
      roomId: 'room-1',
      radius: 1000,
      maxResultCount: 10,
      pageToken: 'token',
    })
    const errors = await validate(dto)
    expect(errors.length).toBe(0)
  })

  it('필수 필드(textQuery)가 없으면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(SearchTextDto, {})
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('textQuery')
  })

  it('textQuery가 빈 문자열이면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(SearchTextDto, { textQuery: '' })
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('textQuery')
  })

  it('선택적 필드는 없어도 검증에 성공해야 한다', async () => {
    const dto = plainToInstance(SearchTextDto, { textQuery: '맛집' })
    const errors = await validate(dto)
    expect(errors.length).toBe(0)
  })

  it('숫자 필드(radius, maxResultCount)에 문자열이 들어오면 변환 후 검증해야 한다', async () => {
    // plainToInstance가 @Type(() => Number)를 처리함
    const dto = plainToInstance(SearchTextDto, {
      textQuery: '맛집',
      radius: '1000',
      maxResultCount: '20',
    })
    const errors = await validate(dto)
    expect(errors.length).toBe(0)
    expect(dto.radius).toBe(1000)
    expect(dto.maxResultCount).toBe(20)
  })

  it('숫자 필드에 숫자가 아닌 값이 들어오면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(SearchTextDto, {
      textQuery: '맛집',
      radius: 'invalid',
    })
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('radius')
  })
})
