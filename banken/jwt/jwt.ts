import jwt from "jsonwebtoken";
import { User, Role } from "../acm/permission.ts";

const SECRET_KEY = "your-secret-key";
const REFRESH_SECRET_KEY = "your-refresh-secret-key";

export function generateToken(user: { email: string; username: string; role: Role }): string {
  return jwt.sign({ email: user.email, username: user.username, role: user.role }, SECRET_KEY, {
    expiresIn: "1h",
  });
}

export function generateRefreshToken(user: { email: string; username: string; role: Role }): string {
  return jwt.sign(
    { email: user.email, username: user.username, role: user.role },
    REFRESH_SECRET_KEY,
    { expiresIn: "7d" } // Refresh token expires in 7 days
  );
}

export function verifyToken(token: string): { email: string; username: string; role: Role } {
  return jwt.verify(token, SECRET_KEY) as { email: string; username: string; role: Role };
}

export function verifyRefreshToken(token: string): { email: string; username: string; role: Role } {
  return jwt.verify(token, REFRESH_SECRET_KEY) as { email: string; username: string; role: Role };
}

export function genereateGuestToken(): string {
  const payload = {
    id: `guest_${Math.random().toString(36).substring(7)}`,
    role: `guest`,
  };
  return jwt.sign(payload, SECRET_KEY, {expiresIn: '1h'});
}