import type { Config, Tab } from "./types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { TopBar } from "./components/TopBar";
import { Tabs } from "./components/Tabs";
import { SeederTab } from "./components/seeder/SeederTab";
import { ExplorerTab } from "./components/explorer/ExplorerTab";
import { WorkflowsTab } from "./components/workflows/WorkflowsTab";

const DEFAULT_CONFIG: Config = {
  baseUrlV1: "https://dev.swivlconnect.com",
  baseUrlRevamp: "https://dev.revamp.swivlconnect.com",
  token: "",
  authScheme: "Bearer",
  customHeaderName: "",
};

export default function App() {
  const [config, setConfig] = useLocalStorage<Config>("seeder.config", DEFAULT_CONFIG);
  const [tab, setTab] = useLocalStorage<Tab>("app.tab", "seeder");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <TopBar config={config} setConfig={setConfig} />
      <Tabs current={tab} onChange={setTab} />

      <main className="flex-1">
        {tab === "seeder" && <SeederTab config={config} />}
        {tab === "explorer" && <ExplorerTab config={config} />}
        {tab === "workflows" && <WorkflowsTab config={config} />}
      </main>
    </div>
  );
}
