'use strict';

function parsePuzzle(input) {
  const s = String(input || '').trim();
  if (s.length !== 81) throw new Error('Puzzle must be 81 characters.');
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let i = 0; i < 81; i++) {
    const ch = s[i];
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (ch === '.' || ch === '0') grid[r][c] = 0;
    else if (ch >= '1' && ch <= '9') grid[r][c] = Number(ch);
    else throw new Error('Puzzle may only contain digits 0-9 or "."');
  }
  return grid;
}

function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

function boxIndex(r, c) {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

function isValidGrid(grid) {
  const rowSeen = Array.from({ length: 9 }, () => new Set());
  const colSeen = Array.from({ length: 9 }, () => new Set());
  const boxSeen = Array.from({ length: 9 }, () => new Set());

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (!v) continue;
      if (v < 1 || v > 9) return false;
      const b = boxIndex(r, c);
      if (rowSeen[r].has(v) || colSeen[c].has(v) || boxSeen[b].has(v)) return false;
      rowSeen[r].add(v);
      colSeen[c].add(v);
      boxSeen[b].add(v);
    }
  }
  return true;
}

function candidatesFor(grid, r, c) {
  if (grid[r][c]) return [];
  const used = new Set();

  for (let k = 0; k < 9; k++) {
    if (grid[r][k]) used.add(grid[r][k]);
    if (grid[k][c]) used.add(grid[k][c]);
  }

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (grid[rr][cc]) used.add(grid[rr][cc]);
    }
  }

  const res = [];
  for (let v = 1; v <= 9; v++) if (!used.has(v)) res.push(v);
  return res;
}

function pickNextCellMRV(grid) {
  let best = null;
  let bestCand = null;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c]) continue;
      const cand = candidatesFor(grid, r, c);
      if (cand.length === 0) return { r, c, cand: [] };
      if (!best || cand.length < bestCand.length) {
        best = { r, c };
        bestCand = cand;
        if (cand.length === 1) return { r, c, cand };
      }
    }
  }

  if (!best) return null;
  return { r: best.r, c: best.c, cand: bestCand };
}

function solveByBacktrackingTimed(grid, maxSolutions, timeLimitMs) {
  const g = cloneGrid(grid);
  let count = 0;
  let solution = null;
  const start = Date.now();
  let nodes = 0;

  function timedOut() {
    return (Date.now() - start) > timeLimitMs;
  }

  function dfs() {
    if (count >= maxSolutions) return;
    if (timedOut()) throw new Error('timeout');

    nodes++;
    if (nodes % 5000 === 0 && timedOut()) throw new Error('timeout');

    const next = pickNextCellMRV(g);
    if (!next) {
      count++;
      if (count === 1) solution = cloneGrid(g);
      return;
    }
    if (next.cand.length === 0) return;

    const { r, c, cand } = next;
    for (const v of cand) {
      g[r][c] = v;
      if (isValidGrid(g)) dfs();
      g[r][c] = 0;
      if (count >= maxSolutions) return;
    }
  }

  if (!isValidGrid(g)) return { status: 'done', count: 0, solution: null, nodes };
  try {
    dfs();
    return { status: 'done', count, solution, nodes };
  } catch (e) {
    if (String(e && e.message) === 'timeout') {
      return { status: 'timeout', count, solution, nodes };
    }
    throw e;
  }
}

function gridToString(grid) {
  let out = '';
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) out += grid[r][c] ? String(grid[r][c]) : '.';
  return out;
}

self.onmessage = (ev) => {
  const msg = ev.data || {};
  try {
    const puzzle = String(msg.puzzle || '');
    const maxSolutions = Number(msg.maxSolutions || 2);
    const timeLimitMs = Number(msg.timeLimitMs || 800);

    const grid = parsePuzzle(puzzle);
    const res = solveByBacktrackingTimed(grid, maxSolutions, timeLimitMs);

    self.postMessage({
      ok: true,
      status: res.status,
      count: res.count,
      nodes: res.nodes,
      solution: res.solution ? gridToString(res.solution) : null
    });
  } catch (e) {
    self.postMessage({ ok: false, error: String(e && e.message ? e.message : e) });
  }
};
