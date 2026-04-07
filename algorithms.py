"""
Grid pathfinding with step traces (for analysis, testing, and course submission).

Coordinates are (row, col). ``grid[r][c]`` is True for a wall, False for free space.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

Cell = Tuple[int, int]
Grid = List[List[bool]]


@dataclass
class SearchStep:
    """One visualization frame: node expanded (if any), frontier, explored set."""

    expanded: Optional[Cell]
    frontier: List[Cell]
    explored: List[Cell]


@dataclass
class SearchResult:
    steps: List[SearchStep]
    path: Optional[List[Cell]]
    nodes_expanded: int
    found: bool


def _neighbors4(r: int, c: int, rows: int, cols: int, grid: Grid) -> List[Cell]:
    out: List[Cell] = []
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols and not grid[nr][nc]:
            out.append((nr, nc))
    return out


def _reconstruct_path(
    parent: dict[Cell, Cell], start: Cell, goal: Cell
) -> Optional[List[Cell]]:
    if start == goal:
        return [start]
    if goal not in parent:
        return None
    path: List[Cell] = []
    cur: Optional[Cell] = goal
    while cur is not None:
        path.append(cur)
        if cur == start:
            break
        cur = parent.get(cur)
    path.reverse()
    if not path or path[0] != start:
        return None
    return path


def _manhattan(a: Cell, b: Cell) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def search_bfs(start: Cell, goal: Cell, grid: Grid) -> SearchResult:
    rows, cols = len(grid), len(grid[0])
    steps: List[SearchStep] = []
    q: List[Cell] = [start]
    in_queue = {start}
    explored: set[Cell] = set()
    parent: dict[Cell, Cell] = {}

    def record(expanded: Optional[Cell], frontier_cells: List[Cell], ex: set[Cell]) -> None:
        steps.append(
            SearchStep(
                expanded=expanded,
                frontier=[tuple(x) for x in frontier_cells],
                explored=[tuple(x) for x in ex],
            )
        )

    record(None, list(q), explored)

    while q:
        r, c = q.pop(0)
        cell = (r, c)
        in_queue.discard(cell)
        if cell in explored:
            continue
        explored.add(cell)
        record((r, c), q, explored)

        if (r, c) == goal:
            path = _reconstruct_path(parent, start, goal)
            n_exp = sum(1 for s in steps if s.expanded is not None)
            return SearchResult(steps, path, n_exp, True)

        for nr, nc in _neighbors4(r, c, rows, cols, grid):
            nxt = (nr, nc)
            if nxt in explored or nxt in in_queue:
                continue
            parent[nxt] = cell
            in_queue.add(nxt)
            q.append(nxt)

    n_exp = sum(1 for s in steps if s.expanded is not None)
    return SearchResult(steps, None, n_exp, False)


def search_dfs(start: Cell, goal: Cell, grid: Grid) -> SearchResult:
    rows, cols = len(grid), len(grid[0])
    steps: List[SearchStep] = []
    stack: List[Cell] = [start]
    explored: set[Cell] = set()
    parent: dict[Cell, Cell] = {}

    def frontier_order() -> List[Cell]:
        return list(reversed(stack))

    def record(expanded: Optional[Cell], frontier_cells: List[Cell], ex: set[Cell]) -> None:
        steps.append(
            SearchStep(
                expanded=expanded,
                frontier=[tuple(x) for x in frontier_cells],
                explored=[tuple(x) for x in ex],
            )
        )

    record(None, frontier_order(), explored)

    while stack:
        r, c = stack.pop()
        cell = (r, c)
        if cell in explored:
            continue
        explored.add(cell)
        record((r, c), frontier_order(), explored)

        if (r, c) == goal:
            path = _reconstruct_path(parent, start, goal)
            n_exp = sum(1 for s in steps if s.expanded is not None)
            return SearchResult(steps, path, n_exp, True)

        nbrs = _neighbors4(r, c, rows, cols, grid)
        for nr, nc in reversed(nbrs):
            nxt = (nr, nc)
            if nxt in explored:
                continue
            if nxt not in parent:
                parent[nxt] = cell
            stack.append(nxt)

    n_exp = sum(1 for s in steps if s.expanded is not None)
    return SearchResult(steps, None, n_exp, False)


def search_greedy(start: Cell, goal: Cell, grid: Grid) -> SearchResult:
    rows, cols = len(grid), len(grid[0])
    steps: List[SearchStep] = []
    explored: set[Cell] = set()
    parent: dict[Cell, Cell] = {}

    def h(rc: Cell) -> int:
        return _manhattan(rc, goal)

    frontier: List[Cell] = [start]
    frontier_set = {start}

    def sort_frontier() -> None:
        frontier.sort(key=lambda x: (h(x), x[0], x[1]))

    def record(expanded: Optional[Cell], fc: List[Cell], ex: set[Cell]) -> None:
        steps.append(
            SearchStep(
                expanded=expanded,
                frontier=[tuple(x) for x in fc],
                explored=[tuple(x) for x in ex],
            )
        )

    sort_frontier()
    record(None, frontier, explored)

    while frontier:
        sort_frontier()
        r, c = frontier.pop(0)
        cell = (r, c)
        frontier_set.discard(cell)
        if cell in explored:
            continue
        explored.add(cell)
        sort_frontier()
        record((r, c), frontier, explored)

        if (r, c) == goal:
            path = _reconstruct_path(parent, start, goal)
            n_exp = sum(1 for s in steps if s.expanded is not None)
            return SearchResult(steps, path, n_exp, True)

        for nr, nc in _neighbors4(r, c, rows, cols, grid):
            nxt = (nr, nc)
            if nxt in explored or nxt in frontier_set:
                continue
            parent[nxt] = cell
            frontier_set.add(nxt)
            frontier.append(nxt)

    n_exp = sum(1 for s in steps if s.expanded is not None)
    return SearchResult(steps, None, n_exp, False)


def search_astar(start: Cell, goal: Cell, grid: Grid) -> SearchResult:
    rows, cols = len(grid), len(grid[0])
    steps: List[SearchStep] = []
    explored: set[Cell] = set()
    parent: dict[Cell, Cell] = {}
    g_score: dict[Cell, float] = {start: 0.0}

    def h(rc: Cell) -> int:
        return _manhattan(rc, goal)

    def f_score(rc: Cell) -> float:
        return g_score.get(rc, float("inf")) + h(rc)

    frontier: List[Cell] = [start]
    frontier_set = {start}

    def sort_frontier() -> None:
        frontier.sort(key=lambda x: (f_score(x), h(x), x[0], x[1]))

    def record(expanded: Optional[Cell], fc: List[Cell], ex: set[Cell]) -> None:
        steps.append(
            SearchStep(
                expanded=expanded,
                frontier=[tuple(x) for x in fc],
                explored=[tuple(x) for x in ex],
            )
        )

    sort_frontier()
    record(None, frontier, explored)

    while frontier:
        sort_frontier()
        r, c = frontier.pop(0)
        cell = (r, c)
        frontier_set.discard(cell)
        if cell in explored:
            continue
        explored.add(cell)
        sort_frontier()
        record((r, c), frontier, explored)

        if (r, c) == goal:
            path = _reconstruct_path(parent, start, goal)
            n_exp = sum(1 for s in steps if s.expanded is not None)
            return SearchResult(steps, path, n_exp, True)

        g = g_score.get(cell, float("inf"))
        for nr, nc in _neighbors4(r, c, rows, cols, grid):
            nxt = (nr, nc)
            if nxt in explored:
                continue
            tentative = g + 1.0
            prev = g_score.get(nxt)
            if prev is None or tentative < prev:
                parent[nxt] = cell
                g_score[nxt] = tentative
                if nxt not in frontier_set:
                    frontier_set.add(nxt)
                    frontier.append(nxt)

    n_exp = sum(1 for s in steps if s.expanded is not None)
    return SearchResult(steps, None, n_exp, False)


def search_ucs(start: Cell, goal: Cell, grid: Grid) -> SearchResult:
    rows, cols = len(grid), len(grid[0])
    steps: List[SearchStep] = []
    explored: set[Cell] = set()
    parent: dict[Cell, Cell] = {}
    g_score: dict[Cell, float] = {start: 0.0}

    frontier: List[Cell] = [start]
    frontier_set = {start}

    def sort_frontier() -> None:
        frontier.sort(
            key=lambda x: (g_score.get(x, float("inf")), x[0], x[1])
        )

    def record(expanded: Optional[Cell], fc: List[Cell], ex: set[Cell]) -> None:
        steps.append(
            SearchStep(
                expanded=expanded,
                frontier=[tuple(x) for x in fc],
                explored=[tuple(x) for x in ex],
            )
        )

    sort_frontier()
    record(None, frontier, explored)

    while frontier:
        sort_frontier()
        r, c = frontier.pop(0)
        cell = (r, c)
        frontier_set.discard(cell)
        if cell in explored:
            continue
        explored.add(cell)
        sort_frontier()
        record((r, c), frontier, explored)

        if (r, c) == goal:
            path = _reconstruct_path(parent, start, goal)
            n_exp = sum(1 for s in steps if s.expanded is not None)
            return SearchResult(steps, path, n_exp, True)

        g = g_score.get(cell, float("inf"))
        for nr, nc in _neighbors4(r, c, rows, cols, grid):
            nxt = (nr, nc)
            if nxt in explored:
                continue
            tentative = g + 1.0
            prev = g_score.get(nxt)
            if prev is None or tentative < prev:
                parent[nxt] = cell
                g_score[nxt] = tentative
                if nxt not in frontier_set:
                    frontier_set.add(nxt)
                    frontier.append(nxt)

    n_exp = sum(1 for s in steps if s.expanded is not None)
    return SearchResult(steps, None, n_exp, False)


SearchFn = Callable[[Cell, Cell, Grid], SearchResult]

ALGORITHMS: dict[str, tuple[str, SearchFn]] = {
    "bfs": ("Breadth-First Search (BFS)", search_bfs),
    "dfs": ("Depth-First Search (DFS)", search_dfs),
    "greedy": ("Greedy Best-First", search_greedy),
    "astar": ("A*", search_astar),
    "ucs": ("Uniform Cost Search (UCS)", search_ucs),
}


def run_search(algorithm_id: str, start: Cell, goal: Cell, grid: Grid) -> SearchResult:
    """Run a named algorithm; raises KeyError if ``algorithm_id`` is unknown."""
    _, fn = ALGORITHMS[algorithm_id]
    return fn(start, goal, grid)
