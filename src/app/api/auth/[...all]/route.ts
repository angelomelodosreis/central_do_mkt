import { getAuth } from "@/lib/auth/auth";

/**
 * Endpoint do better-auth (login, callback do Google, logout, sessão).
 *
 * A instância é criada dentro do handler porque o binding do D1 só existe no
 * escopo do request.
 */
async function handler(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export { handler as GET, handler as POST };
