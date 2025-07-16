import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
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
): Promise<User | null> {
    // Return null if user not found
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

export type NewUser = {
    username: string;
    email: string;
    password: string;
    role: string;
};
export async function createUser(client: Client, newUser: NewUser) {
    const query = `
        INSERT INTO users (username, email, password_hash, role) VALUES 
        ($1, $2, $3, $4)
    `;
    try {
        const hashedPassword = await bcrypt.hash(newUser.password);
        const result = await client.queryObject(query, [
            newUser.username,
            newUser.email,
            hashedPassword,
            newUser.role,
        ]);

        return result;
    } catch (error) {
        console.error("Failed to create new user", error);
        throw error;
    }
}

export async function getUsernames(client: Client) {
    const query = `
        SELECT username FROM users
    `;

    try {
        const result = await client.queryObject<{ username: string }>(query);

        if (result.rows.length < 1) {
            return {
                success: false,
                usernames: [],
                message: "Failed to get usernames",
            };
        }

        return {
            success: false,
            usernames: result.rows,
            message: "Succeeded in getting usernames",
        };
    } catch (error) {
        console.error("Failed to get usernames", error);
        throw error;
    }
}


export async function getUserIdByName(client: Client, username: string) {
    const query = `
        SELECT user_id FROM users WHERE users.username = $1
    `;

    try {
        const result = await client.queryObject<{ user_id: number }>(query, [username]);

        if (result.rows.length < 1) {
            return {
                success: false,
                userid: NaN,
                message: "Failed to get userId",
            };
        }

        return {
            success: false,
            userid: result.rows[0].user_id,
            message: "Succeeded in getting userId",
        };
    } catch (error) {
        console.error("Failed to get userId", error);
        throw error;
    }
}