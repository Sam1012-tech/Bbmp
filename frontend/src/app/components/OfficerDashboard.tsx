import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Clock, Truck, CheckCircle2, ArrowUpRight, Filter, Loader2, X, Navigation, MapPin } from "lucide-react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type DumpSite } from "../data/mockData";
import { api } from "../services/api";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const DEFAULT_SITE_IMAGES: Record<string, { satelliteImage: string; citizenPhoto?: string }> = {
  Indiranagar: {
    satelliteImage: "/images/indiranagar-satellite.png",
    citizenPhoto: "/images/indiranagar-satellite.png",
  },
  Marathahalli: {
    satelliteImage: "/images/marathahalli-satellite.png",
    citizenPhoto: "/images/marathahalli-satellite.png",
  },
  Koramangala: {
    satelliteImage: "/images/koramangala-satellite.png",
    citizenPhoto: "/images/koramangala-satellite.png",
  },
  Whitefield: {
    satelliteImage: "/images/whitefield-satellite.png",
    citizenPhoto: "/images/whitefield-satellite.png",
  },
  Yelahanka: {
    satelliteImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop",
  },
  "HSR Layout": {
    satelliteImage: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&auto=format&fit=crop",
  },
  Jayanagar: {
    satelliteImage: "https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?w=1200&auto=format&fit=crop",
  },
  Malleshwaram: {
    satelliteImage: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=1200&auto=format&fit=crop",
  },
};

const FALLBACK_SATELLITE_IMAGE =
  "https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=1200&auto=format&fit=crop";

