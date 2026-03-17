import { TrendingUp, TrendingDown, MapPin, Award, AlertCircle } from "lucide-react";
import { analyticsData } from "../data/mockData";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function Analytics() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-gray-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Performance metrics and insights for Bengaluru waste management</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Total Dumps Detected</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.totalDumpsDetected}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingDown className="h-4 w-4" />
              <span>12% decrease from last month</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Active Dumps</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.activeDumps}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-red-600">
              <TrendingUp className="h-4 w-4" />
              <span>5% increase from last week</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Cleaned This Month</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.cleanedThisMonth}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>18% increase efficiency</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Avg Cleanup Time</p>
                <p className="text-3xl font-bold mt-1">{analyticsData.avgCleanupTime}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingDown className="h-4 w-4" />
              <span>3h faster than target</span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Monthly Trend */}
          <Card className="p-6 lg:col-span-2">
            <h2 className="font-semibold mb-6">Detection vs Cleanup Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="detected" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  name="Detected"
                />
                <Line 
                  type="monotone" 
                  dataKey="cleaned" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Cleaned"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Severity Distribution */}
          <Card className="p-6">
            <h2 className="font-semibold mb-6">Severity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.severityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Ward Performance Scorecard */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold">Ward-wise Performance Scorecard</h2>
              <p className="text-sm text-gray-600 mt-1">Based on cleanup time, response rate, and citizen satisfaction</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Best Ward</p>
                <p className="font-semibold text-green-600">{analyticsData.topPerformingWard}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Needs Attention</p>
                <p className="font-semibold text-red-600">{analyticsData.worstPerformingWard}</p>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.wardPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ward" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#2d7738" name="Performance Score" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Ward Details Table */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Ward Performance Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Ward</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Score</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Active Dumps</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Avg Cleanup Time</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.wardPerformance.map((ward, index) => (
                  <tr key={ward.ward} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{ward.ward}</span>
                        {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#2d7738] h-2 rounded-full"
                            style={{ width: `${ward.score}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold">{ward.score}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={ward.dumps > 20 ? "destructive" : "outline"}>
                        {ward.dumps}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">{ward.avgTime}h</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          ward.score >= 85
                            ? 'bg-green-100 text-green-800'
                            : ward.score >= 70
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {ward.score >= 85 ? 'Excellent' : ward.score >= 70 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Heatmap Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Dumping Hotspots</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium">Whitefield Tech Park Area</span>
                </div>
                <Badge variant="destructive">High</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="font-medium">Marathahalli Bridge</span>
                </div>
                <Badge className="bg-orange-100 text-orange-800">Medium</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">HSR Sector 2</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">AI Detection Accuracy</h2>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-green-100 mb-3">
                <span className="text-3xl font-bold text-green-700">{analyticsData.detectionAccuracy}%</span>
              </div>
              <p className="text-sm text-gray-600">Overall Detection Accuracy</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">True Positives</span>
                <span className="font-semibold">92.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">False Positives</span>
                <span className="font-semibold">5.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Citizen Reports</span>
                <span className="font-semibold">{analyticsData.citizenReports}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
