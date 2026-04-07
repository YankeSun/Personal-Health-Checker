import { clearSession } from "@/lib/auth/session";

export async function POST() {
  await clearSession();

  return Response.redirect(
    new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    303,
  );
}
