import { auth } from "@/features/auth/server/neon-auth";

export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
