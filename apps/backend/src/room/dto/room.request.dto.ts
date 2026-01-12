import { z } from 'zod';

export const roomJoinSchema = z.object({
  roomId: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    profile_image: z.string().optional(),
  }),
});
export type RoomJoinPayload = z.infer<typeof roomJoinSchema>;

export const roomLeaveSchema = z.object({
  roomId: z.string().min(1),
});
export type RoomLeavePayload = z.infer<typeof roomLeaveSchema>;
