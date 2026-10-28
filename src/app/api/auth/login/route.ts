import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { ApiError, assertSameOrigin, handleError, json, parseBody } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { toPublicUser } from "@/lib/serializers";

// A real bcrypt hash so unknown emails cost the same as known ones.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.4oCZ0N1jM0K5p8s6l0Fz7Sq2VnZ0aHW";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const input = await parseBody(request, loginSchema);
    const limit = rateLimit(
      `login:${clientKey(request)}:${input.email}`,
      8,
      60_000,
    );
    if (!limit.ok) {
      throw new ApiError(429, "Too many attempts. Try again in a minute.");
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    const valid = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    if (!user || !valid) {
      throw new ApiError(401, "Email or password is incorrect");
    }

    await createSession(user.id, request.headers.get("user-agent"));

    return json({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}
