import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { enforceOrigin } from "@/lib/security";
export async function POST() { try { await enforceOrigin(); await destroySession(); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ message: "Unable to log out." }, { status: 400 }); } }
