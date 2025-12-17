import { useState, useEffect, useRef } from "react";
import fetchData from "@/utils/fetchData";
import type {
  KakaoAddressSearchResponse,
  KakaoAddressDocument,
} from "@web07/types";

export const useGeocode = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<KakaoAddressDocument[]>([]);
  const [selectedAddress, setSelectedAddress] =
    useState<KakaoAddressDocument | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
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
        const data = await fetchData<KakaoAddressSearchResponse>(
          "http://localhost:3000/api/kakao/search-address",
          { query }
        );

        if (data.documents && data.documents.length > 0) {
          setSuggestions(data.documents);
          setShowDropdown(true);
        } else {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error("주소 검색 오류:", error);
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

  const selectAddress = (address: KakaoAddressDocument) => {
    isSelectingRef.current = true; // 선택 중임을 표시
    setSelectedAddress(address);
    // 도로명 주소 우선, 없으면 지번 주소 사용
    const displayAddress =
      address.road_address?.address_name ||
      address.address?.address_name ||
      address.address_name;
    setQuery(displayAddress);
    setShowDropdown(false);
  };

  const clearQuery = () => {
    setQuery("");
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
