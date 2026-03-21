"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
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
  Loader2,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type DumpSite, type TruckRoute } from "../data/mockData";
import { Button } from "./ui/button";

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SEVERITY_R = { high: 24, medium: 18, low: 12 };

export interface GeocodeResult {
  display_name: string;
  lat: number;
  lng: number;
}

export function MapDashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.GeoJSON | null>(null);
  
  // State
  const [liveDumps, setLiveDumps] = useState<DumpSite[]>([]);
  const [liveTrucks, setLiveTrucks] = useState<TruckRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [officerOpen, setOfficerOpen] = useState(true);
  const [selectedSite, setSelectedSite] = useState<DumpSite | null>(null);
  const [reportMode, setReportMode] = useState(false);
  const [reportClick, setReportClick] = useState<{ x: number; y: number } | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Routing State
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState<GeocodeResult[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeocodeResult[]>([]);
  const [sourcePoint, setSourcePoint] = useState<GeocodeResult | null>(null);
  const [destPoint, setDestPoint] = useState<GeocodeResult | null>(null);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [layers, setLayers] = useState({
    zones: true,
    cctv: true,
    prediction: false,
  });

  const [sat, setSat] = useState(false);

  // Theme Constants
  const C = {
    bg: darkMode ? "#0a1622" : "#f0f2f5",
    panel: darkMode ? "#0f1e28" : "#ffffff",
    panelBorder: darkMode ? "#253545" : "#e5e7eb",
    text: darkMode ? "#e2eaf0" : "#1a2530",
    textMuted: darkMode ? "#6a8a9a" : "#6b7280",
    accent: "#2d7738",
    green: darkMode ? "#4ade80" : "#16a34a",
    red: darkMode ? "#f87171" : "#dc2626",
    yellow: darkMode ? "#fbbf24" : "#d97706",
  };

  const [dumpPolygons, setDumpPolygons] = useState<any>(null);
  const [wasteProcessingUnits, setWasteProcessingUnits] = useState<any>(null);
  const [dryWasteCentres, setDryWasteCentres] = useState<any>(null);

  // --- Initial Data Fetch ---
  useEffect(() => {
    async function fetchData() {
      try {
        const [dumpsRes, routesRes, polygonsRes, wpcRes, dwcRes] = await Promise.all([
          fetch("http://localhost:8000/api/dumpsites"),
          fetch("http://localhost:8000/api/routes"),
          fetch("http://localhost:8000/api/dump-polygons"),
          fetch("http://localhost:8000/api/waste-processing-units"),
          fetch("http://localhost:8000/api/dry-waste-centres"),
        ]);

        const dumpsGeoJson = dumpsRes.ok ? await dumpsRes.json() : { features: [] };
        const routesGeoJson = routesRes.ok ? await routesRes.json() : { features: [] };
        if (polygonsRes.ok) setDumpPolygons(await polygonsRes.json());
        if (wpcRes.ok) setWasteProcessingUnits(await wpcRes.json());
        if (dwcRes.ok) setDryWasteCentres(await dwcRes.json());

        // Map GeoJSON to our flat types
        const sites: DumpSite[] = (dumpsGeoJson.features || []).map((f: any) => {
          const coords = f.geometry?.coordinates;
          // geometry may be Point or MultiPolygon (for AI-detected sites)
          const isPoint = f.geometry?.type === "Point";
          return {
            ...f.properties,
            lat: isPoint ? coords[1] : f.properties.lat,
            lng: isPoint ? coords[0] : f.properties.lng,
          };
        });

        const trucks: TruckRoute[] = (routesGeoJson.features || []).map((f: any) => ({
          id: f.properties.id,
          driverName: f.properties.driverName,
          vehicleNumber: f.properties.vehicleNumber,
          currentLocation: {
            lat: f.geometry.coordinates[0][1],
            lng: f.geometry.coordinates[0][0],
          },
          route: f.geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] })),
          progress: f.properties.progress,
          stops: []
        }));

        console.log("trucks loaded:", trucks.length, trucks);
        setLiveDumps(sites);
        setLiveTrucks(trucks);
        setIsError(false);
      } catch (e) {
        console.error("Fetch failed", e);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // --- Map Initialization ---
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([12.9716, 77.5946], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update Tile Layer for Dark Mode / Satellite
  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        layer.remove();
      }
    });

    let url = darkMode 
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    
    if (sat) {
      url = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
    }
      
    L.tileLayer(url, {
      attribution: sat ? 'Tiles &copy; Esri' : '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);
  }, [darkMode, sat]);

  // Sync Markers and Overlays
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear everything except Tiles
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Polygon) {
        layer.remove();
      }
    });

    // Add AI-detected dump site polygons — use ref to avoid stacking
    if (polygonLayerRef.current) {
      polygonLayerRef.current.remove();
      polygonLayerRef.current = null;
    }
    if (dumpPolygons?.features) {
      polygonLayerRef.current = L.geoJSON(dumpPolygons, {
        style: {
          color: "#dc2626",
          fillColor: "#dc2626",
          fillOpacity: 0.35,
          weight: 2,
        },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(`<b>AI Detected Dump Site</b><br/>ID: ${feature.properties.id}<br/>Confidence: ${feature.properties.confidence}`);
        }
      }).addTo(mapInstance.current!);
    }

    // Add Dump Sites
    if (Array.isArray(liveDumps)) {
      liveDumps.forEach(site => {
        const radius = (SEVERITY_R[site.severity as keyof typeof SEVERITY_R] || 10) / 2;
        const color = site.status === "detected" ? "#dc2626" : site.status === "pending" ? "#f59e0b" : "#16a34a";
        
        const marker = L.circleMarker([site.lat, site.lng], {
          radius,
          fillColor: color,
          fillOpacity: 0.8,
          color: "#fff",
          weight: 2
        }).addTo(mapInstance.current!);
        
        marker.bindTooltip(`<b>${site.ward}</b><br/>${site.description}`);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedSite(site);
        });
      });
    }

    // Waste Processing Units — purple squares
    if (wasteProcessingUnits?.features) {
      wasteProcessingUnits.features.forEach((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#7c3aed;width:14px;height:14px;border:2px solid white;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,0.4)" title="Waste Processing Unit"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          })
        }).addTo(mapInstance.current!).bindTooltip('Waste Processing Unit');
      });
    }

    // Dry Waste Collection Centres — orange diamonds
    if (dryWasteCentres?.features) {
      dryWasteCentres.features.forEach((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        L.marker([lat, lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="background:#f97316;width:12px;height:12px;border:2px solid white;border-radius:2px;transform:rotate(45deg);box-shadow:0 1px 3px rgba(0,0,0,0.4)" title="Dry Waste Centre"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })
        }).addTo(mapInstance.current!).bindTooltip('Dry Waste Collection Centre');
      });
    }

    // Add Trucks
    if (Array.isArray(liveTrucks)) {
      liveTrucks.forEach(truck => {
        const icon = L.divIcon({
          className: 'truck-icon',
          html: `<div style="background-color: ${truck.id === 'T1' ? '#2d7738' : '#7c3aed'}; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${truck.id}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        L.marker([truck.currentLocation.lat, truck.currentLocation.lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`Truck ${truck.id}<br/>Driver: ${truck.driverName}`);
          
        if (truck.route) {
          L.polyline(truck.route.map((p: any) => [p.lat, p.lng]), {
            color: truck.id === 'T1' ? '#2d7738' : '#7c3aed',
            dashArray: '10, 5',
            opacity: 0.4,
            weight: 3
          }).addTo(mapInstance.current!);
        }
      });
    }

    // CCTV Layer
    if (layers.cctv) {
      const CCTV_MOCK = [
        { id: 'c1', lat: 12.9780, lng: 77.5910, label: 'MG Road Junction' },
        { id: 'c2', lat: 12.9350, lng: 77.6144, label: 'Koramangala 8th Block' },
      ];
      CCTV_MOCK.forEach(c => {
        L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: 'cctv-icon',
            html: `<div style="background-color: #06b6d4; width: 16px; height: 16px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; border: 1px solid white;">📹</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(mapInstance.current!).bindPopup(c.label);
      });
    }

    // Active Route
    if (activeRoute && activeRoute.geometry) {
      L.polyline(activeRoute.geometry.coordinates.map((c: any) => [c[1], c[0]]), {
        color: '#3b82f6',
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round'
      }).addTo(mapInstance.current!);
    }

    // Source/Dest Markers
    if (sourcePoint) {
      L.marker([sourcePoint.lat, sourcePoint.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(mapInstance.current!).bindPopup(`Source: ${sourcePoint.display_name}`);
    }
    if (destPoint) {
      L.marker([destPoint.lat, destPoint.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(mapInstance.current!).bindPopup(`Destination: ${destPoint.display_name}`);
    }

    // Report Marker
    if (reportClick && reportMode && !reportSubmitted) {
      L.marker([reportClick.y, reportClick.x], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(mapInstance.current!);
    }

  }, [liveDumps, liveTrucks, dumpPolygons, wasteProcessingUnits, dryWasteCentres, layers, activeRoute, sourcePoint, destPoint, reportClick, reportMode, reportSubmitted]);

  // --- Handlers ---
  const handleMapClickInternal = (e: L.LeafletMouseEvent) => {
    if (reportMode) {
      setReportClick({ x: e.latlng.lng, y: e.latlng.lat });
    }
  };

  useEffect(() => {
    if (!mapInstance.current) return;
    mapInstance.current.off('click');
    mapInstance.current.on('click', handleMapClickInternal);
    return () => { mapInstance.current?.off('click'); };
  }, [reportMode]);

  const toggleLayer = (key: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGeocode = async (q: string, type: "source" | "dest") => {
    if (q.length < 3) return;
    try {
      const res = await fetch(`http://localhost:8000/api/geocode?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (type === "source") setSourceSuggestions(data);
        else setDestSuggestions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateRoute = async (s: GeocodeResult, d: GeocodeResult) => {
    try {
      const res = await fetch(`http://localhost:8000/api/route?start_lat=${s.lat}&start_lng=${s.lng}&end_lat=${d.lat}&end_lng=${d.lng}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRoute(data);
        if (mapInstance.current && data.geometry) {
          const bounds = L.geoJSON(data.geometry).getBounds();
          mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOptimizeRoute = async (truckId: string) => {
    setIsOptimizing(true);
    try {
      const truck = liveTrucks.find(t => t.id === truckId);
      if (!truck) return;

      // Use all active (non-cleaned) dump sites as targets, fall back to medium if no high
      const highTargets = liveDumps.filter(d => d.status !== "cleaned" && d.severity === "high");
      const targets = highTargets.length > 0
        ? highTargets
        : liveDumps.filter(d => d.status !== "cleaned");

      if (targets.length === 0) {
        alert("No active dump sites to route through.");
        return;
      }

      const waypoints = [
        { lat: truck.currentLocation.lat, lng: truck.currentLocation.lng },
        ...targets.map(t => ({ lat: t.lat, lng: t.lng }))
      ];

      const res = await fetch(`http://localhost:8000/api/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waypoints, optimize: true })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          console.error("OSRM error:", data.error);
          alert(`Route optimization failed: ${data.error}`);
          return;
        }
        setActiveRoute(data);
        if (mapInstance.current && data.geometry) {
          mapInstance.current.fitBounds(L.geoJSON(data.geometry).getBounds(), { padding: [50, 50] });
        }
      }
    } catch (e) {
      console.error(e);
      alert("Could not reach route optimization service.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const priorityAlerts = [...liveDumps]
    .filter(s => s.status !== "cleaned")
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 3);

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden" style={{ background: C.bg, color: C.text }}>
      {/* ── Left Sidebar ────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-shrink-0 overflow-hidden border-r flex flex-col"
            style={{ background: C.panel, borderColor: C.panelBorder }}
          >
            <div className="p-4 overflow-y-auto flex-1">
              {/* Routing Search */}
              <div className="mb-6 space-y-3">
                 <p className="text-[10px] font-bold uppercase" style={{ color: C.textMuted }}>Map Navigation</p>
                 <div className="space-y-2">
                    <div className="relative">
                       <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                       <input 
                         className="w-full text-xs pl-8 pr-2 py-2 rounded-lg border focus:ring-1 focus:ring-green-500 outline-none"
                         placeholder="Source Location"
                         value={source}
                         onChange={(e) => {
                            setSource(e.target.value);
                            handleGeocode(e.target.value, "source");
                         }}
                         style={{ background: darkMode ? "#1a2e3c" : "#fff", borderColor: C.panelBorder, color: C.text }}
                       />
                       {sourceSuggestions.length > 0 && !sourcePoint && (
                          <div className="absolute top-full left-0 right-0 z-[2000] bg-white shadow-xl rounded-b-lg border overflow-hidden">
                             {sourceSuggestions.map(s => (
                               <button 
                                 key={s.display_name} 
                                 className="w-full text-left p-2 text-[10px] hover:bg-gray-100 text-gray-700"
                                 onClick={() => { setSourcePoint(s); setSource(s.display_name); setSourceSuggestions([]); }}
                               >
                                 {s.display_name}
                               </button>
                             ))}
                          </div>
                       )}
                    </div>
                    <div className="relative">
                       <Navigation className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                       <input 
                         className="w-full text-xs pl-8 pr-2 py-1.5 rounded-lg border focus:ring-1 focus:ring-blue-500 outline-none"
                         placeholder="Destination"
                         value={dest}
                         onChange={(e) => {
                            setDest(e.target.value);
                            handleGeocode(e.target.value, "dest");
                         }}
                         style={{ background: darkMode ? "#1a2e3c" : "#fff", borderColor: C.panelBorder, color: C.text }}
                       />
                       {destSuggestions.length > 0 && !destPoint && (
                          <div className="absolute top-full left-0 right-0 z-[2000] bg-white shadow-xl rounded-b-lg border overflow-hidden">
                             {destSuggestions.map(s => (
                               <button 
                                 key={s.display_name} 
                                 className="w-full text-left p-2 text-[10px] hover:bg-gray-100 text-gray-700"
                                 onClick={() => { setDestPoint(s); setDest(s.display_name); setDestSuggestions([]); }}
                               >
                                 {s.display_name}
                               </button>
                             ))}
                          </div>
                       )}
                    </div>
                    {sourcePoint && destPoint && (
                       <Button 
                         onClick={() => handleCalculateRoute(sourcePoint, destPoint)}
                         className="w-full h-8 text-[11px] bg-blue-600 hover:bg-blue-700"
                       >
                         Plan Route
                       </Button>
                    )}
                 </div>
              </div>

              {/* Layer Toggles */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase mb-2" style={{ color: C.textMuted }}>MAP LAYERS</p>
                <div className="space-y-1">
                  {[
                    { key: "zones" as const, label: "BBMP Boundaries", icon: <Layers className="h-3.5 w-3.5" /> },
                    { key: "cctv" as const, label: "CCTV Cameras", icon: <Camera className="h-3.5 w-3.5" /> },
                    { key: "prediction" as const, label: "Risk Zones", icon: <Shield className="h-3.5 w-3.5" /> },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => toggleLayer(key)}
                      className="flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-colors text-xs"
                      style={{ background: layers[key] ? `${C.accent}22` : "transparent", color: layers[key] ? C.accent : C.textMuted }}
                    >
                      <div className="flex items-center gap-2">{icon} <span>{label}</span></div>
                      {layers[key] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </button>
                  ))}
                  <button
                    onClick={() => setSat((v) => !v)}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-colors text-xs"
                    style={{ background: sat ? `${C.accent}22` : "transparent", color: sat ? C.accent : C.textMuted }}
                  >
                    <div className="flex items-center gap-2"><Layers className="h-3.5 w-3.5" /> <span>Satellite View</span></div>
                    {sat ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Truck Controls */}
              <div className="border rounded-lg p-3 mb-4" style={{ borderColor: C.panelBorder }}>
                <p className="text-xs font-semibold mb-3" style={{ color: C.textMuted }}>TRUCK OPERATIONS</p>
                <div className="space-y-2">
                  {liveTrucks.map(truck => (
                    <Button
                      key={truck.id}
                      onClick={() => handleOptimizeRoute(truck.id)}
                      disabled={isOptimizing}
                      variant="outline"
                      className="w-full justify-start text-xs h-9 gap-2"
                    >
                      {isOptimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5 text-blue-500" />}
                      <span>Optimize {truck.id} Route</span>
                    </Button>
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
          className="absolute top-3 left-3 z-[1000] p-1.5 rounded-md shadow-md"
          style={{ background: C.panel, border: `1px solid ${C.panelBorder}`, color: C.textMuted }}
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Top map toolbar */}
        <div className="absolute top-3 left-12 right-3 z-[1000] flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-md text-xs bg-white/90 border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="font-semibold">LIVE</span>
            <span className="text-gray-400">|</span>
            <span className="font-medium text-gray-700">Bengaluru Waste Monitor</span>
          </div>

          <button
            onClick={() => { setReportMode((v) => !v); setReportClick(null); setReportSubmitted(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shadow-md text-xs font-semibold transition-all ${reportMode ? "bg-red-600 text-white" : "bg-white text-gray-700"}`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {reportMode ? "Click Map to Report" : "Report Dump"}
          </button>

          <button onClick={() => setDarkMode((v) => !v)} className="p-1.5 rounded-lg shadow-md bg-white text-gray-600">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          
          <button onClick={() => window.location.reload()} className="p-1.5 rounded-lg shadow-md bg-white text-gray-600">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Vanilla Map Container */}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} className="z-10" />

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#2d7738]" />
              <p className="font-semibold text-gray-700">Connecting to Backend...</p>
            </div>
          </div>
        )}

        {/* ── Report Dump Modal ──────────────────────── */}
        <AnimatePresence>
          {reportMode && reportClick && !reportSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[2000] w-80 rounded-xl shadow-2xl overflow-hidden bg-white border"
            >
              <div className="bg-red-600 px-4 py-2 flex items-center justify-between text-white">
                <span className="text-sm font-semibold">Report Waste Dump</span>
                <button onClick={() => { setReportClick(null); setReportMode(false); }} className="opacity-80"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[10px] text-red-600 bg-red-50 p-1.5 rounded">Location captured at map coordinates</p>
                <Button 
                  className="w-full text-sm bg-red-600" 
                  onClick={() => { setReportSubmitted(true); setReportMode(false); setTimeout(() => { setReportClick(null); setReportSubmitted(false); }, 3000); }}
                >
                  Submit Report
                </Button>
              </div>
            </motion.div>
          )}
          {reportSubmitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 bg-green-600 text-white"
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Report submitted! AI verification in progress.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Officer Command Panel ──── */}
        <div className="absolute top-16 right-3 z-[1000] flex items-start gap-1">
          <button onClick={() => setOfficerOpen((v) => !v)} className="mt-1 p-1.5 rounded-lg shadow-md bg-white">
            {officerOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          <AnimatePresence>
            {officerOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }} animate={{ width: 256, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="w-64 rounded-xl shadow-2xl overflow-hidden bg-white border">
                  <div className="px-4 py-2.5 bg-[#2d7738] text-white flex items-center justify-between">
                    <span className="text-sm font-semibold">Command Center</span>
                    <span className="text-[10px]">LIVE</span>
                  </div>
                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-1.5">
                       <div className="text-center p-1.5 rounded-lg bg-gray-50 border">
                          <div className="text-lg font-bold text-red-600">{liveDumps.filter(d => d.status !== 'cleaned').length}</div>
                          <div className="text-[10px] text-gray-500">Active</div>
                       </div>
                       <div className="text-center p-1.5 rounded-lg bg-gray-50 border">
                          <div className="text-lg font-bold text-green-600">{liveTrucks.length}</div>
                          <div className="text-[10px] text-gray-500">Trucks</div>
                       </div>
                       <div className="text-center p-1.5 rounded-lg bg-gray-50 border">
                          <div className="text-lg font-bold text-blue-600">2</div>
                          <div className="text-[10px] text-gray-500">CCTV</div>
                       </div>
                    </div>
                    {/* Priority alerts */}
                    <div className="space-y-1.5">
                       {priorityAlerts.map(site => (
                         <div key={site.id} className="p-2 rounded-lg border bg-gray-50 text-[11px] cursor-pointer hover:bg-gray-100" onClick={() => setSelectedSite(site)}>
                            <div className="font-bold flex justify-between">
                               <span>{site.ward}</span>
                               <span className={site.severity === 'high' ? 'text-red-500' : 'text-orange-500'}>{site.severity}</span>
                            </div>
                            <div className="text-[10px] text-gray-500">{site.description}</div>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Site Details */}
        <AnimatePresence>
          {selectedSite && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-4 z-[1000] w-80 rounded-xl shadow-2xl overflow-hidden bg-white border"
            >
              <div className="px-4 py-2.5 bg-gray-800 text-white flex justify-between items-center">
                <span>{selectedSite.ward} - Details</span>
                <button onClick={() => setSelectedSite(null)}><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4 space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase p-1 rounded bg-red-100 text-red-700">{selectedSite.severity} Severity</span>
                    <span className="text-[10px] text-gray-500">Score: {selectedSite.priorityScore}</span>
                 </div>
                 <p className="text-xs text-gray-700">{selectedSite.description}</p>
                 <Button className="w-full bg-[#2d7738] h-8 text-xs" onClick={() => alert("Truck Dispatched!")}>Dispatch Truck</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}