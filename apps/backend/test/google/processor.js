module.exports = {
  extractIds: extractIds,
}

function extractIds(requestParams, response, context, ee, next) {
  try {
    // 1. 응답이 비어있는지 확인
    if (!response.body) {
      console.log('🚨 [Processor] Response body is empty.')
      return next()
    }

    // 2. 전체 JSON 문자열 파싱 (Interceptor Wrapper 포함)
    const fullResponse = JSON.parse(response.body)

    // 구조: { status, statusCode, data: { places: [...] }, timestamp }
    const responseData = fullResponse.data

    if (!responseData) {
      console.log('⚠️ [Processor] Response에 "data" 필드가 없습니다. 응답 구조를 확인하세요.')
      return next()
    }

    const places = responseData.places

    if (!places || places.length === 0) {
      console.log('⚠️ [Processor] 검색 결과(places)가 0건입니다.')
      return next()
    }

    const placeWithPhoto = places.find(p => p.photos && p.photos.length > 0)

    if (placeWithPhoto) {
      const photoResourceName = placeWithPhoto.photos[0].name
      // 형식: "places/{placeId}/photos/{photoId}"
      const parts = photoResourceName.split('/')

      if (parts.length >= 4) {
        // 가상 사용자 변수 저장
        context.vars.targetPlaceId = parts[1]
        context.vars.targetPhotoId = parts[3]
      } else {
        console.log(`❌ [Processor] Photo name 형식 오류: ${photoResourceName}`)
      }
    } else {
      console.log('⚠️ [Processor] 검색된 장소들에 사진 정보가 없습니다.')
    }
  } catch (err) {
    console.error('🔥 [Processor] 파싱 에러:', err)
    // 디버깅을 위해 에러 발생 시의 body 출력
    console.log('Body snippet:', response.body ? response.body.substring(0, 100) : 'empty')
  }

  return next()
}
