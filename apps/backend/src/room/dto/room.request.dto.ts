import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  profile_image: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const RoomJoinSchema = z.object({
  roomId: z.string().min(1),
  user: UserSchema,
});
export type RoomJoinPayload = z.infer<typeof RoomJoinSchema>;

export const RoomLeaveSchema = z.object({
  roomId: z.string().min(1),
});
export type RoomLeavePayload = z.infer<typeof RoomLeaveSchema>;
