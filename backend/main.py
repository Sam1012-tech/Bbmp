from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random
import requests
import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

DATA_DIR = Path(__file__).parent / "data"

# --- Firebase Init ---
# Set GOOGLE_APPLICATION_CREDENTIALS env var to your serviceAccount.json path,
# OR place serviceAccount.json in the backend folder.
_sa_path = Path(__file__).parent / "serviceAccount.json"
if not firebase_admin._apps:
    if _sa_path.exists():
        cred = credentials.Certificate(str(_sa_path))
        firebase_admin.initialize_app(cred)
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        firebase_admin.initialize_app()
    else:
        firebase_admin.initialize_app()  # will fail gracefully; fallback to JSON below

try:
    db = firestore.client()
    USE_FIRESTORE = True
except Exception:
    db = None
    USE_FIRESTORE = False

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon/MVP, allow all. In production, restrict to Vite's URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class Report(BaseModel):
    lat: float
    lng: float
    ward: str
    waste_type: str
    description: Optional[str] = None
    photo: Optional[str] = None

class Waypoint(BaseModel):
    lat: float
    lng: float

class RouteRequest(BaseModel):
    waypoints: List[Waypoint]
    optimize: bool = True

class TruckAssignment(BaseModel):
    source: str
    destination: str
    severity: str

# --- Fallback JSON data (used when Firestore is unavailable) ---

assignments_db = []

with open(DATA_DIR / "dump_sites.json") as f:
    _fallback_dumpsites = json.load(f)

with open(DATA_DIR / "training_polygons.geojson") as f:
    _training_polygons = json.load(f)

with open(DATA_DIR / "waste_processing_units.json") as f:
    _waste_processing_units = json.load(f)

with open(DATA_DIR / "dry_waste_centres.json") as f:
    _dry_waste_centres = json.load(f)

routes = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "T1",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [77.5946, 12.9716],
                    [77.6245, 12.9352],
                    [77.6411, 12.9141]
                ]
            },
            "properties": {
                "id": "T1",
                "driverName": "Rajesh Kumar",
                "vehicleNumber": "KA-01-AB-1234",
                "progress": 65
            }
        },
        {
            "type": "Feature",
            "id": "T2",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [77.5970, 13.0358],
                    [77.6450, 12.8988]
                ]
            },
            "properties": {
                "id": "T2",
                "driverName": "Suresh Patil",
                "vehicleNumber": "KA-01-CD-5678",
                "progress": 45
            }
        }
    ]
}

summary = {
    "totalDumpsDetected": 156,
    "activeDumps": 42,
    "cleanedThisMonth": 114,
    "avgCleanupTime": "18 hours",
    "topPerformingWard": "Koramangala",
    "worstPerformingWard": "Whitefield",
    "detectionAccuracy": 94.5,
    "citizenReports": 312
}

class Report(BaseModel):
    lat: float
    lng: float
    ward: str
    waste_type: str
    description: Optional[str] = None
    photo: Optional[str] = None

class Waypoint(BaseModel):
    lat: float
    lng: float

class RouteRequest(BaseModel):
    waypoints: List[Waypoint]
    optimize: bool = True

# --- Endpoints ---

@app.get("/")
async def root():
    return {
        "message": "Sky Swachh FastAPI Mock Backend",
        "endpoints": {
            "dumpsites": "/api/dumpsites",
            "routes": "/api/routes",
            "summary": "/api/summary"
        }
    }

@app.get("/api/dumpsites")
async def get_dumpsites():
    if USE_FIRESTORE:
        try:
            docs = db.collection("dump_sites").stream()
            features = []
            for doc in docs:
                d = doc.to_dict()
                features.append({
                    "type": "Feature",
                    "id": doc.id,
                    "geometry": json.loads(d["geometry"]) if isinstance(d.get("geometry"), str) else (d.get("geometry") or {"type": "Point", "coordinates": [d["lng"], d["lat"]]}),
                    "properties": {
                        "id": doc.id,
                        "ward": d.get("ward", ""),
                        "severity": d.get("severity", "medium"),
                        "status": d.get("status", "detected"),
                        "description": d.get("description", ""),
                        "priorityScore": d.get("priorityScore", 50),
                        "reportedDate": str(d.get("reportedDate", "")),
                        "source": d.get("source", "manual"),
                        "lat": d.get("lat"),
                        "lng": d.get("lng"),
                    }
                })
            return {"type": "FeatureCollection", "features": features}
        except Exception as e:
            print(f"Firestore error, falling back to JSON: {e}")
            return _fallback_dumpsites
    return _fallback_dumpsites


@app.get("/api/dump-polygons")
async def get_dump_polygons():
    """Returns only dump_site polygons from the training GeoJSON for map overlay."""
    dump_features = [
        f for f in _training_polygons["features"]
        if f["properties"]["class_name"] == "dump_site"
    ]
    return {"type": "FeatureCollection", "features": dump_features}

@app.get("/api/waste-processing-units")
async def get_waste_processing_units():
    return _waste_processing_units

