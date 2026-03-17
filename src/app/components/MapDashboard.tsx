import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Calendar,
  AlertTriangle,
  Truck,
  Moon,
  Sun,
  Layers,
  Phone,
  Clock,
  Camera,
  Shield,
  Bell,
  Navigation,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  MapPin,
  CheckCircle,
  Zap,
  Filter,
  Radio,
  Activity,
  RefreshCw,
  UserCheck,
} from "lucide-react";
import {
  dumpSites,
  wards,
  truckRoutes,
  type DumpSite,
} from "../data/mockData";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// ── Map projection ──────────────────────────────────────────────────────────
const MAP = {
  minLat: 12.855,
  maxLat: 13.105,
  minLng: 77.44,
  maxLng: 77.815,
  W: 1000,
  H: 700,
};
const toX = (lng: number) =>
  ((lng - MAP.minLng) / (MAP.maxLng - MAP.minLng)) * MAP.W;
const toY = (lat: number) =>
  ((MAP.maxLat - lat) / (MAP.maxLat - MAP.minLat)) * MAP.H;

function interpRoute(
  route: { lat: number; lng: number }[],
  t: number,
) {
  const n = route.length - 1;
  const seg = Math.min(t * n, n - 0.001);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = route[i],
    b = route[Math.min(i + 1, n)];
  return {
    x: toX(a.lng) + (toX(b.lng) - toX(a.lng)) * f,
    y: toY(a.lat) + (toY(b.lat) - toY(a.lat)) * f,
  };
}

// ── Static overlay data ─────────────────────────────────────────────────────
const CCTV = [
  { id: "C1", lat: 12.973, lng: 77.641, label: "Indiranagar" },
  { id: "C2", lat: 12.935, lng: 77.625, label: "Koramangala" },
  { id: "C3", lat: 12.987, lng: 77.73, label: "ITPL Gate" },
  { id: "C4", lat: 13.001, lng: 77.7, label: "KR Puram" },
  { id: "C5", lat: 13.035, lng: 77.597, label: "Hebbal" },
  {
    id: "C6",
    lat: 12.958,
    lng: 77.699,
    label: "Marathahalli Bridge",
  },
  { id: "C7", lat: 12.918, lng: 77.642, label: "HSR Main" },
];

const RISK_ZONES = [
  {
    id: "R1",
    lat: 12.935,
    lng: 77.625,
    rx: 60,
    ry: 45,
    label: "Risk Zone A",
  },
  {
    id: "R2",
    lat: 12.897,
    lng: 77.645,
    rx: 70,
    ry: 50,
    label: "Risk Zone B",
  },
  {
    id: "R3",
    lat: 12.97,
    lng: 77.748,
    rx: 55,
    ry: 40,
    label: "Risk Zone C",
  },
];

const WARD_POLYS = [
  {
    id: "yelahanka",
    name: "Yelahanka",
    lx: 420,
    ly: 108,
    pts: "358,52 502,42 518,192 368,197 348,122",
  },
  {
    id: "indiranagar",
    name: "Indiranagar",
    lx: 522,
    ly: 358,
    pts: "468,308 608,302 622,422 482,432 462,372",
  },
  {
    id: "koramangala",
    name: "Koramangala",
    lx: 500,
    ly: 475,
    pts: "452,440 600,430 612,528 458,534 438,482",
  },
  {
    id: "hsr",
    name: "HSR Layout",
    lx: 530,
    ly: 526,
    pts: "478,498 622,488 632,574 490,580 470,534",
  },
  {
    id: "whitefield",
    name: "Whitefield",
    lx: 812,
    ly: 370,
    pts: "718,308 924,292 934,448 728,452 712,382",
  },
  {
    id: "marathahalli",
    name: "Marathahalli",
    lx: 686,
    ly: 390,
    pts: "638,348 762,338 768,442 648,448 630,392",
  },
  {
    id: "malleshwaram",
    name: "Malleshwaram",
    lx: 320,
    ly: 260,
    pts: "258,182 408,172 422,282 364,302 248,292",
  },
  {
    id: "jayanagar",
    name: "Jayanagar",
    lx: 418,
    ly: 478,
    pts: "396,440 492,432 502,528 402,534 382,490",
  },
];

