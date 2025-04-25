import { z } from "zod";

export const LoginSchema = z.object({
    username: z.string().min(6),
    password: z.string().min(5),
})

export type Login = z.infer<typeof LoginSchema>;