export interface DumpSite {
  id: string;
  lat: number;
  lng: number;
  status: 'detected' | 'pending' | 'cleaned';
  severity: 'high' | 'medium' | 'low';
  ward: string;
  satelliteImage: string;
  citizenPhoto?: string;
  reportedDate: string;
  cleanedDate?: string;
  assignedTruck?: string;
  description: string;
  priorityScore: number;
}

export interface CitizenReport {
  id: string;
  location: { lat: number; lng: number };
  address: string;
  wasteType: string;
  photo: string;
  status: 'submitted' | 'assigned' | 'in-progress' | 'completed';
  reportedDate: string;
  timeline: Array<{ status: string; date: string; description: string }>;
}

export interface TruckRoute {
  id: string;
  driverName: string;
  vehicleNumber: string;
  route: Array<{ lat: number; lng: number; type: 'pickup' | 'dump' }>;
  currentLocation: { lat: number; lng: number };
  progress: number;
  stops: Array<{ address: string; time: string; completed: boolean }>;
}

// Bengaluru coordinates: approx 12.9716°N, 77.5946°E
export const dumpSites: DumpSite[] = [
  {
    id: '1',
    lat: 12.9352,
    lng: 77.6245,
    status: 'detected',
    severity: 'high',
    ward: 'Indiranagar',
    satelliteImage: 'https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=400',
    citizenPhoto: 'https://images.unsplash.com/photo-1762805544541-291320022a32?w=400',
    reportedDate: '2026-03-01',
    description: 'Large illegal dump site detected near 100 Feet Road',
    priorityScore: 95
  },
  {
    id: '2',
    lat: 12.9716,
    lng: 77.5946,
    status: 'pending',
    severity: 'medium',
    ward: 'Koramangala',
    satelliteImage: 'https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=400',
    reportedDate: '2026-02-28',
    description: 'Citizen reported waste accumulation',
    priorityScore: 72
  },
  {
    id: '3',
    lat: 13.0358,
    lng: 77.5970,
    status: 'cleaned',
    severity: 'low',
    ward: 'Yelahanka',
    satelliteImage: 'https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=400',
    reportedDate: '2026-02-25',
    cleanedDate: '2026-02-27',
    assignedTruck: 'KA-01-AB-1234',
    description: 'Small dump site - cleaned successfully',
    priorityScore: 45
  },
  {
    id: '4',
    lat: 12.8988,
    lng: 77.6450,
    status: 'detected',
    severity: 'high',
    ward: 'Whitefield',
    satelliteImage: 'https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=400',
    reportedDate: '2026-03-02',
    description: 'Large construction waste dump detected',
    priorityScore: 88
  },
  {
    id: '5',
    lat: 12.9698,
    lng: 77.7499,
    status: 'pending',
    severity: 'medium',
    ward: 'Marathahalli',
    satelliteImage: 'https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=400',
    citizenPhoto: 'https://images.unsplash.com/photo-1762805544541-291320022a32?w=400',
    reportedDate: '2026-03-01',
    description: 'Mixed waste accumulation reported',
    priorityScore: 65
  },
  {
    id: '6',
    lat: 12.9141,
    lng: 77.6411,
    status: 'cleaned',
    severity: 'low',
    ward: 'HSR Layout',
    satelliteImage: 'https://images.unsplash.com/photo-1611320351495-4a700c82edea?w=400',
    reportedDate: '2026-02-26',
    cleanedDate: '2026-02-28',
    assignedTruck: 'KA-01-CD-5678',
    description: 'Residential waste - cleared',
    priorityScore: 50
  },
];

export const wards = [
  'All Wards',
  'Indiranagar',
  'Koramangala',
  'Yelahanka',
  'Whitefield',
  'Marathahalli',
  'HSR Layout',
  'Jayanagar',
  'Malleshwaram',
];

