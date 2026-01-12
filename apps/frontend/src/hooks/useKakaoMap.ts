import { useEffect, useState, useCallback } from "react";
import type { KakaoPlace, KakaoStatus } from "@/types/kakao";

export function useKakaoMap() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setIsLoaded(true);
      });
    } else {
      const interval = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            setIsLoaded(true);
            clearInterval(interval);
          });
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const searchPlaces = useCallback(
    (
      keyword: string,
      callback: (result: KakaoPlace[], status: KakaoStatus) => void,
    ) => {
      if (!isLoaded || !window.kakao) return;

      const places = new window.kakao.maps.services.Places();
      places.keywordSearch(keyword, callback);
    },
    [isLoaded],
  );

  return { isLoaded, searchPlaces };
}
