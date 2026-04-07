# Project 2 — Short report: comparing search algorithms

**Course:** COMP 6721 — Applied AI  
**Tool:** Grid path-finding visualizer (BFS, DFS, Greedy best-first, A\*, UCS).

## Setup used for comparison

- **Grid:** Same obstacle layout, same start and goal for each run.
- **Cost model:** Each orthogonal step costs 1; walls are impassable.
- **Heuristic (Greedy, A\*):** Manhattan distance to the goal (admissible and consistent for this grid).

Record **nodes expanded**, **path length (number of edges)**, and **execution time** from the visualizer after each run.

## Expected behavior (qualitative)

| Algorithm | Complete? | Optimal path (unweighted)? | Typical frontier shape |
|-----------|-----------|----------------------------|-------------------------|
| **BFS** | Yes (finite grid) | Yes — expands in increasing path length | Ring / wavefront around start |
| **UCS** | Yes (non-negative costs) | Yes — always pops minimum *g* | Same wavefront as BFS when every step costs 1 |
| **DFS** | Yes (finite grid) | No — depends on expansion order | Often deep, narrow “tunnel” along one branch |
| **Greedy** | No (can get stuck in dead ends in theory; on grid often finds something) | No — follows h only | Tends to aim at goal, may explore misleading corridors |
| **A\*** | Yes (with admissible h) | Yes — same optimality as UCS/BFS here | Focused “cone” toward goal, fewer expansions than BFS when h is informative |

## What we observed (fill in after your experiments)

1. **Open area:** With few obstacles, **A\***, **BFS**, and **UCS** all find a shortest path; **A\*** usually expands **fewer** nodes than BFS/UCS because the heuristic guides search (BFS and UCS are often similar on a unit-cost grid).

2. **Maze / narrow passages:** **DFS** may take a **long** path or wander before finding the goal; **Greedy** may expand fewer nodes than BFS when the heuristic points well, but the path need not be shortest.

3. **Execution time:** For small grids, wall-clock time is dominated by the browser and animation; **nodes expanded** is the fairer measure of algorithmic effort.

## Conclusion

- For **shortest paths** on an unweighted grid, **BFS**, **UCS**, and **A\*** are appropriate; **A\*** is usually more efficient when a good heuristic exists.
- **DFS** is useful to see **non-optimal** behavior and different **exploration order**, not for shortest routes.
- **Greedy** illustrates **heuristic-only** decisions and the risk of **suboptimal** solutions compared to **A\***, which balances cost-so-far and heuristic.

---

*Replace this section with your team’s actual numbers and screenshots if your instructor asks for them.*
