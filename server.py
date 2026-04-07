"""
Flask backend: serves the web UI and runs pathfinding in Python (algorithms.py).
"""

from __future__ import annotations

import time
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from algorithms import ALGORITHMS, run_search

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


def _serialize_result(result, time_ms: float) -> dict:
    return {
        "found": result.found,
        "nodes_expanded": result.nodes_expanded,
        "time_ms": round(time_ms, 4),
        "path": [[r, c] for r, c in result.path] if result.path else None,
        "steps": [
            {
                "expanded": [s.expanded[0], s.expanded[1]] if s.expanded else None,
                "frontier": [[a, b] for a, b in s.frontier],
                "explored": [[a, b] for a, b in s.explored],
            }
            for s in result.steps
        ],
    }


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/css/<path:filename>")
def css(filename: str):
    return send_from_directory(BASE_DIR / "css", filename)


@app.route("/js/<path:filename>")
def js(filename: str):
    return send_from_directory(BASE_DIR / "js", filename)


@app.get("/api/algorithms")
def api_algorithms():
    return jsonify(
        {"algorithms": [{"id": k, "name": v[0]} for k, v in ALGORITHMS.items()]}
    )


@app.post("/api/search")
def api_search():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "JSON body required"}), 400

    algo = body.get("algorithm")
    walls = body.get("walls")
    start = body.get("start")
    goal = body.get("goal")

    if algo not in ALGORITHMS:
        return jsonify({"error": f"Unknown algorithm: {algo!r}"}), 400
    if not isinstance(walls, list) or not walls:
        return jsonify({"error": "walls must be a non-empty 2D array"}), 400
    if not isinstance(start, list) or len(start) != 2:
        return jsonify({"error": "start must be [row, col]"}), 400
    if not isinstance(goal, list) or len(goal) != 2:
        return jsonify({"error": "goal must be [row, col]"}), 400

    rows = len(walls)
    if not all(isinstance(row, list) and len(row) == len(walls[0]) for row in walls):
        return jsonify({"error": "walls must be a rectangular 2D array"}), 400
    cols = len(walls[0])

    sr, sc = int(start[0]), int(start[1])
    gr, gc = int(goal[0]), int(goal[1])
    if not (0 <= sr < rows and 0 <= sc < cols and 0 <= gr < rows and 0 <= gc < cols):
        return jsonify({"error": "start or goal out of bounds"}), 400

    grid = [[bool(c) for c in row] for row in walls]

    if grid[sr][sc]:
        return jsonify({"error": "start cannot be on a wall"}), 400
    if grid[gr][gc]:
        return jsonify({"error": "goal cannot be on a wall"}), 400

    t0 = time.perf_counter()
    result = run_search(algo, (sr, sc), (gr, gc), grid)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    return jsonify(_serialize_result(result, elapsed_ms))


if __name__ == "__main__":
    print("Open http://127.0.0.1:8080  (Ctrl+C to stop)")
    app.run(host="127.0.0.1", port=8080, debug=True)
