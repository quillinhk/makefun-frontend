// The four surfaces, each a function from API data to HTML.
// The board keeps its sort, search and paging in the caller's state;
// the leaderboard's long tail is shown 25 rows at a time.

import { date, esc, md, money, num, stillOpen, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid in. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const feeText = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} fee` : 'free to enter');

/** Open / closing soon / ended, by the deadline alone. */
function openTag(b) {
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms <= 0) return '<span class="tag ended">ended</span>';
  if (ms < 86400000) return '<span class="tag soon">closing soon</span>';
  return '<span class="tag open">open</span>';
}

function bountyFacts(b) {
  return `<ul class="facts">
    <li class="pot">Pot <b>${pot(b)}</b></li>
    <li>${feeText(b)}</li>
    <li>${timeLeft(b.deadline)}</li>
    <li>${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</li>
    <li>${esc(b.category ?? '')}</li>
  </ul>`;
}

/** The board's rows and count for the current sort and search. */
export function boardRows(state) {
  const q = state.query.trim().toLowerCase();
  let items = state.items.filter(
    (b) => !q || `${b.title} ${b.category ?? ''} ${b.summary ?? ''}`.toLowerCase().includes(q),
  );
  const by = {
    // Closing soonest: still-open bounties first (soonest deadline first),
    // then ended ones, so the top of the board is always live.
    deadline: (a, b) =>
      (stillOpen(a) ? 0 : 1) - (stillOpen(b) ? 0 : 1) || new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
    entries: (a, b) => Number(b.submissionCount) - Number(a.submissionCount),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
  }[state.sort];
  items = [...items].sort(by);
  const rows = items
    .map(
      (b) => `<li>
        <h2><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h2>
        <p class="summary">${esc(b.summary ?? '')}</p>
        ${bountyFacts(b)}
        <p>${openTag(b)}</p>
      </li>`,
    )
    .join('');
  return { rows: rows || '<li>No bounties match.</li>', shown: items.length };
}

/** The board: every loaded bounty, sorted and filtered by the state. */
export function boardPage(state) {
  const { rows, shown } = boardRows(state);
  return `<h1>Open bounties</h1>
    <p class="lede">Live bounties on make.fun, with each one's pot, entry fee and time left. Pots grow as entry fees are paid in.</p>
    <div class="toolbar" role="search">
      <label for="sort">Sort</label>
      <select id="sort" name="sort">
        <option value="deadline"${state.sort === 'deadline' ? ' selected' : ''}>Closing soonest</option>
        <option value="pot"${state.sort === 'pot' ? ' selected' : ''}>Largest pot</option>
        <option value="entries"${state.sort === 'entries' ? ' selected' : ''}>Most entries</option>
        <option value="title"${state.sort === 'title' ? ' selected' : ''}>Title A–Z</option>
      </select>
      <label for="q">Search</label>
      <input id="q" name="q" type="search" placeholder="title or category" value="${esc(state.query)}">
      <span class="count" id="board-count">${num(shown)} shown · ${num(state.items.length)} loaded</span>
    </div>
    <ul class="board" id="board-list">${rows}</ul>
    ${state.cursor ? '<p class="center"><button class="btn" id="more" type="button">Load more bounties</button></p>' : ''}`;
}

/** The rewards table, from the live per-place amounts when present. */
function rewardsTable(b) {
  const now = Array.isArray(b.rewardsNow) && b.rewardsNow.length > 0
    ? b.rewardsNow.map((r) => [r.place, r.amountUsd])
    : Object.entries(b.rewards ?? {}).map(([place, amount]) => [Number(place), amount]);
  if (now.length === 0) return '<p>No reward table published.</p>';
  const rows = now
    .map(
      ([place, amount]) =>
        `<tr><td>${place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : `${place}th`}</td><td class="num">${money(amount)}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Place</th><th class="num">Reward now</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** One bounty: summary, facts, live rewards, description and rules. */
export function bountyPage(b) {
  const open = stillOpen(b);
  return `<p><a href="#/">← All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <p>${openTag(b)} ${b.acceptingSubmissions ? '' : '<span class="tag">not accepting entries</span>'}</p>
    <dl class="factgrid">
      <div><dt>Live pot</dt><dd>${pot(b)}</dd></div>
      <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</dd></div>
      <div><dt>Deadline</dt><dd>${date(b.deadline)}</dd></div>
      <div><dt>Time left</dt><dd>${timeLeft(b.deadline)}</dd></div>
      <div><dt>Entries</dt><dd>${num(b.submissionCount)}</dd></div>
      <div><dt>Category</dt><dd>${esc(b.category ?? '—')}</dd></div>
    </dl>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <p class="lede">The pot is the prize plus every entry fee paid in; the table shows each place's share of it now.</p>
    ${b.description ? `<h2>Description</h2><div class="md">${md(b.description)}</div>` : ''}
    ${b.rules ? `<h2>Rules</h2><div class="md">${md(b.rules)}</div>` : ''}
    <p><a href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">View on make.fun →</a></p>`;
}

/** A bounty's leaderboard: the top rows in full, the rest compact. */
export function leaderboardPage(lb, shown) {
  const cols = lb.columns ?? [];
  const rankKey = lb.rank_key ?? 'judge';
  const head = cols.map((c) => `<th class="num">${esc(c.title)}</th>`).join('');
  const topRows = (lb.entries ?? [])
    .map((e) => {
      const cells = cols
        .map((c) => `<td class="num">${esc(e.display?.[c.key] ?? e.values?.[c.key] ?? '—')}</td>`)
        .join('');
      const who = e.handle
        ? `<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>`
        : '—';
      return `<tr${e.house ? ' class="me"' : ''}><td class="num">${num(e.rank)}</td><td>${who}</td><td>${esc(e.title ?? '')}${e.house ? ' <span class="tag">house</span>' : ''}</td>${cells}</tr>`;
    })
    .join('');

  const rest = lb.rest ?? [];
  const restRows = rest.slice(0, shown).map((e) => {
    const value = e.display ?? (e.value != null ? num(e.value) : '—');
    return `<tr><td class="num">${num(e.rank)}</td><td>${e.handle ? `<a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>` : '—'}</td><td>${esc(e.title ?? '')}</td><td class="num">${esc(value)}</td></tr>`;
  }).join('');

  return `<p><a href="#/bounty/${encodeURIComponent(lb.competition.slug)}">← ${esc(lb.competition.title)}</a></p>
    <h1>${esc(lb.competition.title)} — leaderboard</h1>
    <p class="lede">${esc(lb.title ?? 'Results')} · ${esc(lb.phase?.title ?? '')} phase · ranked by ${esc(rankKey)}${lb.metrics_withheld ? ' · some metrics withheld' : ''}</p>
    ${topRows
      ? `<table><thead><tr><th class="num">#</th><th>Entrant</th><th>Entry</th>${head}</tr></thead><tbody>${topRows}</tbody></table>`
      : '<p class="notice">No ranked entries yet.</p>'}
    ${rest.length > 0
      ? `<h2>Rest of the field (${num(rest.length)})</h2>
      <table><thead><tr><th class="num">#</th><th>Entrant</th><th>Entry</th><th class="num">${esc(rankKey)}</th></tr></thead><tbody>${restRows}</tbody></table>
      ${rest.length > shown ? `<p class="center"><button class="btn ghost" id="more-rest" type="button">Show ${Math.min(25, rest.length - shown)} more</button></p>` : ''}`
      : ''}`;
}

/** An account's public profile. */
export function profilePage(p) {
  const rec = p.record ?? {};
  const avatar = p.image ?? p.avatar;
  const head = avatar
    ? `<img class="avatar" crossorigin="anonymous" src="${esc(avatar)}" alt="">`
    : `<span class="avatar fallback" aria-hidden="true">${esc((p.display_name ?? p.handle ?? '?').slice(0, 1).toUpperCase())}</span>`;
  const solutions = (p.solutions ?? [])
    .map((s) => {
      const comp = s.competition ?? {};
      return `<li>
        <a href="#/bounty/${encodeURIComponent(comp.slug ?? '')}">${esc(s.title ?? '')}</a>
        <span> · ${esc(comp.title ?? '')}</span>
        <br><span class="place">${s.placement ? `Placed #${num(s.placement)}` : 'Unplaced'}</span>
        ${s.prize_usd ? ` · won ${money(s.prize_usd)}` : ''}
        ${s.score?.display ? ` · score ${esc(s.score.display)}` : ''}
        <br><span class="lede">Entered ${date(s.entered_at)}</span>
      </li>`;
    })
    .join('');

  return `<div class="profile-head">${head}<div>
      <h1>${esc(p.display_name ?? p.handle)}</h1>
      <p class="handle">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
    </div></div>
    <div class="stats">
      <div><b>${num(rec.competitions_entered)}</b><span>entered</span></div>
      <div><b>${num(rec.competitions_placed)}</b><span>placed</span></div>
      <div><b>${num(rec.competitions_won)}</b><span>won</span></div>
      <div><b>${num(rec.podium_finishes)}</b><span>podiums</span></div>
      <div><b>${rec.best_placement ? `#${num(rec.best_placement)}` : '—'}</b><span>best place</span></div>
      <div><b>${money(rec.prize_usd)}</b><span>prize money</span></div>
    </div>
    <h2>Entries (${num((p.solutions ?? []).length)} shown)</h2>
    ${solutions ? `<ul class="solutions">${solutions}</ul>` : '<p>No entries shown.</p>'}
    <p><a href="https://make.fun/u/${encodeURIComponent(p.handle)}">View on make.fun →</a></p>`;
}

/** A short page for a missing thing or a failed fetch. */
export function noticePage(title, message) {
  return `<h1>${esc(title)}</h1><p class="notice error">${esc(message)}</p><p><a href="#/">← Back to the board</a></p>`;
}

export function loadingPage() {
  return '<p class="loading">Loading…</p>';
}
