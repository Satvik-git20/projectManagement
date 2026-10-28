import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { ApiError, assertSameOrigin, handleError, json, parseBody } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { colorFor } from "@/lib/utils";
import { toPublicUser } from "@/lib/serializers";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const limit = rateLimit(`register:${clientKey(request)}`, 5, 60_000);
    if (!limit.ok) {
      throw new ApiError(429, "Too many sign-up attempts. Try again in a minute.");
    }

    const input = await parseBody(request, registerSchema);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(409, "An account with that email already exists");
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        avatarColor: colorFor(input.email),
      },
    });

    await createSession(user.id, request.headers.get("user-agent"));

    return json({ user: toPublicUser(user) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
