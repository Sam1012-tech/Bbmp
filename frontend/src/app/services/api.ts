const API_BASE_URL = "http://localhost:8000/api";

export const api = {
  async signup(data: any) {
    const response = await fetch(`${API_BASE_URL}/reports`, { // Using /reports as a placeholder for signup if no signup endpoint exists
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Signup failed');
    return response.json();
  },

  async login(username: string, password: string) {
    // In a real app, this would call /login. For now, we simulation success but could call a dummy endpoint.
    return { token: 'mock-token-123', user: { username } };
  },

  async getDumpsites() {
    const response = await fetch(`${API_BASE_URL}/dumpsites`);
    if (!response.ok) throw new Error('Failed to fetch dumpsites');
    return response.json();
  },

  async getRoutes() {
    const response = await fetch(`${API_BASE_URL}/routes`);
    if (!response.ok) throw new Error('Failed to fetch routes');
    return response.json();
  },

  async getSummary() {
    const response = await fetch(`${API_BASE_URL}/summary`);
    if (!response.ok) throw new Error('Failed to fetch summary');
    return response.json();
  },

  async submitReport(data: any) {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit report');
    return response.json();
  },

  async geocode(query: string) {
    const response = await fetch(`${API_BASE_URL}/geocode?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Geocoding failed');
    return response.json();
  },

  async getRoute(start: { lat: number, lng: number }, end: { lat: number, lng: number }) {
    const response = await fetch(`${API_BASE_URL}/route?start_lat=${start.lat}&start_lng=${start.lng}&end_lat=${end.lat}&end_lng=${end.lng}`);
    if (!response.ok) throw new Error('Route calculation failed');
    return response.json();
  },

  async getLogisticsRoute(lat: number, lng: number) {
    const response = await fetch(`${API_BASE_URL}/logistics-route?start_lat=${lat}&start_lng=${lng}`);
    if (!response.ok) throw new Error('Logistics route calculation failed');
    return response.json();
  },

  async optimizeRoute(waypoints: { lat: number, lng: number }[]) {
    const response = await fetch(`${API_BASE_URL}/optimize-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waypoints, optimize: true }),
    });
    if (!response.ok) throw new Error('Route optimization failed');
    return response.json();
  },

  async reverseGeocode(lat: number, lng: number) {
    const response = await fetch(`${API_BASE_URL}/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (!response.ok) throw new Error('Reverse geocoding failed');
    return response.json();
  }
};
