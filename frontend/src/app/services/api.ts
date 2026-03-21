const BASE_URL = "http://localhost:8000";

export const api = {
  async login(username: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },

  async signup(formData: { username: string; email: string; password: string }) {
    const res = await fetch(`${BASE_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (!res.ok) throw new Error("Signup failed");
    return res.json();
  },

  async getDumpsites() {
    const res = await fetch(`${BASE_URL}/api/dumpsites`);
    if (!res.ok) throw new Error("Failed to fetch dump sites");
    return res.json();
  },

  async getSummary() {
    const res = await fetch(`${BASE_URL}/api/summary`);
    if (!res.ok) throw new Error("Failed to fetch summary");
    return res.json();
  },

  async submitReport(report: {
    lat: number;
    lng: number;
    ward: string;
    waste_type: string;
    description?: string;
    photo?: string;
  }) {
    const res = await fetch(`${BASE_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (!res.ok) throw new Error("Failed to submit report");
    return res.json();
  },
};
