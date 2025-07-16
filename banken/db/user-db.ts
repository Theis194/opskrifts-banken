import { z } from "zod";
import { Role } from "../acm/permission.ts";

export const UserSchema = z.object({
    user_id: z.number().positive(),
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password_hash: z.string().min(8),
    created_at: z.coerce.date(), // Better to handle as Date object
    last_login: z.coerce.date().optional(), // Mark as optional if it can be null
    role: z.string().refine((val): val is Role =>
        ["admin", "editor", "user", "guest"].includes(val)
    ),
});

export type User = z.infer<typeof UserSchema>;

export type SafeUser = { username: string, email: string, role: Role, id: number };
