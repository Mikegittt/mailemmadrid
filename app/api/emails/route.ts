import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listEmails } from "@/lib/database";
export async function GET() { try { await requireSession(); return NextResponse.json({ records: await listEmails() }); } catch { return NextResponse.json({ message: "Unauthorized." }, { status: 401 }); } }
