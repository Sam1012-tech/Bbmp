# 🌍 Sky Swachh

## Sky Swachh Map Dashboard
 <img width="1600" height="872" alt="image" src="https://github.com/user-attachments/assets/86d8ad61-ae98-45f8-a0aa-c5ad80c78539" />


**Sky Swachh** is an intelligent, map-based platform designed to detect, monitor, and manage illegal waste dumping in Bengaluru. By leveraging AI-detected dump sites, citizen reports, and smart routing algorithms, it streamlines the waste collection process from detection to processing.

## ✨ Key Features

- **🗺️ Interactive Map Dashboard**: Built with React and Leaflet to visualize active dump sites, ward boundaries, dry waste collection centres (DWCC), and waste processing units (WPU).
- **🤖 AI Dump Detection Integration**: Displays AI-identified risk zones and illegal dump sites from spatial data models.
- **📸 Citizen Reporting**: Citizens can report illegal dumping with photos and locations, seamlessly integrating into the municipal dashboard.
- **🚚 Smart Logistics & Routing**: Uses the **OSRM (Open Source Routing Machine)** API to automatically calculate optimized routes for garbage trucks from a dump site to the nearest DWCC, and finally to a WPU.
- **📊 Real-time Monitoring**: Track active dump sites, cleaned zones, and active fleet operations through a responsive UI.

## 📱 Sky Swachh Citizen App

![Citizen App Space](space_app.jpeg)

**[Sky Swachh Citizen App Repository](https://github.com/aniksha23/Sky-Swachh---Citizen-App)**

CitizenApp gamifies civic engagement in Bengaluru. Snap photos of illegal dump sites with automatic GPS and time-stamps. AI-powered ML verifies waste in seconds. Verified reports earn 50 points, unlock ranks, and alert cleanup authorities instantly. Compete on leaderboards, become an Environmental Hero, and make cities cleaner together.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Framer Motion
- **Maps**: Leaflet, React-Leaflet
- **Forms & State**: React Hook Form, Embla Carousel

### Backend
- **Framework**: FastAPI (Python)
- **Database**: Firebase Firestore (with fallback JSON data)
- **Geospatial & Routing**: OSRM API, Photon Geocoding API

## 📂 Project Structure

```text
sky-swachh/
├── backend/
│   ├── data/                 # GeoJSON and JSON fallback data (wards, WPUs, DWCCs)
│   ├── main.py               # FastAPI application entry point
│   ├── seed_firestore.py     # Script to populate Firestore DB
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/components/   # React components (MapDashboard, UI elements)
│   │   ├── services/         # API integration services
│   │   └── styles/           # Tailwind and global CSS
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite configuration
└── waste_model.pth           # PyTorch weights for AI dump detection
```

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.9 or higher)
- (Optional) Firebase Service Account JSON for Firestore integration.

### 1. Backend Setup

Navigate to the backend directory and set up a Python virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python3 main.py
```
The backend will run on `http://127.0.0.1:8000`.

*(Optional)*: To use Firebase, place your `serviceAccount.json` inside the `backend/` folder. If not present, the backend gracefully falls back to local mock data.

### 2. Frontend Setup

Open a new terminal window, navigate to the frontend directory:

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The frontend will run on `http://localhost:5173`. Open this URL in your browser to view the Map Dashboard.

## 📡 API Endpoints (Backend)

- `GET /api/dumpsites`: Retrieve all detected dump sites.
- `GET /api/citizen-reports`: Fetch user-submitted reports.
- `POST /api/reports`: Submit a new citizen report.
- `GET /api/logistics-route`: Calculates the optimal cleanup route (Dump Site -> DWCC -> WPU).
- `POST /api/optimize-route`: TSP optimization for multiple waypoints using OSRM.
- `GET /api/geocode` & `/api/reverse-geocode`: Location search capabilities.

## 🤝 Contributing

1. Fork the repository
2. Create a new feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
*Developed for a cleaner, greener Bengaluru.* 🌳
