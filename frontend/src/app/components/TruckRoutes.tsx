import { useState, useEffect, useRef } from "react";
import { Truck, MapPin, Navigation, CheckCircle2, Circle, Clock, Phone, Loader2, Navigation2 } from "lucide-react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from "../services/api";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Dynamic Truck Icon
const truckIcon = L.divIcon({
  html: `<div class="bg-[#2d7738] p-1.5 rounded-full border-2 border-white shadow-lg text-white">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-1l-3-4h-4v7Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
         </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export function TruckRoutes() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.Polyline | null>(null);
  const movingMarkerRef = useRef<L.Marker | null>(null);
  const animationIntervalRef = useRef<any>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isStaticMap, setIsStaticMap] = useState(false);

  // 1. Initial Data Fetching
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/routes");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        
        const routes = data.features.map((f: any) => ({
          id: f.id,
          driverName: f.properties.driverName,
          vehicleNumber: f.properties.vehicleNumber,
          progress: f.properties.progress,
          coordinates: f.geometry.coordinates.map((c: any) => [c[1], c[0]]), // Leaflet uses [lat, lng]
          stops: [
            { address: "Koramangala 5th Block", time: "09:00 AM", completed: true },
            { address: "Indiranagar 100ft Rd", time: "11:30 AM", completed: true },
            { address: f.properties.id === 'T1' ? "Domlur Layout" : "Hebbal Flyover", time: "02:15 PM", completed: false },
            { address: "Central Processing Center", time: "04:45 PM", completed: false }
          ]
        }));
        
        setTrucks(routes);
        if (routes.length > 0) setSelectedTruck(routes[0]);
      } catch (err) {
        console.error("Failed to load routes", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Map Initialization & Update Handle
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([12.9716, 77.5946], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }

    const map = mapInstance.current;

    // Clear previous layers
    if (routeLayer.current) map.removeLayer(routeLayer.current);
    if (movingMarkerRef.current) map.removeLayer(movingMarkerRef.current);
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (selectedTruck && selectedTruck.coordinates.length > 0) {
      const coords = selectedTruck.coordinates;
      
      // Draw static route (dashed)
      routeLayer.current = L.polyline(coords, {
        color: '#2d7738',
        weight: 4,
        dashArray: '10, 10',
        opacity: 0.6
      }).addTo(map);

      // Start & End markers
      L.marker(coords[0], { title: 'Start' }).addTo(map).bindPopup("Start: Depot");
      L.marker(coords[coords.length - 1], { title: 'End' }).addTo(map).bindPopup("End: Processing Center");

      // Initialize moving marker
      const startPos = coords[0];
      movingMarkerRef.current = L.marker(startPos, { icon: truckIcon }).addTo(map);
      
      map.fitBounds(routeLayer.current.getBounds(), { padding: [50, 50] });
      
      // Simulation Cycle
      let step = 0;
      setCurrentIndex(0);
      
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
      
      if (!isStaticMap) {
        animationIntervalRef.current = setInterval(() => {
          step = (step + 1) % coords.length;
          setCurrentIndex(step);
          
          if (movingMarkerRef.current) {
            movingMarkerRef.current.setLatLng(coords[step]);
            map.panTo(coords[step], { animate: true });
          }
        }, 1000);
      }
    }

    return () => {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
    };
  }, [selectedTruck, isStaticMap]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#2d7738]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] bg-gray-50 flex flex-col lg:flex-row h-[calc(100vh-73px)] overflow-hidden">
      {/* Sidebar: Active Trucks */}
      <div className="w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-20">
        <div className="p-6 border-b border-gray-100 bg-slate-50/50">
          <h2 className="font-bold text-xl tracking-tight text-slate-800">Active Trucks</h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <p className="text-sm text-slate-500 font-medium">{trucks.length} Units Online</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {trucks.map((truck) => (
            <div
              key={truck.id}
              onClick={() => setSelectedTruck(truck)}
              className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border-2 ${
                selectedTruck?.id === truck.id 
                ? 'border-[#2d7738] bg-green-50/50 shadow-sm' 
                : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${selectedTruck?.id === truck.id ? 'bg-[#2d7738] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">{truck.vehicleNumber}</h3>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{truck.driverName}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 px-2.5">
                  Live
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-tight">
                  <span className="text-slate-400">Voyage Progress</span>
                  <span className="text-[#2d7738]">{truck.progress}%</span>
                </div>
                <Progress value={truck.progress} className="h-2 rounded-full bg-slate-100 [&>div]:bg-[#2d7738]" />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                   <Navigation2 className="h-4 w-4" />
                   <span className="text-xs font-bold">{truck.stops.filter((s:any) => s.completed).length}/{truck.stops.length} Stops</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                   <Clock className="h-3.5 w-3.5" />
                   <span>ETA 14:30</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
        {/* Selected Truck Header Overlay */}
        {selectedTruck && (
          <div className="absolute top-6 left-6 right-6 z-10">
            <Card className="p-5 bg-white/95 backdrop-blur-md shadow-xl border-slate-100 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <h3 className="font-bold text-xl text-slate-900">{selectedTruck.vehicleNumber}</h3>
                       <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active Route</Badge>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium">
                       <MapPin className="h-3.5 w-3.5" />
                       Heading to: {selectedTruck.stops.find((s:any) => !s.completed)?.address || 'Final Destination'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="rounded-xl border-slate-200 font-bold text-slate-600 gap-2 h-11 px-6 hover:bg-slate-50"
                    onClick={() => setIsCalling(true)}
                  >
                    <Phone className="h-4 w-4 text-slate-400" />
                    Call Driver
                  </Button>
                  <Button 
                    className="bg-[#2d7738] hover:bg-[#245d2d] rounded-xl font-bold gap-2 px-6 h-11 shadow-lg shadow-green-100"
                    onClick={() => setIsReportOpen(true)}
                  >
                    Full Report
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Map Container */}
        <div ref={mapRef} className="flex-1 w-full bg-slate-200 z-0" />

        {/* Map Mode Toggle Overlay */}
        <div className="absolute bottom-72 left-6 z-10">
          <Card className="flex items-center p-1 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border-slate-100">
             <Button 
               variant={!isStaticMap ? "default" : "ghost"} 
               size="sm" 
               className={`rounded-lg font-bold transition-all ${!isStaticMap ? 'bg-[#2d7738]' : 'text-slate-500'}`}
               onClick={() => setIsStaticMap(false)}
             >
               Live Simulation
             </Button>
             <Button 
               variant={isStaticMap ? "default" : "ghost"} 
               size="sm" 
               className={`rounded-lg font-bold transition-all ${isStaticMap ? 'bg-slate-800' : 'text-slate-500'}`}
               onClick={() => setIsStaticMap(true)}
             >
               Static View
             </Button>
          </Card>
        </div>

        {/* Today's Stops Panel */}
        <div className="h-72 bg-white border-t border-slate-200 flex flex-col shadow-2xl z-10 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-3">
               <h3 className="font-bold text-lg text-slate-800">Today's Voyage Timeline</h3>
               <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold border-none px-2.5 py-0.5">
                 {selectedTruck?.stops.length} Checkpoints
               </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-green-500" /> {selectedTruck?.stops.filter((s:any) => s.completed).length} Found</span>
               <span className="flex items-center gap-1.5"><Circle className="h-4 w-4 text-slate-300" /> {selectedTruck?.stops.filter((s:any) => !s.completed).length} Pending</span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6">
            <div className="flex items-start gap-0 min-w-max h-full">
              {selectedTruck?.stops.map((stop: any, index: number) => (
                <div key={index} className="flex items-start group">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                      stop.completed 
                      ? 'bg-green-500 text-white border-none scale-100' 
                      : index === selectedTruck.stops.findIndex((s:any) => !s.completed)
                        ? 'bg-[#2d7738] text-white border-none ring-4 ring-green-100 scale-110'
                        : 'bg-white text-slate-300 border-2 border-slate-100 scale-90'
                    }`}>
                      {stop.completed ? <CheckCircle2 className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>
                    <div className="mt-3 text-center w-32 px-2">
                       <p className={`text-xs font-bold truncate ${stop.completed ? 'text-slate-400' : 'text-slate-800'}`}>{stop.address}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{stop.time}</p>
                    </div>
                  </div>
                  {index < selectedTruck.stops.length - 1 && (
                    <div className={`w-28 h-[2px] mt-5 mx-0 transition-colors duration-500 ${
                      stop.completed && selectedTruck.stops[index+1].completed ? 'bg-green-500' : 'bg-slate-100'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Overlays */}
      <CallOverlay 
        isOpen={isCalling} 
        onClose={() => setIsCalling(false)} 
        truck={selectedTruck} 
      />
      <ReportOverlay 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        truck={selectedTruck} 
      />
    </div>
  );
}

function CallOverlay({ isOpen, onClose, truck }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300">
      <Card className="w-80 p-8 flex flex-col items-center text-center bg-transparent border-none shadow-none">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white scale-110 animate-pulse">
            <Phone className="h-10 w-10 fill-current" />
          </div>
          <div className="absolute inset-0 w-24 h-24 bg-green-500 rounded-full animate-ping opacity-20"></div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Calling Driver...</h2>
        <p className="text-slate-400 font-medium mb-1">{truck.driverName}</p>
        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-8">{truck.vehicleNumber}</p>
        
        <Button 
          variant="destructive" 
          className="w-full h-14 rounded-2xl font-bold text-lg bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/20"
          onClick={onClose}
        >
          End Call
        </Button>
      </Card>
    </div>
  );
}

function ReportOverlay({ isOpen, onClose, truck }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
         <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-[#2d7738] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                  <CheckCircle2 className="h-6 w-6" />
               </div>
               <div>
                  <h2 className="text-xl font-bold text-slate-900 uppercase">Voyage Summary Report</h2>
                  <p className="text-sm text-slate-500 font-medium">Instance ID: {truck.id}-SUM-2024</p>
               </div>
            </div>
            <Button variant="ghost" className="rounded-full h-10 w-10 p-0" onClick={onClose}>
               <X className="h-6 w-6 text-slate-400" />
            </Button>
         </div>

         <div className="p-8 space-y-8">
            <div className="grid grid-cols-3 gap-6">
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Distance</p>
                  <p className="text-xl font-black text-slate-800">14.2 km</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Speed</p>
                  <p className="text-xl font-black text-slate-800">22 km/h</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Time</p>
                  <p className="text-xl font-black text-slate-800">5h 22m</p>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-[#2d7738]" />
                  Stop Compliance Analysis
               </h3>
               <div className="space-y-3">
                  {truck.stops.map((stop: any, i: number) => (
                     <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stop.completed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                              <CheckCircle2 className="h-4 w-4" />
                           </div>
                           <span className="text-sm font-bold text-slate-700">{stop.address}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-slate-200">
                           {stop.time} - {stop.completed ? 'VERIFIED' : 'PENDING'}
                        </Badge>
                     </div>
                  ))}
               </div>
            </div>

            <Button className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold flex gap-3 shadow-xl shadow-slate-200" onClick={onClose}>
               Download PDF Document
            </Button>
         </div>
      </Card>
    </div>
  );
}

import { X } from "lucide-react";