// ── SLA helpers ──────────────────────────────────────────────────────────────
function getSLAHours(site: DumpSite) {
  return site.severity === "high"
    ? 4
    : site.severity === "medium"
      ? 8
      : 24;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "OVERDUE";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getSLAStatus(site: DumpSite, now: Date) {
  if (site.status === "cleaned") return "done";
  const reported = new Date(site.reportedDate);
  const deadline = new Date(
    reported.getTime() + getSLAHours(site) * 3600000,
  );
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "overdue";
  if (diff < 3600000) return "critical";
  return "ok";
}

function getSLAMs(site: DumpSite, now: Date) {
  const reported = new Date(site.reportedDate);
  const deadline = new Date(
    reported.getTime() + getSLAHours(site) * 3600000,
  );
  return deadline.getTime() - now.getTime();
}

// ── Severity → size ──────────────────────────────────────────────────────────
const SEVERITY_R: Record<string, number> = {
  high: 20,
  medium: 15,
  low: 11,
};

export function MapDashboard() {
  const [darkMode, setDarkMode] = useState(false);
  const [sat, setSat] = useState(false); // satellite overlay
  const [layers, setLayers] = useState({
    heatmap: true,
    trucks: true,
    cctv: false,
    prediction: false,
  });
  const [filterWard, setFilterWard] = useState("All Wards");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedSite, setSelectedSite] =
    useState<DumpSite | null>(null);
  const [officerOpen, setOfficerOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [truckT, setTruckT] = useState(0.4);
  const [now, setNow] = useState(new Date());
  const [reportMode, setReportMode] = useState(false);
  const [reportClick, setReportClick] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Timers
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(
      () => setTruckT((t) => (t + 0.0008) % 1),
      60,
    );
    return () => clearInterval(id);
  }, []);

  const filteredSites = dumpSites.filter((s) => {
    if (filterWard !== "All Wards" && s.ward !== filterWard)
      return false;
    if (
      filterSeverity !== "all" &&
      s.severity !== filterSeverity
    )
      return false;
    if (filterStatus !== "all" && s.status !== filterStatus)
      return false;
    return true;
  });

  const toggleLayer = (k: keyof typeof layers) =>
    setLayers((l) => ({ ...l, [k]: !l[k] }));

  const priorityAlerts = dumpSites
    .filter((s) => s.status !== "cleaned")
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 3);

  // Colors based on mode
  const C = {
    bg: darkMode ? "#111c25" : "#edeae0",
    urbanFill: darkMode ? "#1b2e3c" : "#e0dbd0",
    urbanFill2: darkMode ? "#162636" : "#d8d4ca",
    waterFill: darkMode ? "#1a3a50" : "#a8c8d8",
    waterStroke: darkMode ? "#2255a0" : "#7ab0c8",
    hwColor: darkMode ? "#3a5060" : "#c0bbb0",
    hwStroke: darkMode ? "#556070" : "#a8a49a",
    arterial: darkMode ? "#253545" : "#d4cfc4",
    arterialStroke: darkMode ? "#3a4f60" : "#b8b4aa",
    local: darkMode ? "#1e2e3c" : "#d8d4ca",
    wardFill: darkMode
      ? "rgba(80,190,100,0.07)"
      : "rgba(45,119,56,0.08)",
    wardStroke: darkMode
      ? "rgba(80,190,110,0.45)"
      : "rgba(45,119,56,0.4)",
    label: darkMode ? "#8ab0c8" : "#606870",
    panel: darkMode ? "#0f1e28" : "#ffffff",
    panelBorder: darkMode ? "#253545" : "#e5e7eb",
    text: darkMode ? "#e2eaf0" : "#1a2530",
    textMuted: darkMode ? "#6a8a9a" : "#6b7280",
    accent: "#2d7738",
    green: darkMode ? "#4ade80" : "#16a34a",
    red: darkMode ? "#f87171" : "#dc2626",
    yellow: darkMode ? "#fbbf24" : "#d97706",
    parkFill: darkMode ? "#1a3020" : "#c8dab0",
    parkStroke: darkMode ? "#2a5030" : "#a8c090",
  };

  const handleMapClick = (
    e: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (!reportMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * MAP.W;
    const svgY = ((e.clientY - rect.top) / rect.height) * MAP.H;
    setReportClick({ x: svgX, y: svgY });
  };

  return (
    <div
      className="flex h-[calc(100vh-73px)] overflow-hidden"
      style={{ background: C.bg, color: C.text }}
    >
      {/* ── Left Sidebar ────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 overflow-hidden border-r flex flex-col"
            style={{
              background: C.panel,
              borderColor: C.panelBorder,
            }}
          >
            <div className="p-4 overflow-y-auto flex-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <Filter
                  className="h-4 w-4"
                  style={{ color: C.accent }}
                />
                <span
                  className="font-semibold text-sm"
                  style={{ color: C.text }}
                >
                  Filters & Controls
                </span>
              </div>

              {/* Filters */}
              <div className="space-y-3 mb-4">
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: C.textMuted }}
                  >
                    Ward
                  </label>
                  <Select
                    value={filterWard}
                    onValueChange={setFilterWard}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <span style={{ color: C.text }}>
                        {filterWard}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {wards.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: C.textMuted }}
                  >
                    Severity
                  </label>
                  <Select
                    value={filterSeverity}
                    onValueChange={setFilterSeverity}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <span style={{ color: C.text }}>
                        {filterSeverity === "all"
                          ? "All Severities"
                          : filterSeverity}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Severities
                      </SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">
                        Medium
                      </SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: C.textMuted }}
                  >
                    Status
                  </label>
                  <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <span style={{ color: C.text }}>
                        {filterStatus === "all"
                          ? "All Statuses"
                          : filterStatus}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Statuses
                      </SelectItem>
                      <SelectItem value="detected">
                        Detected
                      </SelectItem>
                      <SelectItem value="pending">
                        Pending
                      </SelectItem>
                      <SelectItem value="cleaned">
                        Cleaned
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stats */}
              <div
                className="border rounded-lg p-3 mb-4 space-y-2"
                style={{ borderColor: C.panelBorder }}
              >
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: C.textMuted }}
                >
                  SITE SUMMARY
                </p>
                {[
                  {
                    label: "Total Sites",
                    val: filteredSites.length,
                    col: C.text,
                  },
                  {
                    label: "Detected",
                    val: filteredSites.filter(
                      (s) => s.status === "detected",
                    ).length,
                    col: C.red,
                  },
                  {
                    label: "Pending",
                    val: filteredSites.filter(
                      (s) => s.status === "pending",
                    ).length,
                    col: C.yellow,
                  },
                  {
                    label: "Cleaned",
                    val: filteredSites.filter(
                      (s) => s.status === "cleaned",
                    ).length,
                    col: C.green,
                  },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="flex justify-between items-center"
                  >
                    <span
                      className="text-xs"
                      style={{ color: C.textMuted }}
                    >
                      {r.label}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: r.col }}
                    >
                      {r.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Layers */}
              <div
                className="border rounded-lg p-3 mb-4"
                style={{ borderColor: C.panelBorder }}
              >
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: C.textMuted }}
                >
                  MAP LAYERS
                </p>
                <div className="space-y-2">
                  {[
                    {
                      key: "heatmap" as const,
                      label: "Dump Heatmap",
                      icon: (
                        <Activity className="h-3.5 w-3.5" />
                      ),
                    },
                    {
                      key: "trucks" as const,
                      label: "Truck Routes",
                      icon: <Truck className="h-3.5 w-3.5" />,
                    },
                    {
                      key: "cctv" as const,
                      label: "CCTV Cameras",
                      icon: <Camera className="h-3.5 w-3.5" />,
                    },
                    {
                      key: "prediction" as const,
                      label: "Risk Zones",
                      icon: <Shield className="h-3.5 w-3.5" />,
                    },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
                      className="flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-colors text-xs"
                      style={{
                        background: layers[key]
                          ? `${C.accent}22`
                          : "transparent",
                        color: layers[key]
                          ? C.accent
                          : C.textMuted,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </div>
                      {layers[key] ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                    </button>
                  ))}
                  <button
                    onClick={() => setSat((v) => !v)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-colors text-xs"
                    style={{
                      background: sat
                        ? `${C.accent}22`
                        : "transparent",
                      color: sat ? C.accent : C.textMuted,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5" />
                      <span>Satellite View</span>
                    </div>
                    {sat ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div
                className="border rounded-lg p-3"
                style={{ borderColor: C.panelBorder }}
              >
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: C.textMuted }}
                >
                  LEGEND
                </p>
                <div className="space-y-1.5">
                  {[
                    {
                      color: "#dc2626",
                      label: "Illegal Dump Detected",
                    },
                    {
                      color: "#f59e0b",
                      label: "Citizen Report Pending",
                    },
                    { color: "#16a34a", label: "Cleaned Site" },
                    { color: "#06b6d4", label: "CCTV Camera" },
                    {
                      color: "#8b5cf6",
                      label: "High-Risk Zone",
                    },
                  ].map(({ color, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span
                        className="text-xs"
                        style={{ color: C.textMuted }}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Map Area ────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="absolute top-3 left-3 z-30 p-1.5 rounded-md shadow-md transition-all"
          style={{
            background: C.panel,
            border: `1px solid ${C.panelBorder}`,
            color: C.textMuted,
          }}
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Top map toolbar */}
        <div className="absolute top-3 left-12 right-3 z-20 flex items-center gap-2 flex-wrap">
          {/* Title chip */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-md text-xs"
            style={{
              background: C.panel,
              border: `1px solid ${C.panelBorder}`,
              color: C.text,
            }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-semibold">LIVE</span>
            <span style={{ color: C.textMuted }}>|</span>
            <span style={{ color: C.textMuted }}>
              Bengaluru Waste Monitor
            </span>
            <span style={{ color: C.textMuted }}>|</span>
            <span style={{ color: C.textMuted }}>
              Last scan:{" "}
              {now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {/* Report mode button */}
          <button
            onClick={() => {
              setReportMode((v) => !v);
              setReportClick(null);
              setReportSubmitted(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md text-xs font-semibold transition-all ${reportMode ? "ring-2 ring-red-500" : ""}`}
            style={{
              background: reportMode ? "#dc2626" : C.panel,
              color: reportMode ? "#fff" : C.text,
              border: `1px solid ${reportMode ? "#dc2626" : C.panelBorder}`,
            }}
          >
            <MapPin className="h-3.5 w-3.5" />
            {reportMode ? "Click Map to Report" : "Report Dump"}
          </button>

          {/* Dark mode */}
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="p-1.5 rounded-lg shadow-md transition-all"
            style={{
              background: C.panel,
              border: `1px solid ${C.panelBorder}`,
              color: C.textMuted,
            }}
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Refresh */}
          <button
            className="p-1.5 rounded-lg shadow-md transition-all"
            style={{
              background: C.panel,
              border: `1px solid ${C.panelBorder}`,
              color: C.textMuted,
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* ── SVG Map ────────────────────────────���────────────────── */}
        <svg
          viewBox={`0 0 ${MAP.W} ${MAP.H}`}
          className="w-full h-full"
          style={{
            cursor: reportMode ? "crosshair" : "default",
          }}
          onClick={handleMapClick}
        >
          <defs>
            {/* Heatmap gradients */}
            {dumpSites.map((s) => (
              <radialGradient
                key={s.id}
                id={`heat-${s.id}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop
                  offset="0%"
                  stopColor={
                    s.severity === "high"
                      ? "#ff3300"
                      : s.severity === "medium"
                        ? "#ff9900"
                        : "#ffcc00"
                  }
                  stopOpacity="0.7"
                />
                <stop
                  offset="60%"
                  stopColor={
                    s.severity === "high"
                      ? "#ff6600"
                      : s.severity === "medium"
                        ? "#ffcc00"
                        : "#aaff00"
                  }
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor="#00ff00"
                  stopOpacity="0"
                />
              </radialGradient>
            ))}
            {/* Truck route gradient */}
            <linearGradient
              id="truckRoute1"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                stopColor="#2d7738"
                stopOpacity="0.8"
              />
              <stop
                offset="100%"
                stopColor="#4ade80"
                stopOpacity="0.4"
              />
            </linearGradient>
            <linearGradient
              id="truckRoute2"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                stopColor="#7c3aed"
                stopOpacity="0.8"
              />
              <stop
                offset="100%"
                stopColor="#a78bfa"
                stopOpacity="0.4"
              />
            </linearGradient>
            {/* Filter for satellite overlay */}
            <filter id="satFilter">
              <feColorMatrix type="saturate" values="1.8" />
              <feColorMatrix
                type="matrix"
                values="0.9 0 0 0 0.05  0 0.95 0 0 0.05  0 0 0.85 0 0.05  0 0 0 1 0"
              />
            </filter>
            <clipPath id="mapClip">
              <rect width={MAP.W} height={MAP.H} />
            </clipPath>
          </defs>

          {/* ── Background terrain ─────────── */}
          <rect width={MAP.W} height={MAP.H} fill={C.bg} />

          {/* Outer suburban zone */}
          <ellipse
            cx={500}
            cy={360}
            rx={490}
            ry={340}
            fill={darkMode ? "#141f28" : "#e4e0d6"}
          />

          {/* Urban core */}
          <ellipse
            cx={480}
            cy={380}
            rx={360}
            ry={260}
            fill={C.urbanFill}
          />
          <ellipse
            cx={500}
            cy={400}
            rx={240}
            ry={170}
            fill={C.urbanFill2}
          />

          {/* Parks / green areas */}
          <ellipse
            cx={395}
            cy={420}
            rx={25}
            ry={18}
            fill={C.parkFill}
            stroke={C.parkStroke}
            strokeWidth="1"
          />
          <ellipse
            cx={510}
            cy={175}
            rx={20}
            ry={14}
            fill={C.parkFill}
            stroke={C.parkStroke}
            strokeWidth="1"
          />
          <ellipse
            cx={320}
            cy={310}
            rx={18}
            ry={12}
            fill={C.parkFill}
            stroke={C.parkStroke}
            strokeWidth="1"
          />

          {/* ── Satellite overlay ─────────────────────── */}
          {sat && (
            <image
              href="https://images.unsplash.com/photo-1708067077797-74f83eaa8231?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
              x={0}
              y={0}
              width="100%"
              height="100%"
              opacity={0.45}
              filter="url(#satFilter)"
              preserveAspectRatio="none"
              clipPathUnits="objectBoundingBox"
            />
          )}

          {/* ── Water bodies ──────────────────────────── */}
          {/* Ulsoor Lake */}
          <polygon
            points="488,326 514,316 542,328 547,356 530,372 498,369 478,356"
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />
          <text
            x="510"
            y="345"
            textAnchor="middle"
            fontSize="9"
            fill={darkMode ? "#5a9ac0" : "#4a7a90"}
            fontStyle="italic"
          >
            Ulsoor Lake
          </text>

          {/* Bellandur Lake */}
          <polygon
            points="605,428 682,418 732,438 738,492 700,512 640,502 598,472"
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />
          <text
            x="668"
            y="468"
            textAnchor="middle"
            fontSize="9"
            fill={darkMode ? "#5a9ac0" : "#4a7a90"}
            fontStyle="italic"
          >
            Bellandur Lake
          </text>

          {/* Varthur Lake */}
          <polygon
            points="778,428 842,422 862,448 856,476 820,482 782,462"
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />
          <text
            x="820"
            y="452"
            textAnchor="middle"
            fontSize="8"
            fill={darkMode ? "#5a9ac0" : "#4a7a90"}
            fontStyle="italic"
          >
            Varthur Lake
          </text>

          {/* Sankey Tank */}
          <polygon
            points="348,242 390,237 402,258 386,280 352,282 338,260"
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />
          <text
            x="370"
            y="263"
            textAnchor="middle"
            fontSize="8"
            fill={darkMode ? "#5a9ac0" : "#4a7a90"}
            fontStyle="italic"
          >
            Sankey Tank
          </text>

          {/* Hebbal Lake */}
          <polygon
            points="402,138 432,132 444,148 438,172 412,177 398,160"
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />

          {/* Agara Lake (HSR) */}
          <ellipse
            cx={562}
            cy={522}
            rx={22}
            ry={14}
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />

          {/* Lalbagh tank */}
          <ellipse
            cx={392}
            cy={418}
            rx={18}
            ry={12}
            fill={C.waterFill}
            stroke={C.waterStroke}
            strokeWidth="1.5"
          />

          {/* ── Road network ────────────────��─────────── */}
          {/* Outer Ring Road – main defining road (background stroke wider) */}
          <path
            d="M 422,182 C 455,162 510,148 558,152 C 622,158 672,198 702,264 C 730,320 740,362 718,398 C 700,426 680,480 580,514 L 496,516 C 420,518 360,512 338,510 C 282,502 230,454 180,358 C 165,308 172,252 212,200 C 258,165 350,164 422,182 Z"
            fill="none"
            stroke={darkMode ? "#2a4050" : "#b0aca0"}
            strokeWidth="14"
            strokeLinejoin="round"
          />
          <path
            d="M 422,182 C 455,162 510,148 558,152 C 622,158 672,198 702,264 C 730,320 740,362 718,398 C 700,426 680,480 580,514 L 496,516 C 420,518 360,512 338,510 C 282,502 230,454 180,358 C 165,308 172,252 212,200 C 258,165 350,164 422,182 Z"
            fill="none"
            stroke={darkMode ? "#607080" : "#d8d4c8"}
            strokeWidth="8"
            strokeLinejoin="round"
          />

          {/* Inner Ring Road */}
          <path
            d="M 450,268 C 512,252 582,268 622,308 C 648,338 650,378 628,428 C 610,470 568,484 528,488 C 488,490 440,478 412,448 C 382,415 368,374 378,328 C 390,284 418,278 450,268 Z"
            fill="none"
            stroke={darkMode ? "#253545" : "#c4c0b4"}
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path
            d="M 450,268 C 512,252 582,268 622,308 C 648,338 650,378 628,428 C 610,470 568,484 528,488 C 488,490 440,478 412,448 C 382,415 368,374 378,328 C 390,284 418,278 450,268 Z"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* NH 44 – Bellary Road / Airport Road (north) */}
          <path
            d="M 449,352 L 430,268 L 422,182 L 415,90 L 411,0"
            fill="none"
            stroke={darkMode ? "#2a4050" : "#b0aca0"}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 449,352 L 430,268 L 422,182 L 415,90 L 411,0"
            fill="none"
            stroke={darkMode ? "#607080" : "#d8d4c8"}
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Hosur Road (south) */}
          <path
            d="M 449,352 L 452,432 L 456,516 L 458,650 L 460,700"
            fill="none"
            stroke={darkMode ? "#2a4050" : "#b0aca0"}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 449,352 L 452,432 L 456,516 L 458,650 L 460,700"
            fill="none"
            stroke={darkMode ? "#607080" : "#d8d4c8"}
            strokeWidth="7"
            strokeLinecap="round"
          />

          {/* Old Madras Road (northeast) */}
          <path
            d="M 449,352 C 530,340 620,308 702,264 C 780,228 862,198 950,178"
            fill="none"
            stroke={darkMode ? "#2a4050" : "#b0aca0"}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 449,352 C 530,340 620,308 702,264 C 780,228 862,198 950,178"
            fill="none"
            stroke={darkMode ? "#607080" : "#d8d4c8"}
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Whitefield Road (east of ORR) */}
          <path
            d="M 718,398 C 760,390 820,376 870,360 C 920,344 968,320 1000,308"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 718,398 C 760,390 820,376 870,360 C 920,344 968,320 1000,308"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Tumkur Road (northwest) */}
          <path
            d="M 449,352 C 382,318 312,272 248,232 C 188,196 128,152 60,112"
            fill="none"
            stroke={darkMode ? "#2a4050" : "#b0aca0"}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 449,352 C 382,318 312,272 248,232 C 188,196 128,152 60,112"
            fill="none"
            stroke={darkMode ? "#607080" : "#d8d4c8"}
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Mysore Road (west) */}
          <path
            d="M 449,352 C 360,364 268,382 180,400 C 120,412 60,424 0,440"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 449,352 C 360,364 268,382 180,400 C 120,412 60,424 0,440"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Sarjapur Road (SE) */}
          <path
            d="M 580,514 C 600,558 622,608 648,660 C 670,700 690,700 710,700"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 580,514 C 600,558 622,608 648,660 C 670,700 690,700 710,700"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Bannerghatta Road (SSW) */}
          <path
            d="M 449,352 C 450,418 452,488 454,562 C 455,620 455,680 454,700"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 449,352 C 450,418 452,488 454,562 C 455,620 455,680 454,700"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* MG Road (central east-west) */}
          <path
            d="M 348,350 L 560,344"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 348,350 L 560,344"
            fill="none"
            stroke={darkMode ? "#506070" : "#e8e4d8"}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* 100 Feet Road Indiranagar */}
          <path
            d="M 524,308 L 550,400 L 548,452"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 524,308 L 550,400 L 548,452"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* HSR – Koramangala Road */}
          <path
            d="M 508,478 L 546,364"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 508,478 L 546,364"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Marathahalli-KR Puram connector */}
          <path
            d="M 716,396 C 710,350 706,306 700,264"
            fill="none"
            stroke={darkMode ? "#253545" : "#c8c4b8"}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 716,396 C 710,350 706,306 700,264"
            fill="none"
            stroke={darkMode ? "#4a6070" : "#e0dcd0"}
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* ── Ward boundaries ───────────────────────── */}
          <g opacity={0.9}>
            {WARD_POLYS.map((w) => (
              <g key={w.id}>
                <polygon
                  points={w.pts}
                  fill={C.wardFill}
                  stroke={C.wardStroke}
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />
              </g>
            ))}
          </g>

          {/* Ward labels */}
          {WARD_POLYS.map((w) => (
            <text
              key={w.id + "-lbl"}
              x={w.lx}
              y={w.ly}
              textAnchor="middle"
              fontSize="9.5"
              fill={C.label}
              fontFamily="sans-serif"
              letterSpacing="0.5"
            >
              {w.name.toUpperCase()}
            </text>
          ))}

          {/* Landmark labels */}
          {[
            { x: 449, y: 340, label: "MG Road" },
            { x: 420, y: 162, label: "Hebbal" },
            { x: 700, y: 248, label: "KR Puram" },
            { x: 212, y: 185, label: "Peenya" },
            { x: 340, y: 268, label: "Malleshwaram" },
          ].map((lm) => (
            <text
              key={lm.label}
              x={lm.x}
              y={lm.y}
              textAnchor="middle"
              fontSize="8"
              fill={C.label}
              fontFamily="sans-serif"
              opacity={0.8}
            >
              {lm.label}
            </text>
          ))}

          {/* ── Heatmap overlay ───────────────────────── */}
          {layers.heatmap && (
            <g opacity={0.75}>
              {filteredSites.map((s) => {
                const r =
                  s.severity === "high"
                    ? 85
                    : s.severity === "medium"
                      ? 65
                      : 42;
                return (
                  <circle
                    key={s.id}
                    cx={toX(s.lng)}
                    cy={toY(s.lat)}
                    r={r}
                    fill={`url(#heat-${s.id})`}
                  />
                );
              })}
            </g>
          )}

          {/* ── Prediction / Risk Zones ───────────────── */}
          {layers.prediction && (
            <g>
              {RISK_ZONES.map((z) => (
                <g key={z.id}>
                  <ellipse
                    cx={toX(z.lng)}
                    cy={toY(z.lat)}
                    rx={z.rx}
                    ry={z.ry}
                    fill="rgba(139,92,246,0.12)"
                    stroke="#8b5cf6"
                    strokeWidth="2"
                    strokeDasharray="8,5"
                  />
                  <text
                    x={toX(z.lng)}
                    y={toY(z.lat) - z.ry - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fill="#8b5cf6"
                    fontFamily="sans-serif"
                  >
                    {z.label}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* ── Truck Routes ──────────────────────────── */}
          {layers.trucks && (
            <g>
              {/* Route T1 */}
              {(() => {
                const r1 = truckRoutes[0].route;
                const pts1 = r1
                  .map((p) => `${toX(p.lng)},${toY(p.lat)}`)
                  .join(" L ");
                const tp1 = interpRoute(r1, truckT);
                return (
                  <g>
                    <polyline
                      points={r1
                        .map(
                          (p) => `${toX(p.lng)},${toY(p.lat)}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#2d7738"
                      strokeWidth="3"
                      strokeOpacity="0.6"
                      strokeDasharray="10,6"
                    />
                    {/* Truck icon (circle with T label) */}
                    <circle
                      cx={tp1.x}
                      cy={tp1.y}
                      r={12}
                      fill="#2d7738"
                    />
                    <text
                      x={tp1.x}
                      y={tp1.y + 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill="white"
                      fontFamily="sans-serif"
                    >
                      T1
                    </text>
                    {/* Waypoint dots */}
                    {r1.map((p, i) => (
                      <circle
                        key={i}
                        cx={toX(p.lng)}
                        cy={toY(p.lat)}
                        r={5}
                        fill={
                          p.type === "pickup"
                            ? "#22c55e"
                            : "#3b82f6"
                        }
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })()}

              {/* Route T2 */}
              {(() => {
                const r2 = truckRoutes[1].route;
                const t2offset = (truckT + 0.3) % 1;
                const tp2 = interpRoute(r2, t2offset);
                return (
                  <g>
                    <polyline
                      points={r2
                        .map(
                          (p) => `${toX(p.lng)},${toY(p.lat)}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="3"
                      strokeOpacity="0.6"
                      strokeDasharray="10,6"
                    />
                    <circle
                      cx={tp2.x}
                      cy={tp2.y}
                      r={12}
                      fill="#7c3aed"
                    />
                    <text
                      x={tp2.x}
                      y={tp2.y + 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill="white"
                      fontFamily="sans-serif"
                    >
                      T2
                    </text>
                    {r2.map((p, i) => (
                      <circle
                        key={i}
                        cx={toX(p.lng)}
                        cy={toY(p.lat)}
                        r={5}
                        fill={
                          p.type === "pickup"
                            ? "#22c55e"
                            : "#3b82f6"
                        }
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })()}
            </g>
          )}

          {/* ── CCTV Cameras ──────────────────────────── */}
          {layers.cctv && (
            <g>
              {CCTV.map((c) => (
                <g key={c.id}>
                  <circle
                    cx={toX(c.lng)}
                    cy={toY(c.lat)}
                    r={8}
                    fill="#06b6d4"
                    opacity={0.85}
                  />
                  <rect
                    x={toX(c.lng) - 3}
                    y={toY(c.lat) - 3}
                    width={6}
                    height={5}
                    fill="white"
                    rx={1}
                  />
                  <text
                    x={toX(c.lng)}
                    y={toY(c.lat) + 17}
                    textAnchor="middle"
                    fontSize="7.5"
                    fill="#06b6d4"
                    fontFamily="sans-serif"
                  >
                    {c.label}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* ── Dump site markers ─────────────────────── */}
          {filteredSites.map((site) => {
            const cx = toX(site.lng);
            const cy = toY(site.lat);
            const r = SEVERITY_R[site.severity];
            const markerColor =
              site.status === "detected"
                ? "#dc2626"
                : site.status === "pending"
                  ? "#f59e0b"
                  : "#16a34a";
            const isSelected = selectedSite?.id === site.id;

            return (
              <g
                key={site.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSite(isSelected ? null : site);
                }}
                style={{ cursor: "pointer" }}
              >
                {/* Pulsing ring for high severity */}
                {site.severity === "high" &&
                  site.status !== "cleaned" && (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 14}
                        fill={markerColor}
                        opacity={0.15}
                      >
                        <animate
                          attributeName="r"
                          values={`${r + 10};${r + 22};${r + 10}`}
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.18;0.05;0.18"
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={r + 6}
                        fill={markerColor}
                        opacity={0.28}
                      >
                        <animate
                          attributeName="r"
                          values={`${r + 4};${r + 14};${r + 4}`}
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.32;0.08;0.32"
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </>
                  )}
                {/* Selected ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 8}
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    opacity={0.9}
                  />
                )}
                {/* Main marker */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={markerColor}
                  stroke="white"
                  strokeWidth="2"
                  opacity={0.92}
                />
                {/* Icon */}
                {site.status === "detected" && (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fontSize={r * 0.9}
                    fill="white"
                  >
                    !
                  </text>
                )}
                {site.status === "pending" && (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fontSize={r * 0.85}
                    fill="white"
                  >
                    ?
                  </text>
                )}
                {site.status === "cleaned" && (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fontSize={r * 0.85}
                    fill="white"
                  >
                    ✓
                  </text>
                )}
                {/* Ward label */}
                <text
                  x={cx}
                  y={cy + r + 12}
                  textAnchor="middle"
                  fontSize="9"
                  fill={markerColor}
                  fontFamily="sans-serif"
                >
                  {site.ward}
                </text>
              </g>
            );
          })}

          {/* ── Report click marker ───────────────────── */}
          {reportClick && !reportSubmitted && (
            <g>
              <circle
                cx={reportClick.x}
                cy={reportClick.y}
                r={18}
                fill="#dc2626"
                opacity={0.2}
              >
                <animate
                  attributeName="r"
                  values="14;24;14"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle
                cx={reportClick.x}
                cy={reportClick.y}
                r={8}
                fill="#dc2626"
                stroke="white"
                strokeWidth="2"
              />
              <line
                x1={reportClick.x}
                y1={reportClick.y - 20}
                x2={reportClick.x}
                y2={reportClick.y - 8}
                stroke="#dc2626"
                strokeWidth="2"
              />
              <line
                x1={reportClick.x - 12}
                y1={reportClick.y - 20}
                x2={reportClick.x + 12}
                y2={reportClick.y - 20}
                stroke="#dc2626"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* ── Report Dump Modal ──────────────────────── */}
        <AnimatePresence>
          {reportMode && reportClick && !reportSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-80 rounded-xl shadow-2xl overflow-hidden"
              style={{
                background: C.panel,
                border: `1px solid ${C.panelBorder}`,
              }}
            >
              <div className="bg-red-600 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    Report Waste Dump
                  </span>
                </div>
                <button
                  onClick={() => {
                    setReportClick(null);
                    setReportMode(false);
                  }}
                  className="text-white opacity-80 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div
                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md"
                  style={{
                    background: `${C.red}15`,
                    color: C.red,
                  }}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>
                    Location captured at map coordinates
                  </span>
                </div>
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: C.textMuted }}
                  >
                    Waste Type
                  </label>
                  <select
                    className="w-full text-xs rounded-md px-2 py-1.5 border"
                    style={{
                      background: C.panel,
                      borderColor: C.panelBorder,
                      color: C.text,
                    }}
                  >
                    <option>Mixed Waste</option>
                    <option>Construction Debris</option>
                    <option>Organic Waste</option>
                    <option>Hazardous Waste</option>
                  </select>
                </div>
                <div>
                  <label
                    className="text-xs mb-1 block"
                    style={{ color: C.textMuted }}
                  >
                    Upload Photo
                  </label>
                  <div
                    className="border-2 border-dashed rounded-lg p-3 text-center text-xs"
                    style={{
                      borderColor: C.panelBorder,
                      color: C.textMuted,
                    }}
                  >
                    📷 Click to upload photo
                  </div>
                </div>
                <Button
                  className="w-full text-sm"
                  style={{ background: "#dc2626" }}
                  onClick={() => {
                    setReportSubmitted(true);
                    setReportMode(false);
                    setTimeout(() => {
                      setReportClick(null);
                      setReportSubmitted(false);
                    }, 3000);
                  }}
                >
                  Submit Report
                </Button>
              </div>
            </motion.div>
          )}
          {reportSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl shadow-xl flex items-center gap-3"
              style={{ background: "#16a34a" }}
            >
              <CheckCircle className="h-5 w-5 text-white" />
              <span className="text-white text-sm font-medium">
                Report submitted! AI verification in progress.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Officer Command Panel (right floating) ──── */}
        <div className="absolute top-16 right-3 z-30 flex items-start gap-1">
          <button
            onClick={() => setOfficerOpen((v) => !v)}
            className="mt-1 p-1.5 rounded-lg shadow-md"
            style={{
              background: C.panel,
              border: `1px solid ${C.panelBorder}`,
              color: C.textMuted,
            }}
          >
            {officerOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          <AnimatePresence initial={false}>
            {officerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 256, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div
                  className="w-64 rounded-xl shadow-2xl overflow-hidden"
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.panelBorder}`,
                  }}
                >
                  {/* Panel header */}
                  <div
                    className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: C.accent }}
                  >
                    <div className="flex items-center gap-2 text-white">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        Command Center
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                      </span>
                      <span className="text-xs text-green-200">
                        LIVE
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Quick stats row */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        {
                          label: "Active",
                          val: dumpSites.filter(
                            (s) => s.status !== "cleaned",
                          ).length,
                          col: C.red,
                        },
                        {
                          label: "Trucks",
                          val: truckRoutes.length,
                          col: "#2d7738",
                        },
                        {
                          label: "CCTV",
                          val: CCTV.length,
                          col: "#06b6d4",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="text-center p-1.5 rounded-lg"
                          style={{
                            background: darkMode
                              ? "#1a2e3c"
                              : "#f8f8f6",
                          }}
                        >
                          <div
                            className="text-lg font-bold"
                            style={{ color: s.col }}
                          >
                            {s.val}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: C.textMuted }}
                          >
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Priority alerts */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bell className="h-3.5 w-3.5 text-red-500" />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: C.text }}
                        >
                          Priority Alerts
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {priorityAlerts.map((site) => {
                          const slaMs = getSLAMs(site, now);
                          const slaStatus = getSLAStatus(
                            site,
                            now,
                          );
                          const slaColor =
                            slaStatus === "overdue"
                              ? C.red
                              : slaStatus === "critical"
                                ? C.yellow
                                : C.green;
                          return (
                            <div
                              key={site.id}
                              className="p-2 rounded-lg cursor-pointer transition-all"
                              style={{
                                background: darkMode
                                  ? "#1a2e3c"
                                  : "#f8f8f6",
                                border: `1px solid ${selectedSite?.id === site.id ? C.accent : C.panelBorder}`,
                              }}
                              onClick={() =>
                                setSelectedSite(site)
                              }
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span
                                  className="text-xs font-semibold"
                                  style={{ color: C.text }}
                                >
                                  {site.ward}
                                </span>
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background:
                                      site.severity === "high"
                                        ? "#dc262620"
                                        : "#f59e0b20",
                                    color:
                                      site.severity === "high"
                                        ? C.red
                                        : C.yellow,
                                  }}
                                >
                                  {site.severity}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <Clock
                                    className="h-3 w-3"
                                    style={{ color: slaColor }}
                                  />
                                  <span
                                    className="text-xs font-mono"
                                    style={{ color: slaColor }}
                                  >
                                    {slaStatus === "overdue"
                                      ? "OVERDUE"
                                      : formatCountdown(slaMs)}
                                  </span>
                                </div>
                                <span
                                  className="text-xs"
                                  style={{ color: C.textMuted }}
                                >
                                  #{site.priorityScore}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="space-y-1.5">
                      <Button
                        className="w-full text-xs h-8 gap-2"
                        style={{ background: C.accent }}
                        onClick={() =>
                          selectedSite &&
                          alert(
                            `Truck dispatched to ${selectedSite.ward}`,
                          )
                        }
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Assign Nearest Truck
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-xs h-8 gap-2"
                        style={{
                          borderColor: C.panelBorder,
                          color: C.text,
                        }}
                        onClick={() =>
                          alert("Calling Ward Officer...")
                        }
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call Ward Officer
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-xs h-8 gap-2"
                        style={{
                          borderColor: C.panelBorder,
                          color: C.text,
                        }}
                      >
                        <Radio className="h-3.5 w-3.5" />
                        Broadcast Alert
                      </Button>
                    </div>

                    {/* Satellite scan info */}
                    <div
                      className="px-2 py-2 rounded-lg text-xs"
                      style={{
                        background: darkMode
                          ? "#1a2e3c"
                          : "#f0fdf4",
                        color: darkMode ? "#6a9a8a" : "#166534",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="h-3 w-3" />
                        <span className="font-semibold">
                          AI Detection Active
                        </span>
                      </div>
                      <div style={{ color: C.textMuted }}>
                        Next scan: 14:30 IST · 94.5% accuracy
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Selected Site Popup ───────────────────────── */}
        <AnimatePresence>
          {selectedSite && (
            <motion.div
              key={selectedSite.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 z-30 w-80 rounded-xl shadow-2xl overflow-hidden"
              style={{
                background: C.panel,
                border: `1px solid ${C.panelBorder}`,
              }}
            >
              {/* Popup header */}
              <div
                className="px-4 py-2.5 flex items-center justify-between"
                style={{
                  background:
                    selectedSite.status === "detected"
                      ? "#dc2626"
                      : selectedSite.status === "pending"
                        ? "#d97706"
                        : "#16a34a",
                }}
              >
                <div className="text-white">
                  <div className="text-sm font-bold">
                    {selectedSite.ward}
                  </div>
                  <div className="text-xs opacity-80">
                    Site ID: {selectedSite.id} · Priority Score:{" "}
                    {selectedSite.priorityScore}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  className="text-white opacity-80 hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background:
                        selectedSite.severity === "high"
                          ? "#dc262620"
                          : selectedSite.severity === "medium"
                            ? "#f59e0b20"
                            : "#16a34a20",
                      color:
                        selectedSite.severity === "high"
                          ? C.red
                          : selectedSite.severity === "medium"
                            ? C.yellow
                            : C.green,
                    }}
                  >
                    {selectedSite.severity.toUpperCase()}{" "}
                    SEVERITY
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: `${C.accent}20`,
                      color: C.accent,
                    }}
                  >
                    {selectedSite.status.toUpperCase()}
                  </span>
                </div>

                {/* Description */}
                <p
                  className="text-xs"
                  style={{ color: C.textMuted }}
                >
                  {selectedSite.description}
                </p>

                {/* Images */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p
                      className="text-xs mb-1"
                      style={{ color: C.textMuted }}
                    >
                      🛰 Satellite View
                    </p>
                    <img
                      src={selectedSite.satelliteImage}
                      alt="Satellite"
                      className="w-full h-20 object-cover rounded-lg"
                    />
                  </div>
                  {selectedSite.citizenPhoto && (
                    <div>
                      <p
                        className="text-xs mb-1"
                        style={{ color: C.textMuted }}
                      >
                        📷 Citizen Photo
                      </p>
                      <img
                        src={selectedSite.citizenPhoto}
                        alt="Citizen"
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Timeline / SLA */}
                {selectedSite.status !== "cleaned" && (
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: darkMode
                        ? "#1a2e3c"
                        : "#fef9f0",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock
                          className="h-3.5 w-3.5"
                          style={{
                            color:
                              getSLAStatus(
                                selectedSite,
                                now,
                              ) === "overdue"
                                ? C.red
                                : C.yellow,
                          }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: C.text }}
                        >
                          SLA Countdown
                        </span>
                      </div>
                      <span
                        className="text-xs font-mono font-bold"
                        style={{
                          color:
                            getSLAStatus(selectedSite, now) ===
                            "overdue"
                              ? C.red
                              : getSLAStatus(
                                    selectedSite,
                                    now,
                                  ) === "critical"
                                ? C.yellow
                                : C.green,
                        }}
                      >
                        {formatCountdown(
                          getSLAMs(selectedSite, now),
                        )}
                      </span>
                    </div>
                    <p
                      className="text-xs mt-1"
                      style={{ color: C.textMuted }}
                    >
                      SLA: {getSLAHours(selectedSite)}h ·
                      Reported{" "}
                      {new Date(
                        selectedSite.reportedDate,
                      ).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}

                {/* Dates */}
                <div
                  className="space-y-1 text-xs"
                  style={{ color: C.textMuted }}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Reported:{" "}
                      {new Date(
                        selectedSite.reportedDate,
                      ).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {selectedSite.cleanedDate && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      <span>
                        Cleaned:{" "}
                        {new Date(
                          selectedSite.cleanedDate,
                        ).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                  {selectedSite.assignedTruck && (
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5" />
                      <span>
                        Truck: {selectedSite.assignedTruck}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedSite.status !== "cleaned" && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 text-xs h-8 gap-1"
                      style={{ background: C.accent }}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Assign Truck
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-8 gap-1"
                      style={{
                        borderColor: C.panelBorder,
                        color: C.text,
                      }}
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Call Officer
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-8 px-2"
                      style={{
                        borderColor: C.panelBorder,
                        color: C.green,
                      }}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map scale reference */}
        <div
          className="absolute bottom-4 right-3 flex items-center gap-1 text-xs"
          style={{ color: C.textMuted }}
        >
          <div
            className="w-16 h-0.5"
            style={{ background: C.textMuted }}
          ></div>
          <span>~5 km</span>
        </div>
      </div>
    </div>
  );
}