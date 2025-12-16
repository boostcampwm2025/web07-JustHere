import { useState, useEffect, useRef } from 'react';
import fetchData from '@/utils/fetchData';
import type { NaverGeocodingResponse, NaverAddress } from '@web07/types';

export const useGeocode = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NaverAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<NaverAddress | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingRef = useRef(false); // 주소 선택 중인지 추적

  // 디바운스를 적용한 주소 검색
  useEffect(() => {
    // 주소 선택 중이면 API 호출 안 함
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedAddress(null);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await fetchData<NaverGeocodingResponse>(
          'http://localhost:3000/api/naver/geocode',
          { query }
        );

        if (data.status === 'OK' && data.addresses.length > 0) {
          setSuggestions(data.addresses);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error('주소 검색 오류:', error);
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms 디바운스

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  const selectAddress = (address: NaverAddress) => {
    isSelectingRef.current = true; // 선택 중임을 표시
    setSelectedAddress(address);
    setQuery(address.roadAddress);
    setShowDropdown(false);
  };

  const clearQuery = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedAddress(null);
  };

  return {
    query,
    setQuery,
    suggestions,
    selectedAddress,
    isSearching,
    showDropdown,
    setShowDropdown,
    selectAddress,
    clearQuery,
  };
};
