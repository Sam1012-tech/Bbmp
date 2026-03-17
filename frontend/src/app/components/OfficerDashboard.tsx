import { useState } from "react";
import { AlertTriangle, Clock, Truck, CheckCircle2, ArrowUpRight, Filter } from "lucide-react";
import { dumpSites, type DumpSite } from "../data/mockData";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function OfficerDashboard() {
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'severity'>('priority');
  const [selectedAlert, setSelectedAlert] = useState<DumpSite | null>(null);

  const activeDumps = dumpSites.filter((site) => site.status !== 'cleaned');

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
                <p className="text-2xl font-bold mt-1">8</p>
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
                <p className="text-2xl font-bold mt-1">12</p>
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
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedAlert?.id === dump.id ? 'ring-2 ring-[#2d7738]' : ''
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
                            // Handle assign truck
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
                <h2 className="font-semibold mb-4">Alert Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Satellite Image</p>
                    <img
                      src={selectedAlert.satelliteImage}
                      alt="Satellite"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>

                  {selectedAlert.citizenPhoto && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Citizen Photo</p>
                      <img
                        src={selectedAlert.citizenPhoto}
                        alt="Citizen report"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Location</p>
                    <p className="text-sm font-semibold">{selectedAlert.ward}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">Coordinates</p>
                    <p className="text-sm font-mono">{selectedAlert.lat.toFixed(4)}, {selectedAlert.lng.toFixed(4)}</p>
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
    </div>
  );
}
