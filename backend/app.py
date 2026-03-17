from flask import Flask, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)  # Allow React frontend to access

# Load data generated from satellite detection
with open('data/dump_sites.json') as f:
    dump_sites = json.load(f)

with open('data/routes.json') as f:
    routes = json.load(f)

with open('data/ward_stats.json') as f:
    ward_stats = json.load(f)

@app.route('/dump-sites', methods=['GET'])
def get_dump_sites():
    """Returns all detected illegal dump sites"""
    return jsonify(dump_sites)

@app.route('/routes', methods=['GET'])
def get_routes():
    """Returns optimized collection routes"""
    return jsonify(routes)

@app.route('/ward-stats', methods=['GET'])
def get_ward_stats():
    """Returns ward-wise violation statistics"""
    return jsonify(ward_stats)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
