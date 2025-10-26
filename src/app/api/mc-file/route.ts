import { NextResponse } from "next/server";
import { readFile, writeFile, unlink, stat, rm } from "node:fs/promises";
import path from "node:path";

function sanitize(rel: string) {
  // normalize slashes and remove traversal
  const cleaned = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  return cleaned;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relRaw = searchParams.get("path") || "";
    const download = searchParams.get("download") === "1";
    const rel = sanitize(relRaw);
    const mcRoot = path.join(process.cwd(), "mc");
    const target = path.join(mcRoot, rel);

    const resolvedRoot = path.resolve(mcRoot);
    const resolvedTarget = path.resolve(target);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const s = await stat(resolvedTarget);
    if (!s.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // For certain binary/archive files, only allow download
    {
      const lower = rel.toLowerCase();
      const restricted = lower.endsWith(".jar") || lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".log.gz");
      if (!download && restricted) {
        return NextResponse.json({ error: "Viewing/editing this file type is not allowed" }, { status: 400 });
      }
    }

    const data = await readFile(resolvedTarget);
    if (download) {
      const filename = path.basename(resolvedTarget);
      return new NextResponse(data, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    // default: return as text
    return NextResponse.json({ content: data.toString("utf-8") });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const rel = sanitize(body?.path || "");
    const content = body?.content ?? "";

    // Disallow editing certain file types
    {
      const lower = rel.toLowerCase();
      const restricted = lower.endsWith(".jar") || lower.endsWith(".zip") || lower.endsWith(".rar") || lower.endsWith(".log.gz");
      if (restricted) {
        return NextResponse.json({ error: "Editing this file type is not allowed" }, { status: 400 });
      }
    }

    const mcRoot = path.join(process.cwd(), "mc");
    const target = path.join(mcRoot, rel);
    const resolvedRoot = path.resolve(mcRoot);
    const resolvedTarget = path.resolve(target);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const s = await stat(resolvedTarget);
    if (!s.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    await writeFile(resolvedTarget, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relRaw = searchParams.get("path") || "";
    const rel = sanitize(relRaw);

    const mcRoot = path.join(process.cwd(), "mc");
    const target = path.join(mcRoot, rel);
    const resolvedRoot = path.resolve(mcRoot);
    const resolvedTarget = path.resolve(target);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const s = await stat(resolvedTarget);

    // If it's a file, delete the file. If it's a directory, delete it recursively.
    if (s.isFile()) {
      await unlink(resolvedTarget);
    } else if (s.isDirectory()) {
      // Recursively remove directory contents
      await rm(resolvedTarget, { recursive: true, force: true });
    } else {
      return NextResponse.json({ error: "Unsupported path type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