function getLatLng(feature: any): { lat?: number; lng?: number } {
  const geometry = feature?.geometry;
  const properties = feature?.properties || {};
  const coordinates = geometry?.coordinates;

  if (geometry?.type === "Point" && Array.isArray(coordinates) && coordinates.length >= 2) {
    return { lng: Number(coordinates[0]), lat: Number(coordinates[1]) };
  }

  if (geometry?.type === "Polygon" && Array.isArray(coordinates?.[0]?.[0])) {
    const first = coordinates[0][0];
    return { lng: Number(first[0]), lat: Number(first[1]) };
  }

  if (geometry?.type === "MultiPolygon" && Array.isArray(coordinates?.[0]?.[0]?.[0])) {
    const first = coordinates[0][0][0];
    return { lng: Number(first[0]), lat: Number(first[1]) };
  }

  const lat = properties.lat ?? properties.latitude;
  const lng = properties.lng ?? properties.longitude ?? properties.lon;
  return {
    lat: lat !== undefined ? Number(lat) : undefined,
    lng: lng !== undefined ? Number(lng) : undefined,
  };
}

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export function OfficerDashboard() {
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'severity'>('priority');
  const [selectedAlert, setSelectedAlert] = useState<DumpSite | null>(null);
  const [activeDumps, setActiveDumps] = useState<DumpSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Metrics
  const [assignedToday, setAssignedToday] = useState(8);
  const [completedToday, setCompletedToday] = useState(12);

  // Route & Map State
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [routeAssignedTo, setRouteAssignedTo] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  // Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    source: "",
    destination: "",
    severity: "Medium"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getDumpsites();
        const sites = data.features.map((f: any) => {
          const { lat, lng } = getLatLng(f);
          const ward = f?.properties?.ward || "Unknown Ward";
          const wardImages = DEFAULT_SITE_IMAGES[ward] || {};

          return {
            ...f.properties,
            lat,
            lng,
            satelliteImage: f?.properties?.satelliteImage || wardImages.satelliteImage || FALLBACK_SATELLITE_IMAGE,
            citizenPhoto: f?.properties?.citizenPhoto || wardImages.citizenPhoto,
          };
        });
        setActiveDumps(sites.filter((site: any) => site.status !== 'cleaned'));
      } catch (err) {
        console.error("Failed to load dumpsites", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Map Lifecycle Effect
  useEffect(() => {
    // Cleanup function to destroy map instance
    const cleanupMap = () => {
      if (mapInstance.current) {
        console.log("Cleaning up map instance");
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };

    if (!activeRoute || !mapRef.current || routeAssignedTo !== selectedAlert?.id) {
      if (!activeRoute) cleanupMap();
      return;
    }

    // Small timeout to ensure container is rendered and sized
    const timer = setTimeout(() => {
      cleanupMap(); // Ensure no double instance

      console.log("Initializing map for alert:", selectedAlert?.id);
      const map = L.map(mapRef.current!).setView([12.9716, 77.5946], 13);
      mapInstance.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      if (activeRoute.geometry) {
        const polyline = L.polyline(activeRoute.geometry.coordinates.map((c: any) => [c[1], c[0]]), {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.7
        }).addTo(map);

        if (selectedAlert) {
          L.marker([selectedAlert.lat, selectedAlert.lng], {
            icon: L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })
          }).addTo(map).bindPopup("Waste Pickup Point");
        }

        L.marker([12.9716, 77.5946], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })
        }).addTo(map).bindPopup("Processing Center");

        map.fitBounds(polyline.getBounds(), { padding: [30, 30] });
      }
    }, 200); // Increased timeout slightly for reliable container detection

    return () => {
      clearTimeout(timer);
      // We don't necessarily want to cleanup on every tiny change if activeRoute persists
      // but Leaflet needs a fresh container usually if the div unmounts/remounts.
    };
  }, [activeRoute, selectedAlert?.id, routeAssignedTo]);

  const sortedDumps = [...activeDumps].sort((a, b) => {
    if (sortBy === 'priority') return b.priorityScore - a.priorityScore;
    if (sortBy === 'date') return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
    if (sortBy === 'severity') {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return 0;
  });

  const getSLATime = (reportedDate: string) => {
    const reported = new Date(reportedDate);
    const now = new Date();
    const elapsed = now.getTime() - reported.getTime();
    const hoursElapsed = Math.floor(elapsed / (1000 * 60 * 60));
    const slaHours = 24; // 24 hour SLA
    const remaining = slaHours - hoursElapsed;
    return { hoursElapsed, remaining, percentage: (hoursElapsed / slaHours) * 100 };
  };

  const getSeverityColor = (severity: DumpSite['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#2d7738]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-gray-50">
      <div className="p-4 lg:p-8">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold mt-1">{activeDumps.length}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold mt-1">
                  {activeDumps.filter((d) => d.severity === 'high').length}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Assigned Today</p>
                <p className="text-2xl font-bold mt-1">{assignedToday}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold mt-1">{completedToday}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts List */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Dump Alerts</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Sort by:</span>
                  </div>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="severity">Severity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {sortedDumps.map((dump) => {
                  const sla = getSLATime(dump.reportedDate);
                  const isUrgent = sla.remaining < 6;

                  return (
                    <Card
                      key={dump.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${selectedAlert?.id === dump.id ? 'ring-2 ring-[#2d7738]' : ''
                        }`}
                      onClick={() => setSelectedAlert(dump)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getSeverityColor(dump.severity)}`}>
                            <AlertTriangle className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{dump.ward}</h3>
                              <p className="text-sm text-gray-600 line-clamp-1">{dump.description}</p>
                            </div>
                            <Badge className="flex-shrink-0">Score: {dump.priorityScore}</Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant="outline" className="text-xs">
                              {dump.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {dump.status.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              • Reported {new Date(dump.reportedDate).toLocaleDateString()}
                            </span>
                          </div>

                          {/* SLA Timer */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-gray-600">
                                <Clock className="h-3 w-3" />
                                SLA Timer
                              </span>
                              <span className={isUrgent ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                                {sla.remaining > 0 ? `${sla.remaining}h remaining` : 'OVERDUE'}
                              </span>
                            </div>
                            <Progress
                              value={Math.min(sla.percentage, 100)}
                              className={`h-1.5 ${isUrgent ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          className="flex-1 bg-[#2d7738] hover:bg-[#245d2d]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignForm({
                              ...assignForm,
                              destination: dump.ward,
                              severity: dump.severity.charAt(0).toUpperCase() + dump.severity.slice(1)
                            });
                            setIsAssignModalOpen(true);
                          }}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Assign Truck
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle escalate
                          }}
                        >
                          Escalate
                        </Button>
                      </div>

                      {/* Escalation Alert */}
                      {isUrgent && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          <p className="text-xs text-red-800">
                            <span className="font-semibold">Escalation Required:</span> SLA deadline approaching
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            {selectedAlert ? (
              <Card className="p-6 sticky top-24">
                {activeRoute && routeAssignedTo === selectedAlert.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="font-bold text-lg text-[#2d7738] flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Live Route Tracking
                      </h2>
                      <Badge className="bg-green-100 text-green-700">En Route</Badge>
                    </div>

                    <div
                      ref={mapRef}
                      className="w-full h-80 rounded-xl overflow-hidden border-2 border-slate-100 shadow-inner z-0"
                    />

                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <div className="text-xs">
                          <p className="text-gray-500">Pickup Point</p>
                          <p className="font-semibold">{selectedAlert.ward}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div className="text-xs">
                          <p className="text-gray-500">Destination</p>
                          <p className="font-semibold">Central Processing Center</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50 h-10"
                        onClick={() => {
                          setActiveRoute(null);
                          setRouteAssignedTo(null);
                          setSelectedAlert(null);
                        }}
                      >
                        Close Tracking
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="font-semibold mb-4">Alert Details</h2>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Evidence Images</p>
                        <div className="grid grid-cols-2 gap-2">
                          <img
                            src={selectedAlert.satelliteImage || FALLBACK_SATELLITE_IMAGE}
                            alt="Satellite"
                            className="w-full h-28 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_SATELLITE_IMAGE;
                            }}
                          />
                          <img
                            src={selectedAlert.citizenPhoto || selectedAlert.satelliteImage || FALLBACK_SATELLITE_IMAGE}
                            alt="Citizen report"
                            className="w-full h-28 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_SATELLITE_IMAGE;
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Satellite Image</p>
                        <img
                          src={selectedAlert.satelliteImage || FALLBACK_SATELLITE_IMAGE}
                          alt="Satellite"
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_SATELLITE_IMAGE;
                          }}
                        />
                      </div>

                      {selectedAlert.citizenPhoto && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Citizen Photo</p>
                          <img
                            src={selectedAlert.citizenPhoto}
                            alt="Citizen report"
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_SATELLITE_IMAGE;
                            }}
                          />
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Location</p>
                        <p className="text-sm font-semibold">{selectedAlert.ward}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Coordinates</p>
                        {Number.isFinite(Number(selectedAlert.lat)) && Number.isFinite(Number(selectedAlert.lng)) ? (
                          <p className="text-sm font-mono">{Number(selectedAlert.lat).toFixed(4)}, {Number(selectedAlert.lng).toFixed(4)}</p>
                        ) : (
                          <p className="text-sm text-gray-500">Coordinates unavailable</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 mb-1">Priority Score</p>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedAlert.priorityScore} className="flex-1" />
                          <span className="text-sm font-semibold">{selectedAlert.priorityScore}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <Button className="w-full bg-[#2d7738] hover:bg-[#245d2d] mb-2">
                          View on Map
                        </Button>
                        <Button variant="outline" className="w-full">
                          Download Report
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            ) : (
              <Card className="p-6 text-center text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Select an alert to view details</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Truck Assignment Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-[#2d7738]/20 p-2 rounded-lg">
                  <Truck className="h-5 w-5 text-[#2d7738]" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Assign Nearest Truck</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                const response = await fetch("http://127.0.0.1:8000/api/assignments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(assignForm)
                });
                if (!response.ok) throw new Error("Assignment failed");
                const assignmentResult = await response.json();

                setSuccessMessage("Truck assigned successfully!");

                // Update metrics and list
                setAssignedToday(prev => prev + 1);

                if (selectedAlert) {
                  if (!Number.isFinite(Number(selectedAlert.lat)) || !Number.isFinite(Number(selectedAlert.lng))) {
                    alert("Coordinates are unavailable for this alert. Please select another site.");
                    return;
                  }

                  // Use consistent 127.0.0.1 for backend calls
                  const routeRes = await fetch(`http://127.0.0.1:8000/api/route?start_lat=${selectedAlert.lat}&start_lng=${selectedAlert.lng}&end_lat=12.9716&end_lng=77.5946`);
                  if (routeRes.ok) {
                    const routeData = await routeRes.json();

                    // State update order: set route then remove from list
                    setActiveRoute(routeData);
                    setRouteAssignedTo(selectedAlert.id);
                    setActiveDumps(prev => prev.filter(d => d.id !== selectedAlert.id));
                  }
                }

                setTimeout(() => {
                  setSuccessMessage(null);
                  setIsAssignModalOpen(false);
                  setAssignForm({ source: "", destination: "", severity: "Medium" });
                }, 2000);
              } catch (err) {
                console.error(err);
                alert("Failed to assign truck. Please check backend.");
              } finally {
                setIsSubmitting(false);
              }
            }} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Source Location</label>
                  <input
                    required
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#2d7738] outline-none transition-all placeholder:text-slate-500"
                    placeholder="E.g. Central Hub"
                    value={assignForm.source}
                    onChange={(e) => setAssignForm({ ...assignForm, source: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Destination</label>
                  <input
                    required
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#2d7738] outline-none transition-all"
                    placeholder="E.g. Indiranagar"
                    value={assignForm.destination}
                    onChange={(e) => setAssignForm({ ...assignForm, destination: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Severity Level</label>
                  <select
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-[#2d7738] outline-none transition-all appearance-none cursor-pointer"
                    value={assignForm.severity}
                    onChange={(e) => setAssignForm({ ...assignForm, severity: e.target.value })}
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>
              </div>

              {successMessage ? (
                <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">{successMessage}</span>
                </div>
              ) : (
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12 rounded-xl"
                    onClick={() => setIsAssignModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#2d7738] hover:bg-[#245d2d] text-white font-bold h-12 rounded-xl"
                  >
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Deploy Truck"}
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
