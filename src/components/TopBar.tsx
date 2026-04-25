import { useState } from "react";
import type { Config } from "../types";
import { testConnection } from "../runner";

type Props = {
  config: Config;
  setConfig: (c: Config) => void;
};

export function TopBar({ config, setConfig }: Props) {
  const [testing, setTesting] = useState<"v1" | "revamp" | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [testResult, setTestResult] = useState<{
    which: "v1" | "revamp";
    ok: boolean;
    message: string;
  } | null>(null);

  const update = <K extends keyof Config>(key: K, value: Config[K]) =>
    setConfig({ ...config, [key]: value });

  const handleTest = async (which: "v1" | "revamp") => {
    setTesting(which);
    setTestResult(null);
    const url = which === "v1" ? config.baseUrlV1 : config.baseUrlRevamp;
    const result = await testConnection(url);
    setTestResult({ which, ...result });
    setTesting(null);
    setTimeout(() => setTestResult(null), 6000);
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-4 text-cyan-400" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-zinc-100 text-lg font-semibold tracking-tight">Swivl Seeder</h1>
            <p className="text-zinc-500 text-xs">Bulk-create test data across v1 + revamp backends</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="V1 Backend URL" hint="NEXT_PUBLIC_BACKEND_URL">
            <div className="flex gap-2">
              <input
                value={config.baseUrlV1}
                onChange={(e) => update("baseUrlV1", e.target.value)}
                placeholder="https://dev.swivlconnect.com"
                className={inputCls}
              />
              <button onClick={() => handleTest("v1")} disabled={testing !== null} className={testBtnCls}>
                {testing === "v1" ? "…" : "Test"}
              </button>
            </div>
          </Field>
          <Field label="Revamp Backend URL" hint="NEXT_PUBLIC_BACKEND_REVAMP_URL">
            <div className="flex gap-2">
              <input
                value={config.baseUrlRevamp}
                onChange={(e) => update("baseUrlRevamp", e.target.value)}
                placeholder="https://dev.revamp.swivlconnect.com"
                className={inputCls}
              />
              <button onClick={() => handleTest("revamp")} disabled={testing !== null} className={testBtnCls}>
                {testing === "revamp" ? "…" : "Test"}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_200px] gap-3">
          <Field label={`Token${config.authScheme === "Custom" ? ` (${config.customHeaderName || "set header →"})` : ""}`}>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={config.token}
                onChange={(e) => update("token", e.target.value)}
                placeholder="Paste bearer token…"
                className={`${inputCls} font-mono text-xs`}
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="px-3 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-400 text-xs hover:text-zinc-200 transition"
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <Field label="Auth scheme">
            <select
              value={config.authScheme}
              onChange={(e) => update("authScheme", e.target.value as Config["authScheme"])}
              className={inputCls}
            >
              <option value="Bearer">Bearer</option>
              <option value="Basic">Basic</option>
              <option value="Custom">Custom header</option>
            </select>
          </Field>
          {config.authScheme === "Custom" ? (
            <Field label="Header name">
              <input
                value={config.customHeaderName}
                onChange={(e) => update("customHeaderName", e.target.value)}
                placeholder="X-API-Key"
                className={`${inputCls} font-mono text-xs`}
              />
            </Field>
          ) : (
            <div />
          )}
        </div>

        {testResult && (
          <div
            className={`mt-3 px-3 py-2 rounded-md text-xs font-mono ${
              testResult.ok
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
            }`}
          >
            <span className="opacity-60">[{testResult.which}]</span> {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "flex-1 min-w-0 px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition";

const testBtnCls =
  "px-3 rounded-md border border-zinc-700 bg-zinc-800 text-zinc-200 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
        {hint && <span className="text-[10px] text-zinc-600 font-mono">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
