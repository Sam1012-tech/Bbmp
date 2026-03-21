"""
Run once to seed Firestore with dump sites from training_polygons.geojson.
Usage: python seed_firestore.py
Requires: GOOGLE_APPLICATION_CREDENTIALS env var pointing to your serviceAccount.json
"""
import json
import firebase_admin
from firebase_admin import credentials, firestore
from pathlib import Path

# --- Init ---
cred = credentials.Certificate("serviceAccount.json")  # put your key file here
firebase_admin.initialize_app(cred)
db = firestore.client()

DATA_DIR = Path(__file__).parent / "data"

def compute_centroid(multipolygon_coords):
    """Get approximate centroid from first polygon ring."""
    ring = multipolygon_coords[0][0]
    lngs = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return sum(lats) / len(lats), sum(lngs) / len(lngs)

def seed_dump_sites():
    with open(DATA_DIR / "training_polygons.geojson") as f:
        geojson = json.load(f)

    dump_features = [
        f for f in geojson["features"]
        if f["properties"]["class_name"] == "dump_site"
    ]

    print(f"Found {len(dump_features)} dump site polygons")

    for feature in dump_features:
        props = feature["properties"]
        lat, lng = compute_centroid(feature["geometry"]["coordinates"])

        doc = {
            "geojson_id": str(props["id"]),
            "ward": "Marathahalli",         # update per feature if you have ward data
            "severity": "high",
            "status": "detected",
            "source": "ai_detected",
            "confidence": props["confidence"],
            "description": f"AI-detected dump site (polygon {props['id']})",
            "priorityScore": 90,
            "lat": lat,
            "lng": lng,
            "geometry": json.dumps(feature["geometry"]),  # stringify — Firestore can't store nested arrays
            "reportedDate": firestore.SERVER_TIMESTAMP,
        }

        db.collection("dump_sites").add(doc)
        print(f"  Added dump site {props['id']} at ({lat:.5f}, {lng:.5f})")

    # Seed the manual dump_sites.json entries too
    with open(DATA_DIR / "dump_sites.json") as f:
        manual = json.load(f)

    for feature in manual["features"]:
        props = feature["properties"]
        coords = feature["geometry"]["coordinates"]
        doc = {
            "geojson_id": props["id"],
            "ward": props["ward"],
            "severity": props["severity"],
            "status": props["status"],
            "source": "manual",
            "description": props["description"],
            "priorityScore": props["priorityScore"],
            "lat": coords[1],
            "lng": coords[0],
            "geometry": json.dumps(feature["geometry"]),  # stringify
            "reportedDate": firestore.SERVER_TIMESTAMP,
        }
        db.collection("dump_sites").add(doc)
        print(f"  Added manual site: {props['ward']}")

    print("Done seeding Firestore.")

if __name__ == "__main__":
    seed_dump_sites()
