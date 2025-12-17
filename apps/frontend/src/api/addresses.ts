import { apiClient } from "./client";

export interface AddressSearchResult {
  address_name: string;
  road_address_name?: string;
  lat: number;
  lng: number;
}

export interface AddressSearchResponse {
  documents: AddressSearchResult[];
}

export async function searchAddresses(
  query: string
): Promise<AddressSearchResult[]> {
  const response = await apiClient.get<AddressSearchResponse>(
    "/kakao/addresses",
    {
      params: { query },
    }
  );
  return response.data.documents;
}
