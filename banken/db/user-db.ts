import { z } from "zod";
import { Role } from "../acm/permission.ts";

export const UserSchema = z.object({
    user_id: z.number(),
    username: z.string(),
    email: z.string(),
    password_hash: z.string(),
    created_at: z.string().datetime(),
    last_login: z.string().datetime(),
    role: z.string(),
})

export type User = z.infer<typeof UserSchema>;

export type SafeUser = {username: string, email: string, role: Role};