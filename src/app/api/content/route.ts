import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const DATA_PATH = path.join(process.cwd(), "content", "data.json");

export async function GET() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return Response.json(JSON.parse(raw));
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  fs.writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), "utf-8");
  return Response.json({ ok: true });
}
