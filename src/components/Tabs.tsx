import type { Tab } from "../types";

type Props = {
  current: Tab;
  onChange: (tab: Tab) => void;
};

const TABS: { id: Tab; label: string; description: string; icon: string }[] = [
  { id: "seeder", label: "Seeder", description: "Bulk-create test data", icon: "🌱" },
  { id: "explorer", label: "Explorer", description: "One-off API calls", icon: "🔍" },
  { id: "workflows", label: "Workflows", description: "Chained CRUD flows", icon: "⚡" },
];

export function Tabs({ current, onChange }: Props) {
  return (
    <div className="border-b border-zinc-800 bg-zinc-900/30 sticky top-0 z-30 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex gap-1">
          {TABS.map((t) => {
            const active = current === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  active ? "text-cyan-400" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span className="mr-1.5 text-base leading-none">{t.icon}</span>
                {t.label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
