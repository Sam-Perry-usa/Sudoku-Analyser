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

function gridToString(grid) {
  let out = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) out += grid[r][c] ? String(grid[r][c]) : '.';
  }
  return out;
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

function isSolved(grid) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!grid[r][c]) return false;
  return isValidGrid(grid);
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

function buildAllCandidates(grid) {
  const cand = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => null));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      cand[r][c] = grid[r][c] ? [] : candidatesFor(grid, r, c);
    }
  }
  return cand;
}

function applyNakedSingles(grid, cand, steps) {
  let changed = false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c]) continue;
      if (cand[r][c].length === 1) {
        const v = cand[r][c][0];
        grid[r][c] = v;
        steps.push({ technique: 'naked_single', r, c, value: v });
        changed = true;
      }
    }
  }
  return changed;
}

function applyHiddenSingles(grid, cand, steps) {
  let changed = false;

  function place(r, c, v, unit) {
    if (grid[r][c]) return false;
    grid[r][c] = v;
    steps.push({ technique: 'hidden_single', unit, r, c, value: v });
    return true;
  }

  for (let r = 0; r < 9; r++) {
    const places = Array.from({ length: 10 }, () => []);
    for (let c = 0; c < 9; c++) {
      if (grid[r][c]) continue;
      for (const v of cand[r][c]) places[v].push([r, c]);
    }
    for (let v = 1; v <= 9; v++) {
      if (places[v].length === 1) {
        const [rr, cc] = places[v][0];
        if (place(rr, cc, v, { type: 'row', index: r })) changed = true;
      }
    }
  }

  for (let c = 0; c < 9; c++) {
    const places = Array.from({ length: 10 }, () => []);
    for (let r = 0; r < 9; r++) {
      if (grid[r][c]) continue;
      for (const v of cand[r][c]) places[v].push([r, c]);
    }
    for (let v = 1; v <= 9; v++) {
      if (places[v].length === 1) {
        const [rr, cc] = places[v][0];
        if (place(rr, cc, v, { type: 'col', index: c })) changed = true;
      }
    }
  }

  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const places = Array.from({ length: 10 }, () => []);
    for (let rr = br; rr < br + 3; rr++) {
      for (let cc = bc; cc < bc + 3; cc++) {
        if (grid[rr][cc]) continue;
        for (const v of cand[rr][cc]) places[v].push([rr, cc]);
      }
    }
    for (let v = 1; v <= 9; v++) {
      if (places[v].length === 1) {
        const [rr, cc] = places[v][0];
        if (place(rr, cc, v, { type: 'box', index: b })) changed = true;
      }
    }
  }

  return changed;
}

function applyNakedPairs(grid, cand, steps) {
  let changed = false;

  function eliminateFromCells(cells, pairSet, keepCells, meta) {
    let unitChanged = false;
    for (const [r, c] of cells) {
      if (grid[r][c]) continue;
      if (keepCells.some(([rr, cc]) => rr === r && cc === c)) continue;

      const before = cand[r][c].slice();
      const after = before.filter(v => !pairSet.has(v));
      if (after.length !== before.length) {
        cand[r][c] = after;
        unitChanged = true;
        steps.push({
          technique: 'naked_pair',
          unit: meta.unit,
          pair: Array.from(pairSet).sort(),
          affected: { r, c },
          removed: before.filter(v => pairSet.has(v)).sort()
        });
      }
    }
    return unitChanged;
  }

  function scanUnit(cells, meta) {
    const map = new Map();
    for (const [r, c] of cells) {
      if (grid[r][c]) continue;
      const opts = cand[r][c];
      if (opts.length !== 2) continue;
      const key = opts.slice().sort().join('');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push([r, c]);
    }

    for (const [key, positions] of map.entries()) {
      if (positions.length === 2) {
        const pairSet = new Set(key.split('').map(Number));
        const unitChanged = eliminateFromCells(cells, pairSet, positions, meta);
        if (unitChanged) changed = true;
      }
    }
  }

  for (let r = 0; r < 9; r++) {
    scanUnit(Array.from({ length: 9 }, (_, c) => [r, c]), { unit: { type: 'row', index: r } });
  }
  for (let c = 0; c < 9; c++) {
    scanUnit(Array.from({ length: 9 }, (_, r) => [r, c]), { unit: { type: 'col', index: c } });
  }
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells = [];
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) cells.push([rr, cc]);
    scanUnit(cells, { unit: { type: 'box', index: b } });
  }

  return changed;
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

