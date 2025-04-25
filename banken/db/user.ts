import { DB } from "https://deno.land/x/sqlite@v3.9.0/mod.ts";
import { User, UserSchema } from "./user-db.ts";

type RawUser = {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login: string;
  role: string;
};
export async function getUserByNameOrEmail(
  db: DB,
  name: string,
): Promise<User> {
  const query = `SELECT * FROM users AS u
         WHERE u.username = :name OR u.email = :name
         `;
  const stmt = db.prepareQuery(query);
  try {
    const result = stmt.all({ name });

    const rawUser: RawUser = {
      user_id: result[0][0] as number,
      username: result[0][1] as string,
      email: result[0][2] as string,
      password_hash: result[0][3] as string,
      created_at: result[0][4] as string + "Z",
      last_login: result[0][5] as string + "Z",
      role: result[0][6] as string,
    };

    return UserSchema.parse(rawUser) as User;
  } catch (error) {
    console.error("Error in getUserByNameOrEmail:", error);
    throw error;
  } finally {
    stmt.finalize();
  }
}
