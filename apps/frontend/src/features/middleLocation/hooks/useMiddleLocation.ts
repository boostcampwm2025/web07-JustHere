import { useState } from "react";
import type { UserLocation } from "@web07/types";
import type { MiddleLocationResult, UserLocationInput } from "@web07/types";

export const useMiddleLocation = () => {
  const [results, setResults] = useState<MiddleLocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findMiddleLocations = async (users: UserLocation[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert UserLocation to UserLocationInput (백엔드가 기대하는 형식)
      const userInputs: UserLocationInput[] = users.map((user) => ({
        name: user.name,
        x: user.x,
        y: user.y,
        transportationType: user.transportationType,
      }));

      // POST 요청으로 중간 위치 찾기
      const response = await fetch(
        "http://localhost:3000/api/odsay/find-middle-location",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ users: userInputs }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MiddleLocationResult[] = await response.json();
      setResults(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "중간 위치를 찾는 중 오류가 발생했습니다.";
      setError(errorMessage);
      console.error("중간 위치 찾기 오류:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    results,
    isLoading,
    error,
    findMiddleLocations,
  };
};
