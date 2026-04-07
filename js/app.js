let ROWS = 28;
let COLS = 42;

/** @type {boolean[][]} */
let walls = [];
let start = [Math.floor(ROWS / 2), 2];
let goal = [Math.floor(ROWS / 2), COLS - 3];

let tool = "wall";
let animating = false;
let animTimer = null;
let lastResult = null;
let compareMode = false;
let lastResultB = null;

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

const gridSizeSelect = document.getElementById("grid-size");
const customSizeDiv = document.getElementById("custom-size");
const customRowsInput = document.getElementById("custom-rows");
const customColsInput = document.getElementById("custom-cols");
const btnApplyCustom = document.getElementById("apply-custom-size");
const btnRandomMaze = document.getElementById("random-maze");
const densityRange = document.getElementById("wall-density");
const densityLabel = document.getElementById("density-label");

const gridElB = document.getElementById("grid-b");
const gridWrapA = document.getElementById("grid-wrap-a");
const gridWrapB = document.getElementById("grid-wrap-b");
const gridLabelA = document.getElementById("grid-label-a");
const gridLabelB = document.getElementById("grid-label-b");
const algoSelectB = document.getElementById("algorithm-b");
const compareRow = document.getElementById("compare-row");
const btnCompare = document.getElementById("toggle-compare");
const metricsSingle = document.getElementById("metrics-single");
const metricsCompare = document.getElementById("metrics-compare");
const mcHeaderA = document.getElementById("mc-header-a");
const mcHeaderB = document.getElementById("mc-header-b");
const mcExpandedA = document.getElementById("mc-expanded-a");
const mcPathA = document.getElementById("mc-path-a");
const mcTimeA = document.getElementById("mc-time-a");
const mcExpandedB = document.getElementById("mc-expanded-b");
const mcPathB = document.getElementById("mc-path-b");
const mcTimeB = document.getElementById("mc-time-b");
const appEl = document.querySelector(".app");

function initGridData() {
  walls = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
}

function cellIndex(r, c) {
  return r * COLS + c;
}

function autoFitCellSize() {
  const wrapA = gridEl.parentElement;
  let available = wrapA.clientWidth - 24; // padding
  if (compareMode && !gridWrapB.classList.contains("hidden")) {
    const wrapB = gridElB.parentElement;
    const availB = wrapB.clientWidth - 24;
    available = Math.min(available, availB);
  }
  const ideal = Math.floor(available / COLS) - 1; // minus gap
  const size = Math.max(8, Math.min(22, ideal));
  gridEl.style.setProperty("--cell-size", size + "px");
  gridElB.style.setProperty("--cell-size", size + "px");
}

function buildGridDom() {
  gridEl.innerHTML = "";
  autoFitCellSize();
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
  if (compareMode) buildGridBDom();
}