function solveByBacktracking(grid, maxSolutions = 2) {
  const g = cloneGrid(grid);
  let count = 0;
  let solution = null;

  function dfs() {
    if (count >= maxSolutions) return;

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

  if (!isValidGrid(g)) return { count: 0, solution: null };
  dfs();
  return { count, solution };
}

function humanSolve(grid, maxSteps = 10000) {
  if (!isValidGrid(grid)) {
    return { status: 'invalid', grid, steps: [], usedBacktracking: false };
  }

  const steps = [];
  let usedBacktracking = false;

  for (let iter = 0; iter < maxSteps; iter++) {
    if (isSolved(grid)) return { status: 'solved', grid, steps, usedBacktracking };

    const cand = buildAllCandidates(grid);

    let progress = false;
    progress = applyNakedSingles(grid, cand, steps) || progress;
    if (progress) continue;

    progress = applyHiddenSingles(grid, cand, steps) || progress;
    if (progress) continue;

    progress = applyNakedPairs(grid, cand, steps) || progress;
    if (progress) continue;

    usedBacktracking = true;
    const solved = solveByBacktracking(grid, 2);
    if (solved.count === 1 && solved.solution) {
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) grid[r][c] = solved.solution[r][c];
      steps.push({ technique: 'backtracking_fill' });
      return { status: 'solved', grid, steps, usedBacktracking };
    }
    if (solved.count === 0) return { status: 'no_solution', grid, steps, usedBacktracking };
    return { status: 'multiple_solutions', grid, steps, usedBacktracking };
  }

  return { status: 'stopped', grid, steps, usedBacktracking };
}

function estimateDifficulty(techniques, usedBacktracking) {
  if (usedBacktracking) return 'Extreme';

  const rank = {
    naked_single: 1,
    hidden_single: 2,
    naked_pair: 3
  };

  let max = 0;
  for (const t of techniques) max = Math.max(max, rank[t] || 0);

  if (max <= 1) return 'Easy';
  if (max === 2) return 'Medium';
  if (max === 3) return 'Hard';
  return 'Hard';
}

function analyzePuzzle(puzzleString) {
  const grid = parsePuzzle(puzzleString);
  const valid = isValidGrid(grid);

  if (!valid) {
    return {
      input: puzzleString,
      validity: 'invalid',
      solutions: 0,
      solved: false,
      difficulty: 'Invalid',
      techniques: [],
      steps: [],
      solution: null
    };
  }

  const solutionInfo = solveByBacktracking(grid, 2);
  const solutions = solutionInfo.count;

  if (solutions === 0) {
    return {
      input: puzzleString,
      validity: 'valid',
      solutions: 0,
      solved: false,
      difficulty: 'Unsolvable',
      techniques: [],
      steps: [],
      solution: null
    };
  }

  const toSolve = parsePuzzle(puzzleString);
  const human = humanSolve(toSolve);
  const techniques = Array.from(new Set(human.steps.map(s => s.technique)));
  const difficulty = estimateDifficulty(techniques, human.usedBacktracking);

  return {
    input: puzzleString,
    validity: 'valid',
    solutions,
    solved: human.status === 'solved',
    difficulty,
    techniques,
    steps: human.steps.slice(0, 5000),
    solution: solutionInfo.solution ? gridToString(solutionInfo.solution) : null
  };
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderGrid(str) {
  const s = String(str || '').padEnd(81, '.').slice(0, 81);
  const grid = document.createElement('div');
  grid.className = 'grid';

  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const v = s[i] === '.' ? '' : s[i];

    const cell = document.createElement('div');
    cell.className = 'cell';

    if (r === 2 || r === 5) cell.classList.add('sepR');
    if (c === 2 || c === 5) cell.classList.add('sepC');

    cell.textContent = v;
    grid.appendChild(cell);
  }

  const box = document.createElement('div');
  box.className = 'gridBox';
  box.appendChild(grid);
  return box;
}

function setShareLink(puzzleString) {
  const linkEl = document.getElementById('shareLink');
  const base = new URL(window.location.href);
  base.searchParams.set('p', puzzleString);
  linkEl.href = base.toString();
  linkEl.textContent = 'link';
}

function showError(msg) {
  const out = document.getElementById('out');
  out.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'error';
  card.textContent = msg;
  out.appendChild(card);
}

let lastResultJson = null;

