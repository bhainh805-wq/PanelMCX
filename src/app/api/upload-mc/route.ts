import { NextResponse } from "next/server";
import path from "node:path";
import { mkdir, stat, writeFile, readFile as fsReadFile } from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(exec);

function sanitize(rel: string) {
  const cleaned = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Fast server state gate: block uploads if server appears active
    const mcRoot = path.join(process.cwd(), "mc");
    let serverBusy = false;
    try {
      // Check process
      const platform = process.platform;
      let cmd = platform === 'win32' ? 'tasklist /FI "IMAGENAME eq java.exe" /FO CSV /NH' : 'ps aux | grep "[j]ava.*paper.*\\.jar"';
      const { stdout } = await execAsync(cmd);
      if (platform === 'win32') {
        serverBusy = stdout.toLowerCase().includes('java.exe');
      } else {
        serverBusy = stdout.trim().length > 0;
      }
      // If not caught by process, also check log recency
      if (!serverBusy) {
        try {
          const latestLog = path.join(mcRoot, 'logs', 'latest.log');
          const s = await stat(latestLog);
          const age = Date.now() - s.mtimeMs;
          if (age < 60_000) serverBusy = true; // 60s
        } catch {}
      }
    } catch {}

    if (serverBusy) {
      return NextResponse.json({ error: 'Uploads are disabled while the server is running or busy (starting/stopping). Please try again later.' }, { status: 400 });
    }
    const relRaw = searchParams.get("path") || "";
    const rel = sanitize(relRaw);

    const form = await req.formData();
    const files = form.getAll("files");
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided. Use 'files' field." }, { status: 400 });
    }

    const targetDir = path.join(mcRoot, rel);

    const resolvedRoot = path.resolve(mcRoot);
    const resolvedTarget = path.resolve(targetDir);
    if (!resolvedTarget.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Ensure target directory exists
    try {
      const s = await stat(resolvedTarget);
      if (!s.isDirectory()) {
        return NextResponse.json({ error: "Target path is not a directory" }, { status: 400 });
      }
    } catch {
      await mkdir(resolvedTarget, { recursive: true });
    }

    const saved: { name: string; size: number }[] = [];
    for (const item of files) {
      if (!(item instanceof File)) continue;
      const arrayBuffer = await item.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filePath = path.join(resolvedTarget, item.name);
      const resolvedFile = path.resolve(filePath);
      if (!resolvedFile.startsWith(resolvedRoot)) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
      }
      await writeFile(resolvedFile, buffer);
      saved.push({ name: item.name, size: buffer.byteLength });
    }

    return NextResponse.json({ ok: true, saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
