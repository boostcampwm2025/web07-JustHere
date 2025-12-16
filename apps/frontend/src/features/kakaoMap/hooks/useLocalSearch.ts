import fetchData from "@/utils/fetchData";
import type { KakaoLocalSearchItem, KakaoLocalSearchResponse } from "@web07/types";
import { useState } from "react";

export const useLocalSearch = (
  markersRef: React.RefObject<kakao.maps.Marker[]>, 
  infoWindowRef: React.RefObject<kakao.maps.InfoWindow | null>,
  mapRef: React.RefObject<kakao.maps.Map | null>,
) => {
  const [isSearching, setIsSearching] = useState(false);
  const [keyword, setKeyword] = useState('');
  
  const clearMarkers = () => {
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  const displayMarkers = (items: KakaoLocalSearchItem[]) => {
    const { kakao } = window;

    if (!mapRef.current) return;

    clearMarkers();

    if (items.length === 0) {
      alert('검색 결과가 없습니다.');
      return;
    }

    const bounds = new kakao.maps.LatLngBounds();

    items.forEach((item) => {
      const position = new kakao.maps.LatLng(parseFloat(item.y), parseFloat(item.x));

      const marker = new kakao.maps.Marker({
        position,
        map: mapRef.current!,
      });

      const infoContent = `
        <div style="padding: 10px; min-width: 200px; max-width: 320px;">
          <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">
            ${item.place_name}
          </h4>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${item.category_name}
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            ${item.road_address_name || item.address_name}
          </p>
          ${item.phone ? `<p style="margin: 4px 0; font-size: 12px;">📞 ${item.phone}</p>` : ''}
          ${item.distance ? `<p style="margin: 4px 0; font-size: 12px; color: #999;">📍 ${item.distance}m</p>` : ''}
          <a href="${item.place_url}" target="_blank" style="
            display: inline-block;
            margin-top: 8px;
            font-size: 12px;
            color: #3396ff;
            text-decoration: none;
          ">카카오맵에서 보기 →</a>
        </div>
      `;

      const infoWindow = new kakao.maps.InfoWindow({
        content: infoContent,
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        infoWindow.open(mapRef.current!, marker);
        infoWindowRef.current = infoWindow;
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    mapRef.current.setBounds(bounds);
  };

  const searchKakaoLocal = async () => {
    if (!keyword.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    setIsSearching(true);

    try {
      const x = 127.123430800216;
      const y = 37.3850142562829;

      const data = await fetchData<KakaoLocalSearchResponse>(
        'http://localhost:3000/api/kakao/local-search',
        {
          query: keyword,
          x,
          y,
          radius: 5000,
        },
      );

      displayMarkers(data.documents);
    } catch (error) {
      console.error('카카오 검색 중 오류 발생:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchKakaoLocal,
    isSearching,
    keyword,
    setKeyword,
  }

}
