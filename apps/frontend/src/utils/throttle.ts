/**
 * 함수 실행을 지정된 시간 간격으로 제한하는 쓰로틀 유틸리티
 * @param func 쓰로틀링할 함수
 * @param delay 최소 실행 간격 (ms)
 * @returns 쓰로틀링된 함수
 */
export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let lastCall = 0
  let timeoutId: NodeJS.Timeout | null = null

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    // 마지막 호출 후 delay 이상 경과했으면 즉시 실행
    if (timeSinceLastCall >= delay) {
      lastCall = now
      func(...args)
    } else {
      // 그렇지 않으면 pending 중인 호출을 취소하고 새로 예약
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        func(...args)
      }, delay - timeSinceLastCall)
    }
  }) as T
}