function buildResultUI(result) {
  const out = document.getElementById('out');
  out.innerHTML = '';

  lastResultJson = JSON.stringify(result, null, 2);
  document.getElementById('copyJsonBtn').disabled = false;

  setShareLink(result.input.replaceAll(/\s+/g, ''));

  const card1 = document.createElement('div');
  card1.className = 'card';

  const kv = document.createElement('div');
  kv.className = 'kv';
  kv.innerHTML = `
    <div><strong>Validity:</strong> ${escapeHtml(result.validity)}</div>
    <div><strong>Solutions:</strong> ${escapeHtml(result.solutions)}</div>
    <div><strong>Difficulty:</strong> ${escapeHtml(result.difficulty)}</div>
    <div><strong>Solved:</strong> ${escapeHtml(result.solved)}</div>
  `;
  card1.appendChild(kv);

  const tech = document.createElement('div');
  tech.style.marginTop = '10px';
  tech.innerHTML = `<strong>Techniques:</strong> ${escapeHtml((result.techniques || []).join(', ') || 'None')}`;
  card1.appendChild(tech);

  out.appendChild(card1);

  const card2 = document.createElement('div');
  card2.className = 'card';

  const wrap = document.createElement('div');
  wrap.className = 'gridWrap';

  const left = document.createElement('div');
  left.innerHTML = `<h3 style="margin:0 0 10px 0;">Input</h3>`;
  left.appendChild(renderGrid(result.input.replaceAll('0', '.')));

  const right = document.createElement('div');
  right.innerHTML = `<h3 style="margin:0 0 10px 0;">Solution</h3>`;
  if (result.solution) right.appendChild(renderGrid(result.solution));
  else {
    const msg = document.createElement('div');
    msg.style.color = '#666';
    msg.textContent = 'No solution grid available.';
    right.appendChild(msg);
  }

  wrap.appendChild(left);
  wrap.appendChild(right);
  card2.appendChild(wrap);

  out.appendChild(card2);

  const card3 = document.createElement('div');
  card3.className = 'card';

  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'Show JSON';
  summary.style.cursor = 'pointer';

  const pre = document.createElement('pre');
  pre.textContent = lastResultJson;

  details.appendChild(summary);
  details.appendChild(pre);
  card3.appendChild(details);

  out.appendChild(card3);
}

function normalizeInput(s) {
  return String(s || '').trim().replaceAll(/\s+/g, '');
}

const examples = [
  '53..7....6..195....98....6.8...6...34..8..6...2...1.6....28....419..5....8..79',
  '..3.2.6..9..3.5..1..18.64....81.29..7.......8..67.82....26.95..8..2.3..9..5.1.3..',
  '1....7..3.8..3...5..2..6....5..8..7....4....6..1..9....7..2..6...1..9.4..6....8',
  '....8..1.7..2....4..6..1..9...7..5...9...3...5..4...8..9..6..2....5..3.4..2....',
  '8...........36....7..9.2...5...7.......457.....1...3...1....68..85...1..9....4..'
];

let exampleIndex = 0;

function setPuzzleValue(p) {
  document.getElementById('puzzle').value = p;
  document.getElementById('copyJsonBtn').disabled = true;
  lastResultJson = null;
  document.getElementById('out').innerHTML = '';
  const shareEl = document.getElementById('shareLink');
  shareEl.href = '#';
  shareEl.textContent = '—';
}

function analyzeCurrent() {
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;

  try {
    const raw = document.getElementById('puzzle').value;
    const input = normalizeInput(raw);
    const result = analyzePuzzle(input);
    buildResultUI(result);
  } catch (e) {
    showError(String(e && e.message ? e.message : e));
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('analyzeBtn').addEventListener('click', analyzeCurrent);

document.getElementById('anotherExampleBtn').addEventListener('click', () => {
  exampleIndex = (exampleIndex + 1) % examples.length;
  setPuzzleValue(examples[exampleIndex]);
});

document.getElementById('copyJsonBtn').addEventListener('click', async () => {
  if (!lastResultJson) return;
  try {
    await navigator.clipboard.writeText(lastResultJson);
    const btn = document.getElementById('copyJsonBtn');
    const old = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = old; }, 900);
  } catch (e) {
    showError('Copy failed. Your browser may block clipboard access on this page.');
  }
});

(function initFromUrl() {
  const url = new URL(window.location.href);
  const p = url.searchParams.get('p');
  if (p && String(p).trim().length === 81) {
    setPuzzleValue(String(p).trim());
    analyzeCurrent();
  } else {
    setPuzzleValue(examples[0]);
  }
})();
