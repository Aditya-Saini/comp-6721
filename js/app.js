const ROWS = 28;
const COLS = 42;

/** @type {boolean[][]} */
let walls = [];
let start = [Math.floor(ROWS / 2), 2];
let goal = [Math.floor(ROWS / 2), COLS - 3];

let tool = "wall";
let animating = false;
let animTimer = null;
let lastResult = null;

const gridEl = document.getElementById("grid");
const algoSelect = document.getElementById("algorithm");
const speedRange = document.getElementById("speed");
const speedLabel = document.getElementById("speed-label");
const btnRun = document.getElementById("run");
const btnStep = document.getElementById("step");
const btnResetSearch = document.getElementById("reset-search");
const btnClearWalls = document.getElementById("clear-walls");
const statusEl = document.getElementById("status");
const mExpanded = document.getElementById("m-expanded");
const mPath = document.getElementById("m-path");
const mTime = document.getElementById("m-time");

function initGridData() {
  walls = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
}

function cellIndex(r, c) {
  return r * COLS + c;
}

function buildGridDom() {
  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size, 22px))`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.r = String(r);
      div.dataset.c = String(c);
      div.addEventListener("mousedown", onCellPointer);
      div.addEventListener("mouseenter", (e) => {
        if (e.buttons === 1) onCellPointer(e);
      });
      gridEl.appendChild(div);
    }
  }
}

function paintCell(el, r, c, opts = {}) {
  const { frontier, explored, pathSet, expanded, showSearch } = opts;
  el.className = "cell";
  if (walls[r][c]) {
    el.classList.add("wall");
    return;
  }
  if (r === start[0] && c === start[1]) el.classList.add("start");
  if (r === goal[0] && c === goal[1]) el.classList.add("goal");
  if (!showSearch) return;
  const k = `${r},${c}`;
  if (pathSet && pathSet.has(k)) el.classList.add("path");
  else if (expanded && r === expanded[0] && c === expanded[1]) el.classList.add("just-expanded");
  else if (frontier && frontier.has(k)) el.classList.add("frontier");
  else if (explored && explored.has(k)) el.classList.add("explored");
}

function fullRedraw(opts = {}) {
  const cells = gridEl.children;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = cells[cellIndex(r, c)];
      paintCell(el, r, c, opts);
    }
  }
}

function setsFromStep(step) {
  const frontier = new Set(step.frontier.map(([r, c]) => `${r},${c}`));
  const explored = new Set(step.explored.map(([r, c]) => `${r},${c}`));
  return { frontier, explored };
}

function stopAnimation() {
  if (animTimer) {
    clearTimeout(animTimer);
    animTimer = null;
  }
  animating = false;
  btnRun.textContent = "Run search";
  btnRun.disabled = false;
}

function validateSearch() {
  if (walls[start[0]][start[1]]) {
    statusEl.textContent = "Start sits on a wall. Move start or clear that cell.";
    statusEl.className = "status error";
    return false;
  }
  if (walls[goal[0]][goal[1]]) {
    statusEl.textContent = "Goal sits on a wall. Move goal or clear that cell.";
    statusEl.className = "status error";
    return false;
  }
  return true;
}

/** Normalize Python API JSON to the shape the UI expects */
function normalizeSearchResponse(data) {
  return {
    found: data.found,
    nodesExpanded: data.nodes_expanded,
    path: data.path,
    steps: data.steps,
    timeMs: data.time_ms,
  };
}

async function runSearchRemote() {
  const r = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: algoSelect.value,
      walls,
      start,
      goal,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || `Server error (${r.status})`);
  }
  return normalizeSearchResponse(data);
}

async function loadAlgorithmOptions() {
  const r = await fetch("/api/algorithms");
  if (!r.ok) {
    throw new Error(`Algorithms API failed (${r.status})`);
  }
  const data = await r.json();
  algoSelect.innerHTML = data.algorithms
    .map((a) => `<option value="${a.id}">${a.name}</option>`)
    .join("");
}

function pathSetFromPath(path) {
  const s = new Set();
  if (!path) return s;
  for (const [r, c] of path) s.add(`${r},${c}`);
  return s;
}

function applyStep(step, pathAfter) {
  const { frontier, explored } = setsFromStep(step);
  const expanded = step.expanded;
  const pathSet = pathAfter ? pathSetFromPath(pathAfter) : null;
  const cells = gridEl.children;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      paintCell(cells[cellIndex(r, c)], r, c, {
        frontier,
        explored,
        pathSet,
        expanded,
        showSearch: true,
      });
    }
  }
}

function showFinalPath(result) {
  const pathSet = pathSetFromPath(result.path);
  const cells = gridEl.children;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = cells[cellIndex(r, c)];
      el.className = "cell";
      if (walls[r][c]) {
        el.classList.add("wall");
        continue;
      }
      if (r === start[0] && c === start[1]) el.classList.add("start");
      if (r === goal[0] && c === goal[1]) el.classList.add("goal");
      const k = `${r},${c}`;
      if (result.found && pathSet.has(k)) el.classList.add("path");
    }
  }
}

function updateMetrics(result, execMs) {
  mExpanded.textContent = String(result.nodesExpanded);
  mPath.textContent = result.path ? String(Math.max(0, result.path.length - 1)) : "—";
  mTime.textContent = `${Number(execMs).toFixed(2)} ms`;
}

async function runVisualization() {
  if (!validateSearch()) return;
  stopAnimation();
  statusEl.className = "status";
  statusEl.textContent = "Searching…";
  btnRun.disabled = true;

  let out;
  try {
    out = await runSearchRemote();
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message === "Failed to fetch"
        ? "Cannot reach the Python server. From the project folder run: python3 server.py"
        : e.message || String(e);
    statusEl.textContent = msg;
    statusEl.className = "status error";
    btnRun.disabled = false;
    return;
  }

  btnRun.disabled = false;

  const result = {
    found: out.found,
    nodesExpanded: out.nodesExpanded,
    path: out.path,
    steps: out.steps,
  };
  lastResult = result;
  updateMetrics(result, out.timeMs);

  if (!result.found) {
    statusEl.textContent = "No path exists (goal unreachable).";
    statusEl.className = "status error";
    fullRedraw({ showSearch: false });
    return;
  }

  const edges = result.path.length - 1;
  const id = algoSelect.value;
  const shortest = id === "bfs" || id === "astar" || id === "ucs";
  statusEl.textContent = shortest
    ? `Done. Shortest path (${edges} edges) — BFS, UCS, and A* are optimal on this unweighted grid.`
    : `Done. Path length: ${edges} edges (DFS / Greedy need not be shortest).`;
  statusEl.className = "status success";

  const steps = result.steps;
  let i = 0;
  animating = true;
  btnRun.textContent = "Stop";
  const delay = () => 520 - Number(speedRange.value);

  function tick() {
    if (!animating) return;
    if (i >= steps.length) {
      showFinalPath(result);
      stopAnimation();
      return;
    }
    const showPathOnLast = i === steps.length - 1;
    applyStep(steps[i], showPathOnLast ? result.path : null);
    i += 1;
    animTimer = setTimeout(tick, delay());
  }

  tick();
}

async function stepOnce() {
  if (!validateSearch() || animating) return;
  statusEl.textContent = "Searching…";
  btnStep.disabled = true;
  let out;
  try {
    out = await runSearchRemote();
  } catch (e) {
    const msg =
      e instanceof TypeError && e.message === "Failed to fetch"
        ? "Cannot reach the Python server. Run: python3 server.py"
        : e.message || String(e);
    statusEl.textContent = msg;
    statusEl.className = "status error";
    btnStep.disabled = false;
    return;
  }
  btnStep.disabled = false;

  const result = {
    found: out.found,
    nodesExpanded: out.nodesExpanded,
    path: out.path,
    steps: out.steps,
  };
  lastResult = result;
  updateMetrics(result, out.timeMs);

  if (!result.found) {
    statusEl.textContent = "No path exists.";
    statusEl.className = "status error";
    fullRedraw({ showSearch: false });
    return;
  }
  statusEl.textContent = "Showing final state (all expansions). Use Run for animation.";
  statusEl.className = "status";
  const last = result.steps[result.steps.length - 1];
  applyStep(last, result.path);
}

function resetSearchVisual() {
  stopAnimation();
  statusEl.textContent = "";
  statusEl.className = "status";
  mExpanded.textContent = "—";
  mPath.textContent = "—";
  mTime.textContent = "—";
  fullRedraw({ showSearch: false });
}

function onCellPointer(e) {
  if (animating) return;
  const r = Number(e.currentTarget.dataset.r);
  const c = Number(e.currentTarget.dataset.c);
  if (tool === "wall") {
    walls[r][c] = !walls[r][c];
  } else if (tool === "erase") {
    walls[r][c] = false;
  } else if (tool === "start") {
    if (!walls[r][c]) start = [r, c];
  } else if (tool === "goal") {
    if (!walls[r][c]) goal = [r, c];
  }
  fullRedraw({ showSearch: false });
}

function syncToolButtons() {
  document.querySelectorAll(".tool-btn[data-tool]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tool === tool);
  });
}

speedRange.addEventListener("input", () => {
  speedLabel.textContent = speedRange.value;
});

document.querySelectorAll(".tool-btn[data-tool]").forEach((b) => {
  b.addEventListener("click", () => {
    tool = b.dataset.tool;
    syncToolButtons();
  });
});

btnRun.addEventListener("click", () => {
  if (animating) {
    stopAnimation();
    if (lastResult && lastResult.found) showFinalPath(lastResult);
    return;
  }
  runVisualization();
});

btnStep.addEventListener("click", () => {
  stepOnce();
});

btnResetSearch.addEventListener("click", resetSearchVisual);
btnClearWalls.addEventListener("click", () => {
  if (animating) return;
  initGridData();
  fullRedraw({ showSearch: false });
});

async function boot() {
  initGridData();
  buildGridDom();
  syncToolButtons();
  speedLabel.textContent = speedRange.value;
  try {
    await loadAlgorithmOptions();
  } catch {
    algoSelect.innerHTML = "";
    statusEl.textContent =
      "Start the Python server from this folder: python3 server.py — then refresh the page.";
    statusEl.className = "status error";
  }
  fullRedraw({ showSearch: false });
}

boot();
