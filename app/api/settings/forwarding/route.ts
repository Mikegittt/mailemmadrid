import { NextResponse } from "next/server";
import { getForwardingSettings, setForwardingEnabled } from "@/lib/database";
import { enforceOrigin } from "@/lib/security";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  try {
    await requireSession();
    return NextResponse.json(await getForwardingSettings());
  } catch {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSession();
    await enforceOrigin();
    const body = await request.json() as { enabled?: unknown };
    if (typeof body.enabled !== "boolean") return NextResponse.json({ message: "enabled must be a boolean." }, { status: 400 });
    return NextResponse.json(await setForwardingEnabled(body.enabled));
  } catch (error) {
    const message = error instanceof Error && error.message === "Unauthorized" ? "Unauthorized." : "Unable to update forwarding settings.";
    return NextResponse.json({ message }, { status: message === "Unauthorized." ? 401 : 500 });
  }
}
