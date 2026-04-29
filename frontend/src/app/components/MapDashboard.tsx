"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
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
import { api } from "../services/api";
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

const WARD_SITE_IMAGES: Record<string, { satelliteImage: string; citizenPhoto?: string }> = {
  Indiranagar: {
    satelliteImage: "/images/indiranagar-satellite.png",
    citizenPhoto: "/images/indiranagar-satellite.png",
  },
  Indiranagara: {
    satelliteImage: "/images/indiranagar-satellite.png",
    citizenPhoto: "/images/indiranagar-satellite.png",
  },
  Marathahalli: {
    satelliteImage: "/images/marathahalli-satellite.png",
    citizenPhoto: "/images/marathahalli-satellite.png",
  },
  Whitefield: {
    satelliteImage: "/images/whitefield-satellite.png",
    citizenPhoto: "/images/whitefield-satellite.png",
  },
  Koramangala: {
    satelliteImage: "/images/koramangala-satellite.png",
    citizenPhoto: "/images/koramangala-satellite.png",
  },
};

const FALLBACK_SITE_IMAGE = "/images/indiranagar-satellite.png";

const formatReportStatus = (status?: string) => {
  if (!status) return "Pending";
  return status
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getReportStatusStyle = (status?: string) => {
  const normalized = (status || "pending").toLowerCase();
  if (["submitted", "pending"].includes(normalized)) {
    return { bg: "#fef3c7", color: "#92400e" };
  }
  if (["assigned", "verified"].includes(normalized)) {
    return { bg: "#dbeafe", color: "#1d4ed8" };
  }
  if (["in-progress", "in progress", "in_progress"].includes(normalized)) {
    return { bg: "#ffedd5", color: "#c2410c" };
  }
  if (["completed", "resolved", "cleaned"].includes(normalized)) {
    return { bg: "#dcfce7", color: "#166534" };
  }
  return { bg: "#e5e7eb", color: "#374151" };
};

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
  const [animatedTruck, setAnimatedTruck] = useState<{lat: number, lng: number, id: string} | null>(null);
  const [truckStatus, setTruckStatus] = useState<string>("Idle");

  const [layers, setLayers] = useState({
    zones: true,
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

  const [searchParams] = useSearchParams();
  const selectedWard = searchParams.get("ward") || "";

  const [dumpPolygons, setDumpPolygons] = useState<any>(null);
  const [wasteProcessingUnits, setWasteProcessingUnits] = useState<any>(null);
  const [dryWasteCentres, setDryWasteCentres] = useState<any>(null);
  const [wardBoundaries, setWardBoundaries] = useState<any>(null);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);

  const activeDumpCount = liveDumps.filter((d) => d.status !== "cleaned").length;
  const polygonDumpCount = dumpPolygons?.features?.length ?? 0;
  const reportCount = citizenReports?.length ?? 0;

  // --- Initial Data Fetch ---
  useEffect(() => {
    async function fetchData() {
      try {
        const [dumpsRes, routesRes, polygonsRes, wpcRes, dwcRes, wardRes, reportsRes] = await Promise.all([
          fetch("http://localhost:8000/api/dumpsites"),
          fetch("http://localhost:8000/api/routes"),
          fetch("http://localhost:8000/api/dump-polygons"),
          fetch("http://localhost:8000/api/waste-processing-units"),
          fetch("http://localhost:8000/api/dry-waste-centres"),
          fetch("http://localhost:8000/api/ward-boundaries"),
          fetch("http://localhost:8000/api/citizen-reports"),
        ]);

        const dumpsGeoJson = dumpsRes.ok ? await dumpsRes.json() : { features: [] };
        const routesGeoJson = routesRes.ok ? await routesRes.json() : { features: [] };
        if (polygonsRes.ok) setDumpPolygons(await polygonsRes.json());
        if (wpcRes.ok) setWasteProcessingUnits(await wpcRes.json());
        if (dwcRes.ok) setDryWasteCentres(await dwcRes.json());
        if (wardRes.ok) setWardBoundaries(await wardRes.json());
        if (reportsRes.ok) {
          const rData = await reportsRes.json();
          console.log("citizen-reports from Firestore:", rData);
          setCitizenReports(rData);
        }

        // Map GeoJSON to our flat types
        const sites: DumpSite[] = (dumpsGeoJson.features || []).map((f: any) => {
          const coords = f.geometry?.coordinates;
          // geometry may be Point or MultiPolygon (for AI-detected sites)
          const isPoint = f.geometry?.type === "Point";
          const ward = f?.properties?.ward || "";
          const wardImages = WARD_SITE_IMAGES[ward] || {};
          return {
            ...f.properties,
            lat: isPoint ? coords[1] : f.properties.lat,
            lng: isPoint ? coords[0] : f.properties.lng,
            satelliteImage: f?.properties?.satelliteImage || wardImages.satelliteImage || FALLBACK_SITE_IMAGE,
            citizenPhoto: f?.properties?.citizenPhoto || wardImages.citizenPhoto,
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

        const popupImage = site.satelliteImage || FALLBACK_SITE_IMAGE;
        marker.bindPopup(`
          <div style="min-width:220px;max-width:240px;font-family:Inter,system-ui,sans-serif;">
            <p style="font-weight:700;font-size:13px;margin:0;color:#111827;">${site.ward || "Dump Site"}</p>
            <p style="font-size:11px;color:#6b7280;margin:2px 0 6px;">${site.description || "No description"}</p>
            <img src="${popupImage}" style="width:100%;height:92px;object-fit:cover;border-radius:8px;display:block;" />
            <div style="margin-top:6px;display:flex;gap:6px;align-items:center;">
              <span style="font-size:10px;padding:2px 7px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:700;">${site.severity?.toUpperCase?.() || "MEDIUM"}</span>
              <span style="font-size:10px;padding:2px 7px;border-radius:999px;background:#e5e7eb;color:#374151;font-weight:700;">${site.status?.toUpperCase?.() || "DETECTED"}</span>
            </div>
          </div>
        `, { maxWidth: 250 });
        
        marker.bindTooltip(`<b>${site.ward}</b><br/>${site.description}`);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          marker.openPopup();
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

    // Add Animated Truck
    if (animatedTruck) {
      const icon = L.divIcon({
        className: 'truck-icon',
        html: `<div style="background-color: #2d7738; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      L.marker([animatedTruck.lat, animatedTruck.lng], { icon })
        .addTo(mapInstance.current!)
        .bindPopup(`Truck ${animatedTruck.id}<br/>Status: ${truckStatus}`);
    }

    // Add Trucks from backend (if any)
    if (Array.isArray(liveTrucks)) {
      liveTrucks.forEach(truck => {
        const icon = L.divIcon({
          className: 'truck-icon',
          html: `<div style="background-color: #7c3aed; width: 26px; height: 26px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${truck.id}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        L.marker([truck.currentLocation.lat, truck.currentLocation.lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`Truck ${truck.id}<br/>Driver: ${truck.driverName}`);
      });
    }

    // CCTV Layer removed

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

    // Ward Boundaries
    const WARD_COLORS: Record<string, string> = {
      "Byrasandra":    "#10b981", // emerald
      "HSR Layout":    "#6366f1", // indigo
      "Indiranagara":  "#f59e0b", // amber
      "JP Nagara":     "#ec4899", // pink
      "Sarakki":       "#14b8a6", // teal
      "Thanisandra":   "#8b5cf6", // violet
      "Whitefield":    "#f97316", // orange
    };
    if (wardBoundaries?.features) {
      wardBoundaries.features.forEach((f: any) => {
        const isSelected = selectedWard && f.properties.name === selectedWard;
        const baseColor = WARD_COLORS[f.properties.name] ?? "#3b82f6";
        const layer = L.geoJSON(f, {
          style: {
            color: baseColor,
            fillColor: baseColor,
            fillOpacity: isSelected ? 0.30 : 0.13,
            weight: isSelected ? 3 : 1.5,
            dashArray: isSelected ? undefined : "6 4",
          }
        }).addTo(mapInstance.current!);
        layer.bindTooltip(
          `<b>${f.properties.name}</b><br/>${f.properties.dumps} dump sites`,
          { sticky: true }
        );
      });

      // Zoom to selected ward
      if (selectedWard) {
        const match = wardBoundaries.features.find((f: any) => f.properties.name === selectedWard);
        if (match) {
          mapInstance.current!.fitBounds(L.geoJSON(match).getBounds(), { padding: [40, 40] });
        }
      }
    }

    // Citizen Reports from Firestore
    if (Array.isArray(citizenReports)) {
      citizenReports.forEach((r: any) => {
        const statusStyle = getReportStatusStyle(r.status);
        const normalizedStatus = (r.status || "pending").toLowerCase();
        const photoThumb = r.photo
          ? `<div style="width:48px;height:48px;border-radius:50%;border:2.5px solid white;background-image:url('${r.photo}');background-size:cover;background-position:center;box-shadow:0 3px 8px rgba(0,0,0,0.4);"></div>`
          : `<div style="background:#0ea5e9;width:36px;height:36px;border-radius:50%;border:2.5px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.4);font-size:16px;">📍</div>`;
        const icon = L.divIcon({
          className: '',
          html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">${photoThumb}<span style="position:absolute;bottom:0px;right:0px;width:14px;height:14px;border-radius:50%;border:2px solid white;background:${normalizedStatus === 'completed' ? '#16a34a' : normalizedStatus.includes('progress') ? '#ea580c' : normalizedStatus === 'assigned' || normalizedStatus === 'verified' ? '#2563eb' : '#d97706'}"></span></div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
        const photoHtml = r.photo
          ? `<img src="${r.photo}" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-top:8px;display:block;" />`
          : `<p style="color:#9ca3af;font-size:11px;margin-top:4px;">No photo</p>`;
        L.marker([r.lat, r.lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="min-width:215px;max-width:230px;font-family:Inter,system-ui,sans-serif;">
              <p style="font-weight:700;font-size:13px;margin:0;color:#111827;">Citizen Report</p>
              <p style="font-size:11px;color:#6b7280;margin:2px 0;">${r.ward || 'Unknown ward'} &bull; ${r.waste_type || 'Unknown'}</p>
              <span style="font-size:10px;padding:3px 8px;background:${statusStyle.bg};color:${statusStyle.color};border-radius:999px;font-weight:700;">${formatReportStatus(r.status)}</span>
              ${photoHtml}
              ${r.description ? `<p style="font-size:11px;margin-top:8px;color:#374151;line-height:1.35;">${r.description}</p>` : ''}
            </div>
          `, { maxWidth: 240 });
      });
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

  }, [liveDumps, liveTrucks, dumpPolygons, wasteProcessingUnits, dryWasteCentres, wardBoundaries, selectedWard, citizenReports, layers, activeRoute, sourcePoint, destPoint, reportClick, reportMode, reportSubmitted]);

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

  const handleDispatchTruck = async () => {
    if (!selectedSite) return;
    
    setIsLoading(true);
    setTruckStatus("Planning Route...");
    try {
      const data = await api.getLogisticsRoute(selectedSite.lat, selectedSite.lng);
      if (data.error) throw new Error(data.error);

      setActiveRoute(data);
      if (mapInstance.current && data.geometry) {
        mapInstance.current.fitBounds(L.geoJSON(data.geometry).getBounds(), { padding: [50, 50] });
      }

      // Start Animation
      const coords = data.geometry.coordinates; // [[lng, lat], ...]
      const truckId = `TRK-${Math.floor(Math.random() * 9000) + 1000}`;
      
      let step = 0;
      const totalSteps = coords.length;
      setTruckStatus("Assigned");

      const animate = () => {
        if (step >= totalSteps) {
          setTruckStatus("Completed");
          // Mark site as cleaned in local state
          setLiveDumps(prev => prev.map(s => s.id === selectedSite.id ? {...s, status: 'cleaned'} : s));
          setTimeout(() => setSelectedSite(null), 3000);
          return;
        }

        const [lng, lat] = coords[step];
        setAnimatedTruck({ lat, lng, id: truckId });
        
        // Dynamic status based on progress
        const progress = (step / totalSteps) * 100;
        if (progress < 30) setTruckStatus("En Route to Dump");
        else if (progress < 60) setTruckStatus("Transporting to Collection Centre");
        else setTruckStatus("Final Leg to Processing Unit");

        step++;
        requestAnimationFrame(() => setTimeout(animate, 50)); // ~20fps for visible movement
      };

      animate();

    } catch (e) {
      console.error(e);
      alert("Dispatch failed: " + (e as Error).message);
    } finally {
      setIsLoading(false);
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
                    { key: "zones" as const, label: "Ward Boundaries", icon: <Layers className="h-3.5 w-3.5" /> },
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
                <p className="text-xs font-semibold mb-3" style={{ color: C.textMuted }}>
                  TRUCK OPERATIONS <span className="ml-1 text-[10px]">({liveTrucks.length} active)</span>
                </p>
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
                <p className="text-[10px] mt-2" style={{ color: C.textMuted }}>
                  Routing prioritizes high-severity active dump sites.
                </p>
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

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-sm text-[11px] bg-white/90 border text-gray-700">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
            <span className="font-semibold">{activeDumpCount} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-sm text-[11px] bg-white/90 border text-gray-700">
            <Radio className="h-3.5 w-3.5 text-sky-600" />
            <span className="font-semibold">{reportCount} Citizen Reports</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-sm text-[11px] bg-white/90 border text-gray-700">
            <Shield className="h-3.5 w-3.5 text-rose-600" />
            <span className="font-semibold">{polygonDumpCount} AI Polygons</span>
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
                            {selectedSite?.id === site.id && truckStatus !== "Idle" && (
                               <div className="mt-1.5 flex items-center gap-2">
                                  <div className="h-1 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                     <div className="h-full bg-green-500 animate-pulse" style={{ width: truckStatus === "Completed" ? "100%" : "50%" }}></div>
                                  </div>
                                  <span className="text-[9px] font-bold text-green-600 uppercase">{truckStatus}</span>
                               </div>
                            )}
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
                  <img
                    src={selectedSite.satelliteImage || FALLBACK_SITE_IMAGE}
                    alt={`${selectedSite.ward} satellite`}
                    className="w-full h-28 rounded-lg object-cover"
                    onError={(e) => {
                     e.currentTarget.src = FALLBACK_SITE_IMAGE;
                    }}
                  />
                 <p className="text-xs text-gray-700">{selectedSite.description}</p>
                                   <Button 
                    className="w-full bg-[#2d7738] h-10 text-xs font-bold transition-all shadow-md active:scale-95" 
                    onClick={handleDispatchTruck}
                    disabled={truckStatus !== "Idle" && truckStatus !== "Completed"}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {truckStatus === "Idle" || truckStatus === "Completed" ? "Dispatch Logistics Truck" : truckStatus}
                  </Button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}