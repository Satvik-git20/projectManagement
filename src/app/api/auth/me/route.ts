import { getSession } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export async function GET() {
  try {
    const user = await getSession();
    return json({
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarColor: user.avatarColor,
          }
        : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