@app.get("/api/dry-waste-centres")
async def get_dry_waste_centres():
    return _dry_waste_centres

@app.get("/api/routes")
async def get_routes():
    return routes

@app.get("/api/summary")
async def get_summary():
    return summary

@app.post("/api/reports")
async def create_report(report: Report):
    new_id = f"CR-{random.randint(100000, 999999)}"
    doc = {
        "id": new_id,
        "lat": report.lat,
        "lng": report.lng,
        "ward": report.ward,
        "waste_type": report.waste_type,
        "description": report.description,
        "photo": report.photo,
        "status": "pending",
        "source": "citizen_report",
        "severity": "medium",
        "priorityScore": 60,
        "geometry": {"type": "Point", "coordinates": [report.lng, report.lat]},
        "reportedDate": firestore.SERVER_TIMESTAMP if USE_FIRESTORE else None,
    }
    if USE_FIRESTORE:
        db.collection("dump_sites").document(new_id).set(doc)
    print(f"New citizen report saved: {new_id}")
    return {"id": new_id, "status": "success"}

@app.post("/api/assignments")
async def create_assignment(assignment: TruckAssignment):
    print(f"Assigning truck: {assignment}")
    new_id = f"TRK-{random.randint(1000, 9999)}"
    # Convert Pydantic model to dict and add ID
    assignment_data = assignment.dict()
    assignment_data["id"] = new_id
    assignments_db.append(assignment_data)
    return assignment_data

@app.get("/api/assignments")
async def get_assignments():
    return assignments_db

@app.post("/api/optimize-route")
async def optimize_route(req: RouteRequest):
    """
    Optimizes a route through waypoints using OSRM.
    If optimize=True, uses /trip API for TSP optimization.
    Otherwise uses /route API for fixed sequence.
    """
    if not req.waypoints or len(req.waypoints) < 2:
        return {"error": "At least 2 waypoints are required"}

    # Format coordinates for OSRM (lng,lat)
    coords_str = ";".join([f"{w.lng},{w.lat}" for w in req.waypoints])
    
    # Use OSRM Public Demo Server
    base_url = "https://router.project-osrm.org"
    service = "trip" if req.optimize else "route"
    
    # For trip service: source=first means keep the first waypoint as start
    params = "source=first&geometries=geojson&overview=full"
    if not req.optimize:
        params = "geometries=geojson&overview=full"

    url = f"{base_url}/{service}/v1/driving/{coords_str}?{params}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("code") != "Ok":
            return {"error": f"OSRM Error: {data.get('code')}"}

        # For trip, the geometry is in the 'trips' list
        # For route, the geometry is in the 'routes' list
        result_key = "trips" if req.optimize else "routes"
        
        if not data.get(result_key):
             return {"error": "No route found"}

        route_data = data[result_key][0]
        
        # OSRM Trip returns 'waypoints' with 'waypoint_index' mapping back to input
        optimized_order = []
        if req.optimize:
            # Sort waypoints by their trip_index to get the visiting order
            wps = sorted(data["waypoints"], key=lambda x: x["waypoint_index"])
            # Actually OSRM trip returns waypoints in the order they appear in the result
            # But we want to know which input index corresponds to which stop
            optimized_order = [wp["waypoint_index"] for wp in data["waypoints"]]

        return {
            "geometry": route_data["geometry"], # GeoJSON LineString
            "distance": route_data["distance"], # meters
            "duration": route_data["duration"], # seconds
            "optimized_order": optimized_order
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/geocode")
async def geocode(q: str):
    """
    Geocodes a query string using Photon (OSM-based).
    Restricted to Bengaluru area for better results.
    """
    if not q:
        return []
    
    # Photon API with Bengaluru bounding box/center bias
    # Lon: 77.5946, Lat: 12.9716 (Bengaluru)
    url = f"https://photon.komoot.io/api/?q={q}&lon=77.59&lat=12.97&limit=5"
    
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            
            # Simple filtering/formatting
            results.append({
                "name": props.get("name", ""),
                "street": props.get("street", ""),
                "district": props.get("district", ""),
                "city": props.get("city", ""),
                "lat": geom.get("coordinates", [0, 0])[1],
                "lng": geom.get("coordinates", [0, 0])[0],
                "display_name": f"{props.get('name', '')}, {props.get('district', '') or props.get('city', '')}".strip(", ")
            })
        return results
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/route")
async def get_simple_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float):
    """
    Generates a simple A to B route using OSRM.
    """
    coords_str = f"{start_lng},{start_lat};{end_lng},{end_lat}"
    url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?geometries=geojson&overview=full"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("code") != "Ok":
            return {"error": f"OSRM Error: {data.get('code')}"}

        route_data = data["routes"][0]
        return {
            "geometry": route_data["geometry"],
            "distance": route_data["distance"],
            "duration": route_data["duration"]
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Change host to 127.0.0.1 so the console shows a clickable local URL
    uvicorn.run(app, host="127.0.0.1", port=8000)
