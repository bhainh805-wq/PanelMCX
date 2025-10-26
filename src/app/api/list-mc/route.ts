import { NextResponse } from "next/server";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rel = searchParams.get("path") || "";
    // prevent path traversal
    const safeRel = rel.replace(/\\/g, "/").replace(/\.+\//g, "");
    const mcRoot = path.join(process.cwd(), "mc");
    const target = path.join(mcRoot, safeRel);

    // ensure target stays under mcRoot
    const resolvedRoot = path.resolve(mcRoot);
    const resolvedTarget = path.resolve(target);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const entries = await readdir(target);
    const detailed = await Promise.all(
      entries.map(async (name) => {
        const full = path.join(target, name);
        const s = await stat(full);
        return {
          name,
          isDir: s.isDirectory(),
          size: s.size,
          mtime: s.mtimeMs,
        };
      })
    );
    const relPath = "/" + safeRel.replace(/^\/+/, "");
    return NextResponse.json({ path: relPath === "/" ? "/mc" : `/mc${relPath}` , rel: safeRel, entries: detailed });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to list" }, { status: 500 });
  }
}
