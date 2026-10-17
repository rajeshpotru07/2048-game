# 2048

A polished 2048 puzzle game built with plain HTML, CSS and JavaScript. There is **nothing to install and no build step**.

## Prerequisites

- A modern web browser (Chrome, Edge, Firefox or Safari, any version from 2023 or later).

That's all. Node.js and Python are optional (see "Option B").

## Run it

**Option A – double-click (simplest)**

1. Unzip or copy the `2048-game` folder somewhere on your computer.
2. Double-click `index.html`. It opens in your browser and you can play immediately.

**Option B – local web server (optional)**

Use this if your browser doesn't save the best score when opening files directly, or if you want to test on your phone over Wi-Fi.

1. Open a terminal inside the `2048-game` folder.
2. Run **one** of these:
   - Python 3: `python3 -m http.server 8000` (on Windows: `py -m http.server 8000`)
   - Node.js: `npx serve .`
3. Open `http://localhost:8000` (for `serve`, use the address it prints).
4. To test on a phone on the same Wi-Fi, open `http://<your-computer-ip>:8000` on the phone.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure: scores, buttons, board, win/game-over dialog, instructions |
| `style.css` | All styling: colors, responsive layout, tile colors, animations, focus styles, reduced-motion rules |
| `game.js` | Game logic, rendering, keyboard/swipe input, undo, best-score saving |
| `README.md` | This file |

## Controls

- **Move:** arrow keys or W A S D; swipe on touch screens.
- **Undo:** the Undo button takes back your last move (one step).
- **New game:** the New game button (asks for confirmation if a game is in progress).
- After reaching 2048 you can **Keep going** or start a **New game**.

## Notes for learners

`game.js` is split into four labelled sections. Start with `slide()` in section 1: it handles all four directions with one set of merge rules. Common tweaks:

- Change spawn odds: `Math.random() < 0.9` in `spawn()`.
- Change the win tile: `WIN_VALUE` at the top of `game.js` (also update the `.v2048` style if desired).
- Change tile colors: the `.v2`, `.v4`, ... rules in `style.css`.

## Troubleshooting

- **Best score isn't remembered:** private/incognito windows and some `file://` setups block saving. Use Option B, or a normal window.
- **Page scrolls on swipe:** make sure you swipe on the board itself; swipes elsewhere scroll normally by design.


this is the weeeeeeeeeeeeeeeeeeeeeeeee





this is the 2nd commit...............................



this is 3rd change..........................



