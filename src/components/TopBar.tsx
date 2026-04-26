import { useState } from "react";
import type { Config, Environment } from "../types";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { testConnection } from "../runner";

type Props = {
  config: Config;
  setConfig: (c: Config) => void;
};

const ENV_COLORS = [
  { name: "green", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/40", dot: "bg-emerald-400" },
  { name: "amber", bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/40", dot: "bg-amber-400" },
  { name: "rose", bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/40", dot: "bg-rose-400" },
  { name: "cyan", bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/40", dot: "bg-cyan-400" },
  { name: "violet", bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/40", dot: "bg-violet-400" },
];

const DEFAULT_ENVS: Environment[] = [
  {
    id: "dev",
    name: "Dev",
    color: "green",
    config: {
      baseUrlV1: "https://dev.swivlconnect.com",
      baseUrlRevamp: "https://dev.revamp.swivlconnect.com",
      token: "",
      authScheme: "Bearer",
      customHeaderName: "",
    },
  },
  {
    id: "stage",
    name: "Stage",
    color: "amber",
    config: {
      baseUrlV1: "https://stage.swivlconnect.com",
      baseUrlRevamp: "https://stage.revamp.swivlconnect.com",
      token: "",
      authScheme: "Bearer",
      customHeaderName: "",
    },
  },
  {
    id: "prod",
    name: "Prod",
    color: "rose",
    config: {
      baseUrlV1: "https://app.swivlconnect.com",
      baseUrlRevamp: "https://app.revamp.swivlconnect.com",
      token: "",
      authScheme: "Bearer",
      customHeaderName: "",
    },
  },
];

export function TopBar({ config, setConfig }: Props) {
  const [environments, setEnvironments] = useLocalStorage<Environment[]>("app.environments", DEFAULT_ENVS);
  const [activeEnvId, setActiveEnvId] = useLocalStorage<string | null>("app.activeEnvId", null);
  const [testing, setTesting] = useState<"v1" | "revamp" | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    which: "v1" | "revamp";
    ok: boolean;
    message: string;
  } | null>(null);

  const update = <K extends keyof Config>(key: K, value: Config[K]) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // Auto-save to active environment
    if (activeEnvId) {
      setEnvironments(environments.map((e) => (e.id === activeEnvId ? { ...e, config: newConfig } : e)));
    }
  };

  const handleTest = async (which: "v1" | "revamp") => {
    setTesting(which);
    setTestResult(null);
    const url = which === "v1" ? config.baseUrlV1 : config.baseUrlRevamp;
    const result = await testConnection(url);
    setTestResult({ which, ...result });
    setTesting(null);
    setTimeout(() => setTestResult(null), 6000);
  };

  const switchEnv = (env: Environment) => {
    // Save current config to the currently active env before switching
    if (activeEnvId) {
      setEnvironments(
        environments.map((e) => (e.id === activeEnvId ? { ...e, config: { ...config } } : e)),
      );
    }
    setActiveEnvId(env.id);
    setConfig(env.config);
  };

  const addEnv = () => {
    if (!newEnvName.trim()) return;
    const colorIdx = environments.length % ENV_COLORS.length;
    const newEnv: Environment = {
      id: Date.now().toString(36),
      name: newEnvName.trim(),
      color: ENV_COLORS[colorIdx].name,
      config: { ...config },
    };
    setEnvironments([...environments, newEnv]);
    setActiveEnvId(newEnv.id);
    setNewEnvName("");
    setShowAddEnv(false);
  };

  const removeEnv = (id: string) => {
    setEnvironments(environments.filter((e) => e.id !== id));
    if (activeEnvId === id) setActiveEnvId(null);
    setEditingEnv(null);
  };

  const getColorClasses = (colorName: string) =>
    ENV_COLORS.find((c) => c.name === colorName) ?? ENV_COLORS[0];

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        {/* Header + Env Switcher */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="size-4 text-cyan-400" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
          </div>
          <div className="mr-4">
            <h1 className="text-zinc-100 text-lg font-semibold tracking-tight">Swivl Seeder</h1>
            <p className="text-zinc-500 text-xs">API toolkit for v1 + revamp backends</p>
          </div>

          {/* Environment pills */}
          <div className="flex items-center gap-1.5 ml-auto">
            {environments.map((env) => {
              const c = getColorClasses(env.color);
              const isActive = activeEnvId === env.id;
              return (
                <div key={env.id} className="relative group">
                  <button
                    onClick={() => switchEnv(env)}
                    onDoubleClick={() => setEditingEnv(editingEnv === env.id ? null : env.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition flex items-center gap-1.5 ${
                      isActive
                        ? `${c.bg} ${c.text} ${c.border} ring-1 ring-${c.name}-500/20`
                        : "bg-zinc-800/40 text-zinc-500 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full ${isActive ? c.dot : "bg-zinc-600"}`} />
                    {env.name}
                  </button>

                  {/* Edit popover on double-click */}
                  {editingEnv === env.id && (
                    <div className="absolute z-50 top-full mt-1 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-3 space-y-2 min-w-[200px]">
                      <div className="flex gap-1">
                        {ENV_COLORS.map((col) => (
                          <button
                            key={col.name}
                            onClick={() => {
                              setEnvironments(environments.map((e) => (e.id === env.id ? { ...e, color: col.name } : e)));
                            }}
                            className={`size-5 rounded-full ${col.dot} ${env.color === col.name ? "ring-2 ring-white/40" : "opacity-40 hover:opacity-100"} transition`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => removeEnv(env.id)}
                        className="text-[11px] text-rose-400 hover:text-rose-300 w-full text-left"
                      >
                        Remove environment
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add env */}
            {showAddEnv ? (
              <div className="flex items-center gap-1">
                <input
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addEnv(); if (e.key === "Escape") setShowAddEnv(false); }}
                  placeholder="Name…"
                  autoFocus
                  className="w-24 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:border-cyan-500/50"
                />
                <button onClick={addEnv} className="text-xs text-cyan-400 hover:text-cyan-300 px-1">
                  Save
                </button>
                <button onClick={() => { setShowAddEnv(false); setNewEnvName(""); }} className="text-xs text-zinc-500 hover:text-zinc-300 px-1">
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddEnv(true)}
                className="px-2 py-1.5 rounded-md text-xs text-zinc-500 border border-dashed border-zinc-700 hover:text-zinc-300 hover:border-zinc-600 transition"
              >
                +
              </button>
            )}
          </div>
        </div>

        {/* URL fields */}
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

        {/* Token + Auth */}
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
