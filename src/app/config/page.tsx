"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "../toast";
import { loadConfig, saveConfig } from "./actions/configActions";

// The config keys we support (as per src/config.ts)
const DEFAULTS = {
  MIN_RAM: "1G",
  MAX_RAM: "2G",
};

function buildJavaCommand(cfg: { MC_DIR: string; JAR_NAME: string; MIN_RAM?: string; MAX_RAM?: string }) {
  const min = (cfg.MIN_RAM || DEFAULTS.MIN_RAM).trim();
  const max = (cfg.MAX_RAM || DEFAULTS.MAX_RAM).trim();
  const jar = (cfg.JAR_NAME || "").trim();
  return `java -Xms${min} -Xmx${max} -jar ${jar} nogui`;
}

export default function ConfigPanelPage() {
  const { showToast } = useToast();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const cfgObj = useMemo(() => {
    const out: Record<string, string> = {};
    content.split("\n").forEach((line) => {
      const l = line.trim();
      if (!l || l.startsWith("#")) return;
      const eq = l.indexOf("=");
      if (eq > 0) {
        const k = l.slice(0, eq).trim();
        const v = l.slice(eq + 1).trim();
        out[k] = v;
      }
    });
    return out;
  }, [content]);

  const javaCmd = useMemo(() => {
    const MC_DIR = cfgObj.MC_DIR || "";
    const JAR_NAME = cfgObj.JAR_NAME || "";
    const MIN_RAM = cfgObj.MIN_RAM || DEFAULTS.MIN_RAM;
    const MAX_RAM = cfgObj.MAX_RAM || DEFAULTS.MAX_RAM;
    if (!MC_DIR || !JAR_NAME) return "";
    return `(cd ${MC_DIR} && ${buildJavaCommand({ MC_DIR, JAR_NAME, MIN_RAM, MAX_RAM })})`;
  }, [cfgObj]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const result = await loadConfig();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load config');
        }
        setContent(result.content || "");
      } catch (e: any) {
        showToast(e?.message || "Failed to load config.panel", "error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [showToast]);

  const onSave = async () => {
    setSaving(true);
    try {
      const result = await saveConfig(content);
      if (!result.success) {
        throw new Error(result.error || 'Save failed');
      }
      showToast("✓ Saved successfully", "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-10 h-full">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-300 hover:text-white text-sm">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-white">Config Panel</h1>
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={onSave}
              disabled={saving}
              className={`px-3 py-1.5 rounded text-sm ${saving ? 'bg-neutral-700 text-neutral-400' : 'bg-white text-black hover:opacity-90'}`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-neutral-300 text-sm">Loading config.panel...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-neutral-300">config.panel</label>
              <textarea
                className="min-h-[400px] w-full rounded border border-neutral-800 bg-black text-white p-3 font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
              <p className="text-xs text-neutral-400">Tip: Use KEY=VALUE lines. Supported: MC_DIR, JAR_NAME, MIN_RAM, MAX_RAM, JAVA_IP, BEDROCK_IP, ENABLE_PINGGY, ENABLE_PLAYIT.</p>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-semibold text-white mb-2">Parsed</h2>
                <div className="rounded border border-neutral-800 bg-neutral-950 p-3 text-sm">
                  <pre className="whitespace-pre-wrap break-all text-neutral-300">{JSON.stringify(cfgObj, null, 2)}</pre>
                </div>
              </div>

              <div>
                <h2 className="font-semibold text-white mb-2">Java command</h2>
                <div className="rounded border border-neutral-800 bg-neutral-950 p-3 text-sm">
                  {javaCmd ? (
                    <code className="break-all text-emerald-400">{javaCmd}</code>
                  ) : (
                    <p className="text-neutral-400">Fill MC_DIR and JAR_NAME to see the command</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
