import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import FlowsPage from "./pages/FlowsPage";
import AlertsPage from "./pages/AlertsPage";
import RulesPage from "./pages/RulesPage";
import ConnectionBadge from "./components/ConnectionBadge";
import { useAppStore } from "./store/useAppStore";
import { useEffect } from "react";
import { initWebSocket } from "./lib/wsClient";
import { BarChart3, Shuffle, AlertTriangle, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", icon: <BarChart3 className="w-5 h-5" />, label: "Dashboard" },
  { to: "/flows", icon: <Shuffle className="w-5 h-5" />, label: "Flows" },
  { to: "/alerts", icon: <AlertTriangle className="w-5 h-5" />, label: "Alerts" },
  { to: "/rules", icon: <ShieldCheck className="w-5 h-5" />, label: "Rules" },
];

const PAGE_TITLES = {
  "/": "Dashboard",
  "/flows": "Network Flows",
  "/alerts": "Alerts & Threats",
  "/rules": "Detection Rules",
};

export default function App() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || "Dashboard";
  const apiKey = useAppStore(state => state.apiKey);

  useEffect(() => {
    if (apiKey) {
      const cleanup = initWebSocket();
      return cleanup;
    }
  }, [apiKey]);

  return (
    <div className="flex h-screen bg-[#0a0e1a] text-[#e2e8f0] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d1221] border-r border-[#1e293b] flex flex-col flex-shrink-0">
        <div className="h-[72px] flex items-center px-6 border-b border-[#1e293b]">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#22d3ee] to-[#a78bfa] flex items-center justify-center font-bold text-[#0a0e1a] shadow-[0_0_20px_rgba(34,211,238,0.15)] mr-3">
            PP
          </div>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-[#22d3ee] to-[#a78bfa]">PacketPulse</h1>
            <span className="text-[11px] text-[#64748b] font-semibold tracking-wider uppercase">DPI Engine</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                  isActive 
                  ? 'bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/20' 
                  : 'text-[#94a3b8] hover:bg-[#111827] hover:text-[#e2e8f0] border border-transparent'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] bg-[#0a0e1a]/80 backdrop-blur-md border-b border-[#1e293b] flex items-center justify-between px-8 flex-shrink-0 z-10">
          <h2 className="text-xl font-bold tracking-tight text-[#e2e8f0]">{title}</h2>
          <div className="flex items-center gap-4">
            <ConnectionBadge />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded relative">
          <div className="max-w-[1600px] mx-auto h-full">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/flows" element={<FlowsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/rules" element={<RulesPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