export const mockCitizenReport: CitizenReport = {
  id: 'CR-2026-001',
  location: { lat: 12.9352, lng: 77.6245 },
  address: '100 Feet Road, Indiranagar, Bengaluru',
  wasteType: 'Mixed Waste',
  photo: 'https://images.unsplash.com/photo-1762805544541-291320022a32?w=400',
  status: 'in-progress',
  reportedDate: '2026-03-01T10:30:00',
  timeline: [
    { status: 'Submitted', date: '2026-03-01T10:30:00', description: 'Report submitted successfully' },
    { status: 'Verified', date: '2026-03-01T11:15:00', description: 'AI verification completed' },
    { status: 'Assigned', date: '2026-03-01T14:00:00', description: 'Truck KA-01-AB-1234 assigned' },
    { status: 'In Progress', date: '2026-03-02T09:00:00', description: 'Cleanup crew dispatched' },
  ]
};

export const truckRoutes: TruckRoute[] = [
  {
    id: 'T1',
    driverName: 'Rajesh Kumar',
    vehicleNumber: 'KA-01-AB-1234',
    route: [
      { lat: 12.9716, lng: 77.5946, type: 'pickup' },
      { lat: 12.9352, lng: 77.6245, type: 'dump' },
      { lat: 12.9141, lng: 77.6411, type: 'pickup' },
    ],
    currentLocation: { lat: 12.9500, lng: 77.6100 },
    progress: 65,
    stops: [
      { address: 'Koramangala 5th Block', time: '09:00 AM', completed: true },
      { address: 'Indiranagar 100 Feet Road', time: '10:30 AM', completed: false },
      { address: 'HSR Layout Sector 1', time: '12:00 PM', completed: false },
    ]
  },
  {
    id: 'T2',
    driverName: 'Suresh Patil',
    vehicleNumber: 'KA-01-CD-5678',
    route: [
      { lat: 13.0358, lng: 77.5970, type: 'pickup' },
      { lat: 12.8988, lng: 77.6450, type: 'dump' },
    ],
    currentLocation: { lat: 13.0200, lng: 77.6000 },
    progress: 45,
    stops: [
      { address: 'Yelahanka New Town', time: '09:30 AM', completed: true },
      { address: 'Whitefield Main Road', time: '11:00 AM', completed: false },
    ]
  },
];

export const analyticsData = {
  totalDumpsDetected: 156,
  activeDumps: 42,
  cleanedThisMonth: 114,
  avgCleanupTime: '18 hours',
  topPerformingWard: 'Koramangala',
  worstPerformingWard: 'Whitefield',
  detectionAccuracy: 94.5,
  citizenReports: 312,
  
  monthlyTrend: [
    { month: 'Sep', detected: 45, cleaned: 38 },
    { month: 'Oct', detected: 52, cleaned: 47 },
    { month: 'Nov', detected: 48, cleaned: 51 },
    { month: 'Dec', detected: 61, cleaned: 58 },
    { month: 'Jan', detected: 55, cleaned: 62 },
    { month: 'Feb', detected: 58, cleaned: 54 },
    { month: 'Mar', detected: 42, cleaned: 35 },
  ],
  
  wardPerformance: [
    { ward: 'Koramangala', score: 95, dumps: 12, avgTime: 14 },
    { ward: 'Indiranagar', score: 88, dumps: 15, avgTime: 16 },
    { ward: 'HSR Layout', score: 85, dumps: 18, avgTime: 19 },
    { ward: 'Marathahalli', score: 72, dumps: 22, avgTime: 24 },
    { ward: 'Whitefield', score: 68, dumps: 28, avgTime: 28 },
    { ward: 'Yelahanka', score: 78, dumps: 20, avgTime: 21 },
  ],
  
  severityDistribution: [
    { name: 'High', value: 28, color: '#dc2626' },
    { name: 'Medium', value: 45, color: '#f59e0b' },
    { name: 'Low', value: 27, color: '#10b981' },
  ],
};
