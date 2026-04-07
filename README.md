# Intelligent path-finding visualizer (COMP 6721 Project 2)

**Backend:** Python (`algorithms.py`) — all search logic and metrics.  
**Frontend:** Same web app as before (`index.html`, `css/styles.css`, `js/app.js`) — layout, grid editor, colors, and animation are unchanged; the browser only draws and calls the API.  
**Server:** Flask (`server.py`) serves those static files and exposes `/api/search`.

## Run the full app

1. Install dependencies (once):

```bash
cd "/path/to/AI"
pip install -r requirements.txt
```

2. Start the server:

```bash
python3 server.py
```

3. Open **http://127.0.0.1:8080** in your browser.

Do **not** open `index.html` as a `file://` URL — the UI must load from the same origin as the API (`/api/search`, `/api/algorithms`).

## API (used by the frontend)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/algorithms` | List `{ id, name }` for the algorithm dropdown |
| `POST` | `/api/search` | Body: `{ "algorithm", "walls", "start", "goal" }` → steps, path, metrics |

`walls` is a 2D array of booleans (`true` = wall). `start` / `goal` are `[row, col]`.

You can also `import` from `algorithms.py` in your own scripts (e.g. `run_search("astar", start, goal, grid)`).

## Project layout

| Path | Role |
|------|------|
| `algorithms.py` | BFS, DFS, Greedy, A\*, UCS + `SearchResult` traces |
| `server.py` | Flask static + JSON API |
| `index.html`, `css/`, `js/app.js` | Visualizer UI |

## Algorithms

Unit-cost 4-neighbor grid; Manhattan heuristic for Greedy and A\*. **BFS**, **UCS**, and **A\*** find shortest paths on this grid.

For a written comparison, see `REPORT.md`.
