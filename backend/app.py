from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="Sky Swachh API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

with open('data/dump_sites.json') as f:
    dump_sites = json.load(f)

with open('data/routes.json') as f:
    routes = json.load(f)

with open('data/ward_stats.json') as f:
    ward_stats = json.load(f)

@app.get("/dump-sites", summary="Get all detected illegal dump sites")
def get_dump_sites():
    return dump_sites


@app.get("/routes", summary="Get optimized collection routes")
def get_routes():
    return routes


@app.get("/ward-stats", summary="Get ward-wise violation statistics")
def get_ward_stats():
    return ward_stats
