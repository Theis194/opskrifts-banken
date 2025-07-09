import jwt from "jsonwebtoken";
import { SafeUser } from "../db/user-db.ts";

const SECRET_KEY = "your-secret-key";
const REFRESH_SECRET_KEY = "your-refresh-secret-key";

export function generateToken(user: SafeUser): string {
  return jwt.sign({ email: user.email, username: user.username, role: user.role, id: user.id }, SECRET_KEY, {
    expiresIn: "1h",
  });
}

export function generateRefreshToken(user: SafeUser): string {
  return jwt.sign(
    { email: user.email, username: user.username, role: user.role, id: user.id },
    REFRESH_SECRET_KEY,
    { expiresIn: "7d" } // Refresh token expires in 7 days
  );
}

export function verifyToken(token: string): SafeUser {
  return jwt.verify(token, SECRET_KEY) as SafeUser;
}

export function verifyRefreshToken(token: string): SafeUser {
  return jwt.verify(token, REFRESH_SECRET_KEY) as SafeUser;
}

export function genereateGuestToken(): string {
  const payload = {
    id: `guest_${Math.random().toString(36).substring(7)}`,
    role: `guest`,
  };
  return jwt.sign(payload, SECRET_KEY, {expiresIn: '1h'});
}