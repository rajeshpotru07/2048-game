/* 2048 – game logic and UI.
 *
 * Structure:
 *   1. Pure game logic  (slide, hasMoves) – no DOM, easy to read and test
 *   2. State + actions  (newGame, move, undo)
 *   3. Rendering        (render)
 *   4. Input            (keyboard, swipe, buttons)
 */
(() => {
  'use strict';

  const SIZE = 4;
  const WIN_VALUE = 2048;
  const BEST_KEY = '2048-best-score';

  /* ============ 1. Pure game logic ============ */

  // A "line" is the row (left/right moves) or column (up/down moves) a tile travels along.
  // k is how far a tile is from the edge it slides toward (0 = touching that edge).
  // Handling every direction through (line, k) means we write the merge rules only once.
  const lineOf = (t, d) => (d === 'left' || d === 'right' ? t.r : t.c);
  const kOf = (t, d) => ({ left: t.c, right: SIZE - 1 - t.c, up: t.r, down: SIZE - 1 - t.r })[d];
  const posOf = (line, k, d) => ({
    left: [line, k], right: [line, SIZE - 1 - k], up: [k, line], down: [SIZE - 1 - k, line],
  })[d];

  /* Slide all tiles in direction d.
   * Returns { tiles, ghosts, gained, moved }.
   *  - ghosts: tiles absorbed by a merge (kept only so we can animate them)
   *  - moved:  false if nothing changed – an invalid move */
  function slide(tiles, d) {
    const out = [], ghosts = [];
    let gained = 0, moved = false;

    for (let line = 0; line < SIZE; line++) {
      const row = tiles.filter(t => lineOf(t, d) === line).sort((a, b) => kOf(a, d) - kOf(b, d));
      let k = 0;        // next free slot in this line
      let prev = null;  // last tile placed in this line

      for (const t of row) {
        // Merge rule: equal to the previous tile AND that tile hasn't already merged this move.
        // The `merged` flag is why [2,2,2,2] becomes [4,4] and not [8].
        if (prev && prev.v === t.v && !prev.merged) {
          const [r, c] = posOf(line, k - 1, d);
          ghosts.push({ id: t.id, r, c });
          prev.v *= 2;
          prev.merged = true;
          gained += prev.v;
          moved = true;
        } else {
          const [r, c] = posOf(line, k, d);
          if (r !== t.r || c !== t.c) moved = true;
          prev = { id: t.id, v: t.v, r, c, merged: false };
          out.push(prev);
          k++;
        }
      }
    }
    return { tiles: out, ghosts, gained, moved };
  }

  // True if any cell is empty or two neighbours are equal.
  function hasMoves(tiles) {
    if (tiles.length < SIZE * SIZE) return true;
    const grid = {};
    tiles.forEach(t => { grid[t.r + ',' + t.c] = t.v; });
    return tiles.some(t => grid[t.r + ',' + (t.c + 1)] === t.v || grid[(t.r + 1) + ',' + t.c] === t.v);
  }

  /* ============ 2. State + actions ============ */

  let state;            // { tiles, score, won }
  let history = null;   // snapshot before the last move (one level of undo)
  let best = 0;
  let nextId = 1;

  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { /* storage blocked */ }

  const copyTiles = tiles => tiles.map(({ id, v, r, c }) => ({ id, v, r, c }));
  const snapshot = () => ({ tiles: copyTiles(state.tiles), score: state.score, won: state.won });

  function spawn() {
    const taken = new Set(state.tiles.map(t => t.r * SIZE + t.c));
    const free = [];
    for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) free.push(i);
    if (!free.length) return;
    const i = free[Math.floor(Math.random() * free.length)];
    // Classic odds: 90% a 2, 10% a 4.
    state.tiles.push({ id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r: Math.floor(i / SIZE), c: i % SIZE, isNew: true });
  }

  function newGame() {
    state = { tiles: [], score: 0, won: false };
    history = null;
    spawn(); spawn();
    closeOverlay();
    render();
    say('New game started.');
  }

  function move(dir) {
    if (!overlay.hidden) return;                 // a dialog is open – ignore the board
    const res = slide(state.tiles, dir);

    // Invalid move: no history, no new tile, no score change.
    if (!res.moved) {
      boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
      return;
    }

    history = snapshot();
    state.tiles = res.tiles;
    state.score += res.gained;
    spawn();

    if (state.score > best) {
      best = state.score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* ignore */ }
    }

    render(res.ghosts, res.gained);
    say(`Moved ${dir}. Score ${state.score}.`);

    if (!state.won && state.tiles.some(t => t.v >= WIN_VALUE)) {
      state.won = true;                          // only celebrate once; afterwards play on
      openOverlay('win');
    } else if (!hasMoves(state.tiles)) {
      openOverlay('over');
    }
  }

  function undo() {
    if (!history) return;
    state = { tiles: copyTiles(history.tiles), score: history.score, won: history.won };
    history = null;
    closeOverlay();
    render();
    say('Undid last move.');
  }

  function confirmNewGame() {
    // Only ask when real progress would be lost.
    if (state.score > 0 && overlay.hidden && !window.confirm('Start a new game? Your current game will be lost.')) return;
    newGame();
  }

  /* ============ 3. Rendering ============ */

  const $ = id => document.getElementById(id);
  const boardEl = $('board'), tilesEl = $('tiles'), overlay = $('overlay');
  const keepBtn = $('keep-btn'), overlayUndoBtn = $('overlay-undo-btn'), overlayNewBtn = $('overlay-new-btn');
  const els = new Map();   // tile id -> DOM element, so tiles keep their element and can animate

  for (let i = 0; i < SIZE * SIZE; i++) $('grid').appendChild(document.createElement('div'));

  function render(ghosts = [], gained = 0) {
    const live = new Set(state.tiles.map(t => t.id));
    const ghostMap = new Map(ghosts.map(g => [g.id, g]));

    // Tiles that no longer exist: slide merged ones into place, then remove; drop others instantly.
    for (const [id, el] of els) {
      if (live.has(id)) continue;
      els.delete(id);
      const g = ghostMap.get(id);
      if (g) {
        el.classList.add('ghost');
        el.style.setProperty('--r', g.r);
        el.style.setProperty('--c', g.c);
        setTimeout(() => el.remove(), 130);
      } else {
        el.remove();
      }
    }

    for (const t of state.tiles) {
      let el = els.get(t.id);
      const isFresh = !el;
      if (isFresh) {
        el = document.createElement('div');
        el.setAttribute('role', 'img');
        els.set(t.id, el);
      }
      el.className = 'tile v' + (t.v <= WIN_VALUE ? t.v : 'super');
      el.textContent = t.v;
      el.setAttribute('aria-label', `${t.v}, row ${t.r + 1}, column ${t.c + 1}`);
      el.style.setProperty('--r', t.r);
      el.style.setProperty('--c', t.c);
      if (isFresh) tilesEl.appendChild(el);      // added after position is set, so it doesn't slide in
      if (t.isNew) el.classList.add('new');
      if (t.merged) { void el.offsetWidth; el.classList.add('merged'); }
    }

    $('score').textContent = state.score;
    $('best').textContent = best;
    $('undo-btn').disabled = !history;

    if (gained > 0) {
      const pop = document.createElement('span');
      pop.className = 'pop';
      pop.textContent = '+' + gained;
      $('score').parentElement.appendChild(pop);
      setTimeout(() => pop.remove(), 700);
    }
  }

  function openOverlay(kind) {
    const win = kind === 'win';
    $('overlay-title').textContent = win ? 'You made 2048!' : 'No moves left';
    $('overlay-text').textContent = win
      ? 'Keep going for a higher score, or start fresh.'
      : `Final score ${state.score}. Undo your last move or start again.`;
    keepBtn.hidden = !win;
    overlayUndoBtn.hidden = win || !history;
    overlay.hidden = false;
    say($('overlay-title').textContent + '. ' + $('overlay-text').textContent);
    (win ? keepBtn : overlayNewBtn).focus({ preventScroll: true });
  }

  function closeOverlay() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    boardEl.focus({ preventScroll: true });
  }

  function say(msg) { $('status').textContent = msg; }

  /* ============ 4. Input ============ */

  const KEYS = {
    arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
    arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
  };

  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;      // leave browser shortcuts alone
    const dir = KEYS[e.key.toLowerCase()];
    if (!dir) return;
    e.preventDefault();                                   // stop arrow keys from scrolling the page
    move(dir);
  });

  // Swipe detection: compare where the finger went down and where it lifted.
  let touchStart = null;
  const SWIPE_MIN = 24;   // pixels – smaller movements count as taps
  boardEl.addEventListener('touchstart', e => {
    touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  boardEl.addEventListener('touchmove', e => e.preventDefault(), { passive: false });   // no page scroll while swiping
  boardEl.addEventListener('touchend', e => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  $('new-btn').addEventListener('click', confirmNewGame);
  $('undo-btn').addEventListener('click', undo);
  overlayNewBtn.addEventListener('click', newGame);
  overlayUndoBtn.addEventListener('click', undo);
  keepBtn.addEventListener('click', () => {
    closeOverlay();
    if (!hasMoves(state.tiles)) openOverlay('over');      // edge case: won on the very last move
  });

  newGame();
})();
