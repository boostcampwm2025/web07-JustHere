import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { PlaceDetailsDto } from './place-details.dto'

describe('PlaceDetailsDto', () => {
  it('유효한 데이터로 검증에 성공해야 한다', async () => {
    const dto = plainToInstance(PlaceDetailsDto, { placeId: 'some-place-id' })
    const errors = await validate(dto)
    expect(errors.length).toBe(0)
  })

  it('placeId가 없으면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PlaceDetailsDto, {})
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('placeId')
  })

  it('placeId가 빈 문자열이면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PlaceDetailsDto, { placeId: '' })
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('placeId')
  })

  it('placeId가 문자열이 아니면 검증에 실패해야 한다', async () => {
    const dto = plainToInstance(PlaceDetailsDto, { placeId: 123 })
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].property).toBe('placeId')
  })
})
