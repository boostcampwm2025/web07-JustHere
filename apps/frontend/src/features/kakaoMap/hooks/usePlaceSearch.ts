import { useState, useCallback } from 'react';
import fetchData from '@/utils/fetchData';
import type { KakaoLocalSearchResponse, KakaoLocalSearchItem } from '@web07/types';

interface SearchOptions {
  x: number;
  y: number;
  radius?: number;
  page?: number;
  size?: number; // size 옵션 추가
  sort?: 'distance' | 'accuracy';
}

export const usePlaceSearch = () => {
  const [places, setPlaces] = useState<KakaoLocalSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<KakaoLocalSearchResponse['meta'] | null>(null);

  const searchKeyword = useCallback(async (query: string, options: SearchOptions) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        query,
        x: options.x,
        y: options.y,
      };
      if (options.radius) params.radius = options.radius;
      if (options.page) params.page = options.page;
      if (options.size) params.size = options.size; // size 파라미터 전달

      const response = await fetchData<KakaoLocalSearchResponse>(
        'http://localhost:3000/api/kakao/local-search',
        params
      );

      setPlaces(response.documents);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.');
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchCategory = useCallback(async (categoryCode: string, options: SearchOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        category_group_code: categoryCode,
        x: options.x,
        y: options.y,
      };
      if (options.radius) params.radius = options.radius;
      if (options.page) params.page = options.page;
      if (options.size) params.size = options.size; // size 파라미터 전달
      if (options.sort) params.sort = options.sort;

      const response = await fetchData<KakaoLocalSearchResponse>(
        'http://localhost:3000/api/kakao/category-search',
        params
      );

      setPlaces(response.documents);
      setMeta(response.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : '카테고리 검색 중 오류가 발생했습니다.');
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchMixedCategories = useCallback(
    async (categoryCodes: string[], options: SearchOptions) => {
      setIsLoading(true);
      setError(null);

      try {
        const promises = categoryCodes.map((code) => {
          const params: Record<string, string | number> = {
            category_group_code: code,
            x: options.x,
            y: options.y,
          };
          if (options.radius) params.radius = options.radius;
          if (options.size) params.size = options.size || 5; // 기본 5개
          if (options.sort) params.sort = options.sort;

          return fetchData<KakaoLocalSearchResponse>(
            'http://localhost:3000/api/kakao/category-search',
            params
          );
        });

        const responses = await Promise.all(promises);
        const allPlaces = responses.flatMap((response) => response.documents);

        setPlaces(allPlaces);
        setMeta(null); // 통합 검색은 메타 정보 제공 안 함
      } catch (err) {
        setError(err instanceof Error ? err.message : '통합 검색 중 오류가 발생했습니다.');
        setPlaces([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    places,
    meta,
    isLoading,
    error,
    searchKeyword,
    searchCategory,
    searchMixedCategories,
  };
};
