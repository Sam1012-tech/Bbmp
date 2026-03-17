import { useState } from "react";
import { Truck, MapPin, Navigation, CheckCircle2, Circle, Clock, Phone } from "lucide-react";
import { truckRoutes, type TruckRoute } from "../data/mockData";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

export function TruckRoutes() {
  const [selectedTruck, setSelectedTruck] = useState<TruckRoute>(truckRoutes[0]);

  return (
    <div className="min-h-[calc(100vh-73px)] bg-gray-50">
      <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-73px)]">
        {/* Truck List */}
        <div className="lg:col-span-1 bg-white border-b lg:border-r lg:border-b-0 border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="font-semibold text-lg">Active Trucks</h2>
            <p className="text-sm text-gray-600">Real-time tracking & routes</p>
          </div>

          <div className="p-4 space-y-3">
            {truckRoutes.map((truck) => (
              <Card
                key={truck.id}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTruck.id === truck.id ? 'ring-2 ring-[#2d7738] bg-green-50' : ''
                }`}
                onClick={() => setSelectedTruck(truck)}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#2d7738] rounded-lg">
                    <Truck className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{truck.vehicleNumber}</h3>
                    <p className="text-sm text-gray-600">{truck.driverName}</p>
                    
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Route Progress</span>
                        <span className="font-semibold">{truck.progress}%</span>
                      </div>
                      <Progress value={truck.progress} className="h-1.5" />
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">{truck.stops[0].address}</span>
                    </div>

                    <Badge className="mt-2" variant={truck.progress < 100 ? "default" : "outline"}>
                      {truck.stops.filter((s) => s.completed).length}/{truck.stops.length} Stops
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Add Truck Button */}
          <div className="p-4 border-t border-gray-200">
            <Button className="w-full bg-[#2d7738] hover:bg-[#245d2d]">
              <Truck className="h-4 w-4 mr-2" />
              Assign New Truck
            </Button>
          </div>
        </div>

        {/* Route Map & Details */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Map View */}
          <div className="flex-1 bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden">
            {/* Map Header */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <Card className="p-4 bg-white/95 backdrop-blur-sm shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#2d7738] rounded-lg">
                      <Truck className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTruck.vehicleNumber}</h3>
                      <p className="text-sm text-gray-600">{selectedTruck.driverName}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    <Phone className="h-4 w-4 mr-2" />
                    Call Driver
                  </Button>
                </div>
              </Card>
            </div>

            {/* Simplified Route Map */}
            <div className="absolute inset-0 p-8">
              {/* Grid Background */}
              <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="grid grid-cols-10 grid-rows-10 h-full">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-gray-400"></div>
                  ))}
                </div>
              </div>

              {/* Route Line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3, 0 6" fill="#2d7738" />
                  </marker>
                </defs>
                {selectedTruck.route.map((point, index) => {
                  if (index === selectedTruck.route.length - 1) return null;
                  const nextPoint = selectedTruck.route[index + 1];
                  const x1 = ((point.lng - 77.5) / 0.3) * 100;
                  const y1 = ((13.1 - point.lat) / 0.3) * 100;
                  const x2 = ((nextPoint.lng - 77.5) / 0.3) * 100;
                  const y2 = ((13.1 - nextPoint.lat) / 0.3) * 100;
                  
                  return (
                    <line
                      key={index}
                      x1={`${x1}%`}
                      y1={`${y1}%`}
                      x2={`${x2}%`}
                      y2={`${y2}%`}
                      stroke="#2d7738"
                      strokeWidth="3"
                      strokeDasharray="8,4"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </svg>

              {/* Route Points */}
              {selectedTruck.route.map((point, index) => (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{
                    left: `${((point.lng - 77.5) / 0.3) * 100}%`,
                    top: `${((13.1 - point.lat) / 0.3) * 100}%`,
                  }}
                >
                  <div className="relative group">
                    <MapPin
                      className={`h-8 w-8 drop-shadow-lg ${
                        point.type === 'pickup' ? 'text-blue-500' : 'text-red-500'
                      }`}
                      fill="currentColor"
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                      <div className="bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {point.type === 'pickup' ? 'Pickup' : 'Dump Site'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Location */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 animate-pulse"
                style={{
                  left: `${((selectedTruck.currentLocation.lng - 77.5) / 0.3) * 100}%`,
                  top: `${((13.1 - selectedTruck.currentLocation.lat) / 0.3) * 100}%`,
                }}
              >
                <div className="relative">
                  <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#2d7738] text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                    Current Location
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10">
              <Card className="p-3 bg-white/95 backdrop-blur-sm">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-500" fill="currentColor" />
                    <span>Regular Pickup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-500" fill="currentColor" />
                    <span>Illegal Dump Site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Current Location</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Stop List */}
          <div className="bg-white border-t border-gray-200 p-4 overflow-y-auto max-h-64">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Today's Stops</h3>
              <Badge>{selectedTruck.stops.filter((s) => s.completed).length}/{selectedTruck.stops.length} Completed</Badge>
            </div>

            <div className="space-y-3">
              {selectedTruck.stops.map((stop, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    {stop.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-300" />
                    )}
                    {index < selectedTruck.stops.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-medium ${stop.completed ? 'text-gray-500 line-through' : ''}`}>
                          {stop.address}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{stop.time}</span>
                        </div>
                      </div>
                      {!stop.completed && (
                        <Button size="sm" variant="outline">
                          <Navigation className="h-3 w-3 mr-1" />
                          Navigate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
