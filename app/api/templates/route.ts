import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { listTemplates, saveTemplate, deleteTemplate } from "@/lib/database";
import { z } from "zod";
const templateSchema = z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(100), subject: z.string().trim().min(1).max(200), html: z.string().min(1), text: z.string() });
export async function GET() { try { await requireSession(); return NextResponse.json({ templates: await listTemplates() }); } catch { return NextResponse.json({ message: "Unauthorized." }, { status: 401 }); } }
export async function POST(request: Request) { try { await requireSession(); const template = await saveTemplate(templateSchema.parse(await request.json())); return NextResponse.json({ template }); } catch { return NextResponse.json({ message: "Unable to save template." }, { status: 400 }); } }
export async function DELETE(request: Request) { try { await requireSession(); const id = z.object({ id: z.string().min(1) }).parse(await request.json()).id; await deleteTemplate(id); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ message: "Unable to delete template." }, { status: 400 }); } }
