import { destroyCurrentSession } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export async function POST() {
  try {
    await destroyCurrentSession();
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
