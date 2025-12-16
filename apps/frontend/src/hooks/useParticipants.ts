import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createParticipant,
  getParticipants,
  type CreateParticipantRequest,
} from "@/api/participants";

export const useParticipants = (roomId: number) => {
  return useQuery({
    queryKey: ["participants", roomId],
    queryFn: () => getParticipants(roomId),
    enabled: !!roomId,
  });
};

export const useCreateParticipant = (roomId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateParticipantRequest) =>
      createParticipant(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["participants", roomId] });
    },
  });
};
