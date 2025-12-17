import { useMutation } from "@tanstack/react-query";
import {
  calculateMidpoints,
  type CalculateMidpointsResponse,
} from "@/api/midpoints";

export function useCalculateMidpoints() {
  return useMutation<CalculateMidpointsResponse, Error, number>({
    mutationFn: (roomId: number) => calculateMidpoints(roomId),
  });
}
