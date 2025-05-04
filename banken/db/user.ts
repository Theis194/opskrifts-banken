import { Client } from "jsr:@db/postgres";
import { User, UserSchema } from "./user-db.ts";
import { Role } from "../acm/permission.ts";

type RawUser = {
    user_id: number;
    username: string;
    email: string;
    password_hash: string;
    created_at: Date; // Use Date instead of string
    last_login: Date | null; // Explicit about nullability
    role: Role;
};

export async function getUserByNameOrEmail(
    client: Client,
    identifier: string // Renamed from 'name' for clarity
): Promise<User | null> { // Return null if user not found
    const query = `
        SELECT 
            user_id,
            username,
            email,
            password_hash,
            created_at,
            last_login,
            role
        FROM users
        WHERE username = $1 OR email = $1
        LIMIT 1
    `;

    try {
        const result = await client.queryObject<RawUser>(query, [identifier]);

        if (result.rows.length === 0) {
            return null;
        }

        const rawUser = result.rows[0];

        // Handle potential null values
        const userData = {
            ...rawUser,
            last_login: rawUser.last_login ?? undefined, // Convert null to undefined
        };

        return UserSchema.parse(userData);
    } catch (error) {
        console.error("Error in getUserByNameOrEmail:", error);
        throw error; // Or consider returning null/undefined
    }
}
