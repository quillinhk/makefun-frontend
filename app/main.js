// A make.fun frontend: the board of live bounties, a bounty page, its
// leaderboard and an account's public profile, on hash routes.
//
//   #/                          the board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard that bounty's leaderboard
//   #/u/<handle>                an account's public profile
//
// window.__shotReady is false while a page loads and true once its data
// is on screen, so a screenshot script knows when to capture.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import {
  boardPage,
  boardRows,
  bountyPage,
  leaderboardPage,
  loadingPage,
  noticePage,
  profilePage,
} from './views.js';

const app = document.getElementById('app');

/** The board's loaded bounties, sort, search and paging cursor. */
const boardState = { items: [], cursor: null, sort: 'deadline', query: '' };
/** How many of a leaderboard's long tail are on screen, per bounty. */
const restShown = new Map();
const REST_STEP = 25;

function setTitle(text) {
  document.title = text ? `${text} | make.fun` : 'make.fun — bounties, leaderboards, profiles';
}

function show(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function fail(err) {
  const status = err?.status;
  const message =
    status === 404
      ? 'make.fun has no such page (404). It may have been removed, or the address is wrong.'
      : `make.fun did not answer (${status ?? 'network error'}). Check the connection and try again.`;
  show(noticePage('Not found', message));
}

/** Re-render only the board's list and count, keeping the toolbar's focus. */
function refreshBoardList() {
  const list = document.getElementById('board-list');
  const count = document.getElementById('board-count');
  if (!list || !count) return;
  const { rows, shown } = boardRows(boardState);
  list.innerHTML = rows;
  count.textContent = `${shown} shown · ${boardState.items.length} loaded`;
}

async function renderBoard() {
  setTitle('');
  if (boardState.items.length === 0) {
    window.__shotReady = false;
    app.innerHTML = loadingPage();
    try {
      const data = await getBounties();
      boardState.items = data.items ?? [];
      boardState.cursor = data.next_cursor ?? null;
    } catch (err) {
      fail(err);
      return;
    }
  }
  show(boardPage(boardState));
  renderBoardWiring();
}

function renderBoardWiring() {
  const sort = document.getElementById('sort');
  const q = document.getElementById('q');
  const more = document.getElementById('more');
  sort?.addEventListener('change', () => {
    boardState.sort = sort.value;
    refreshBoardList();
  });
  q?.addEventListener('input', () => {
    boardState.query = q.value;
    refreshBoardList();
  });
  more?.addEventListener('click', async () => {
    more.disabled = true;
    more.textContent = 'Loading…';
    try {
      const data = await getBounties(boardState.cursor);
      boardState.items = boardState.items.concat(data.items ?? []);
      boardState.cursor = data.next_cursor ?? null;
      show(boardPage(boardState));
      renderBoardWiring();
    } catch (err) {
      more.disabled = false;
      more.textContent = 'Load more bounties';
      fail(err);
    }
  });
}

async function renderBounty(slug) {
  window.__shotReady = false;
  app.innerHTML = loadingPage();
  try {
    const b = await getBounty(slug);
    setTitle(b.title);
    show(bountyPage(b));
  } catch (err) {
    setTitle('');
    fail(err);
  }
}

async function renderLeaderboard(slug) {
  window.__shotReady = false;
  app.innerHTML = loadingPage();
  try {
    const lb = await getLeaderboard(slug);
    setTitle(`${lb.competition.title} — leaderboard`);
    const shown = restShown.get(slug) ?? REST_STEP;
    show(leaderboardPage(lb, shown));
    const moreRest = document.getElementById('more-rest');
    moreRest?.addEventListener('click', () => {
      restShown.set(slug, shown + REST_STEP);
      renderLeaderboard(slug);
    });
  } catch (err) {
    setTitle('');
    fail(err);
  }
}

async function renderProfile(handle) {
  window.__shotReady = false;
  app.innerHTML = loadingPage();
  try {
    const p = await getProfile(handle);
    setTitle(p.display_name ?? p.handle);
    show(profilePage(p));
  } catch (err) {
    setTitle('');
    fail(err);
  }
}

function route() {
  const hash = location.hash || '#/';
  const bounty = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
  const single = hash.match(/^#\/bounty\/([^/]+)$/);
  const profile = hash.match(/^#\/u\/([^/]+)$/);
  if (bounty) return renderLeaderboard(decodeURIComponent(bounty[1]));
  if (single) return renderBounty(decodeURIComponent(single[1]));
  if (profile) return renderProfile(decodeURIComponent(profile[1]));
  return renderBoard();
}

document.getElementById('lookup')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const handle = document.getElementById('handle').value.trim();
  if (handle) location.hash = `#/u/${encodeURIComponent(handle)}`;
});

window.addEventListener('hashchange', route);
route();