function buildGridBDom() {
  gridElB.innerHTML = "";
  gridElB.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size, 22px))`;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const div = document.createElement("div");
      div.className = "cell";
      div.dataset.r = String(r);
      div.dataset.c = String(c);
      gridElB.appendChild(div);
    }
  }
}

function fullRedrawB(opts = {}) {
  const cells = gridElB.children;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = cells[cellIndex(r, c)];
      paintCell(el, r, c, opts);
    }
  }
}

function applyStepOnGrid(targetGrid, step, pathAfter) {
  const { frontier, explored } = setsFromStep(step);
  const expanded = step.expanded;
  const pathSet = pathAfter ? pathSetFromPath(pathAfter) : null;
  const cells = targetGrid.children;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      paintCell(cells[cellIndex(r, c)], r, c, {
        frontier, explored, pathSet, expanded, showSearch: true,
      });
    }
  }
}

function showFinalPathOnGrid(targetGrid, result) {
  const pathSet = pathSetFromPath(result.path);
  const cells = targetGrid.children;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = cells[cellIndex(r, c)];
      el.className = "cell";
      if (walls[r][c]) { el.classList.add("wall"); continue; }
      if (r === start[0] && c === start[1]) el.classList.add("start");
      if (r === goal[0] && c === goal[1]) el.classList.add("goal");
      const k = `${r},${c}`;
      if (result.found && pathSet.has(k)) el.classList.add("path");
    }
  }
}

function resizeGrid(newRows, newCols) {
  stopAnimation();
  ROWS = Math.max(5, Math.min(60, newRows));
  COLS = Math.max(5, Math.min(80, newCols));
  start = [Math.floor(ROWS / 2), Math.min(2, COLS - 2)];
  goal = [Math.floor(ROWS / 2), Math.max(COLS - 3, 2)];
  initGridData();
  buildGridDom();
  syncGridSizeSelect();
  resetSearchVisual();
}

function syncGridSizeSelect() {
  const key = `${ROWS},${COLS}`;
  const match = [...gridSizeSelect.options].find((o) => o.value === key);
  if (match) {
    gridSizeSelect.value = key;
    customSizeDiv.style.display = "none";
  } else {
    gridSizeSelect.value = "custom";
    customSizeDiv.style.display = "flex";
    customRowsInput.value = ROWS;
    customColsInput.value = COLS;
  }
}

function generateRandomWalls(density) {
  stopAnimation();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      walls[r][c] = Math.random() < density;
    }
  }
  walls[start[0]][start[1]] = false;
  walls[goal[0]][goal[1]] = false;
  resetSearchVisual();
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

async function runSearchRemote(algoId) {
  const r = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: algoId || algoSelect.value,
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
  const html = data.algorithms
    .map((a) => `<option value="${a.id}">${a.name}</option>`)
    .join("");
  algoSelect.innerHTML = html;
  algoSelectB.innerHTML = html;
  if (data.algorithms.length > 1) algoSelectB.selectedIndex = 1;
}

function algoNameById(id) {
  const opt = [...algoSelect.options].find((o) => o.value === id);
  return opt ? opt.textContent : id;
}

function toggleCompareMode() {
  compareMode = !compareMode;
  btnCompare.classList.toggle("active", compareMode);
  btnCompare.textContent = compareMode ? "Single mode" : "Compare mode";
  appEl.classList.toggle("compare-mode", compareMode);
  compareRow.classList.toggle("hidden", !compareMode);
  gridWrapB.classList.toggle("hidden", !compareMode);
  metricsSingle.classList.toggle("hidden", compareMode);
  metricsCompare.classList.toggle("hidden", !compareMode);
  gridLabelA.textContent = compareMode ? algoNameById(algoSelect.value) : "";
  gridLabelB.textContent = compareMode ? algoNameById(algoSelectB.value) : "";
  stopAnimation();
  // Rebuild both grids after layout reflow so cell sizes are correct
  buildGridDom();
  resetSearchVisual();
}

function updateCompareMetrics(resultA, timeMsA, resultB, timeMsB) {
  mcHeaderA.textContent = algoNameById(algoSelect.value);
  mcHeaderB.textContent = algoNameById(algoSelectB.value);
  mcExpandedA.textContent = String(resultA.nodesExpanded);
  mcPathA.textContent = resultA.path ? String(Math.max(0, resultA.path.length - 1)) : "—";
  mcTimeA.textContent = `${Number(timeMsA).toFixed(2)} ms`;
  mcExpandedB.textContent = String(resultB.nodesExpanded);
  mcPathB.textContent = resultB.path ? String(Math.max(0, resultB.path.length - 1)) : "—";
  mcTimeB.textContent = `${Number(timeMsB).toFixed(2)} ms`;
}

async function runCompareVisualization() {
  if (!validateSearch()) return;
  stopAnimation();
  statusEl.className = "status";
  statusEl.textContent = "Searching with both algorithms…";
  btnRun.disabled = true;

  let outA, outB;
  try {
    [outA, outB] = await Promise.all([
      runSearchRemote(algoSelect.value),
      runSearchRemote(algoSelectB.value),
    ]);
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

  const resultA = { found: outA.found, nodesExpanded: outA.nodesExpanded, path: outA.path, steps: outA.steps };
  const resultB = { found: outB.found, nodesExpanded: outB.nodesExpanded, path: outB.path, steps: outB.steps };
  lastResult = resultA;
  lastResultB = resultB;

  updateCompareMetrics(resultA, outA.timeMs, resultB, outB.timeMs);

  gridLabelA.textContent = algoNameById(algoSelect.value);
  gridLabelB.textContent = algoNameById(algoSelectB.value);

  const foundAny = resultA.found || resultB.found;
  if (!foundAny) {
    statusEl.textContent = "No path exists for either algorithm.";
    statusEl.className = "status error";
    fullRedraw({ showSearch: false });
    fullRedrawB({ showSearch: false });
    return;
  }

  statusEl.textContent = "Animating comparison…";
  statusEl.className = "status success";

  const stepsA = resultA.steps;
  const stepsB = resultB.steps;
  const maxLen = Math.max(stepsA.length, stepsB.length);
  let i = 0;
  animating = true;
  btnRun.textContent = "Stop";
  const delay = () => 520 - Number(speedRange.value);

  function tick() {
    if (!animating) return;
    if (i >= maxLen) {
      if (resultA.found) showFinalPathOnGrid(gridEl, resultA);
      else fullRedraw({ showSearch: false });
      if (resultB.found) showFinalPathOnGrid(gridElB, resultB);
      else fullRedrawB({ showSearch: false });
      statusEl.textContent = "Comparison complete.";
      stopAnimation();
      return;
    }
    if (i < stepsA.length) {
      const showPathA = i === stepsA.length - 1;
      applyStepOnGrid(gridEl, stepsA[i], showPathA ? resultA.path : null);
    }
    if (i < stepsB.length) {
      const showPathB = i === stepsB.length - 1;
      applyStepOnGrid(gridElB, stepsB[i], showPathB ? resultB.path : null);
    }
    i += 1;
    animTimer = setTimeout(tick, delay());
  }

  tick();
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

  if (compareMode) {
    let outA, outB;
    try {
      [outA, outB] = await Promise.all([
        runSearchRemote(algoSelect.value),
        runSearchRemote(algoSelectB.value),
      ]);
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

    const resultA = { found: outA.found, nodesExpanded: outA.nodesExpanded, path: outA.path, steps: outA.steps };
    const resultB = { found: outB.found, nodesExpanded: outB.nodesExpanded, path: outB.path, steps: outB.steps };
    lastResult = resultA;
    lastResultB = resultB;
    updateCompareMetrics(resultA, outA.timeMs, resultB, outB.timeMs);
    gridLabelA.textContent = algoNameById(algoSelect.value);
    gridLabelB.textContent = algoNameById(algoSelectB.value);

    if (!resultA.found && !resultB.found) {
      statusEl.textContent = "No path exists for either algorithm.";
      statusEl.className = "status error";
      fullRedraw({ showSearch: false });
      fullRedrawB({ showSearch: false });
      return;
    }

    if (resultA.found) {
      const lastA = resultA.steps[resultA.steps.length - 1];
      applyStepOnGrid(gridEl, lastA, resultA.path);
    } else { fullRedraw({ showSearch: false }); }

    if (resultB.found) {
      const lastB = resultB.steps[resultB.steps.length - 1];
      applyStepOnGrid(gridElB, lastB, resultB.path);
    } else { fullRedrawB({ showSearch: false }); }

    statusEl.textContent = "Showing final state for both algorithms.";
    statusEl.className = "status success";
    return;
  }

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
  statusEl.className = "status success";
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
  mcExpandedA.textContent = "—"; mcPathA.textContent = "—"; mcTimeA.textContent = "—";
  mcExpandedB.textContent = "—"; mcPathB.textContent = "—"; mcTimeB.textContent = "—";
  fullRedraw({ showSearch: false });
  if (compareMode) fullRedrawB({ showSearch: false });
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
    if (compareMode) {
      if (lastResult && lastResult.found) showFinalPathOnGrid(gridEl, lastResult);
      if (lastResultB && lastResultB.found) showFinalPathOnGrid(gridElB, lastResultB);
    } else {
      if (lastResult && lastResult.found) showFinalPath(lastResult);
    }
    return;
  }
  if (compareMode) runCompareVisualization();
  else runVisualization();
});

btnStep.addEventListener("click", () => {
  stepOnce();
});

btnResetSearch.addEventListener("click", resetSearchVisual);

btnCompare.addEventListener("click", toggleCompareMode);

algoSelect.addEventListener("change", () => {
  if (compareMode) gridLabelA.textContent = algoNameById(algoSelect.value);
});

algoSelectB.addEventListener("change", () => {
  if (compareMode) gridLabelB.textContent = algoNameById(algoSelectB.value);
});
btnClearWalls.addEventListener("click", () => {
  if (animating) return;
  initGridData();
  fullRedraw({ showSearch: false });
});

gridSizeSelect.addEventListener("change", () => {
  const val = gridSizeSelect.value;
  if (val === "custom") {
    customSizeDiv.style.display = "flex";
    return;
  }
  customSizeDiv.style.display = "none";
  const [r, c] = val.split(",").map(Number);
  resizeGrid(r, c);
});

btnApplyCustom.addEventListener("click", () => {
  const r = parseInt(customRowsInput.value, 10) || 20;
  const c = parseInt(customColsInput.value, 10) || 35;
  resizeGrid(r, c);
});

btnRandomMaze.addEventListener("click", () => {
  const density = Number(densityRange.value) / 100;
  generateRandomWalls(density);
});

densityRange.addEventListener("input", () => {
  densityLabel.textContent = densityRange.value + "%";
});

window.addEventListener("resize", () => {
  autoFitCellSize();
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size, 22px))`;
  if (compareMode) {
    gridElB.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size, 22px))`;
  }
});

async function boot() {
  initGridData();
  buildGridDom();
  syncToolButtons();
  syncGridSizeSelect();
  speedLabel.textContent = speedRange.value;
  densityLabel.textContent = densityRange.value + "%";
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
