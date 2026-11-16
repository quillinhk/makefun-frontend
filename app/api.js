// make.fun's public API, read-only GET, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// Every answer is cached and revalidated: an entry stays fresh for a minute
// without a request, then the next read revalidates it with If-None-Match
// and a 304 reuses the cached body (a 304 costs nothing against the rate
// limit). The API's ETags turn each minute, so a revalidation after the
// minute turns answers 200 with a new tag even when nothing changed.

const API = 'https://make.fun/api';
const FRESH_MS = 60_000;

/** url -> { etag, body, at } */
const cache = new Map();

async function get(path) {
  const url = API + path;
  const hit = cache.get(url);
  const headers = {};
  if (hit?.etag && Date.now() - hit.at > FRESH_MS) headers['If-None-Match'] = hit.etag;
  if (hit && Date.now() - hit.at <= FRESH_MS) return hit.body;

  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error(`make.fun ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('ETag'), body, at: Date.now() });
  return body;
}

/** The live bounties, one page at a time: { items, next_cursor }. */
export const getBounties = (cursor) =>
  get('/competitions?status=open&activity=times&limit=50' + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''));

/** One bounty, by its slug: summary, description, rules, rewards, dates. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: top rows plus the compact rest of the field. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=first`);

/** An account's public profile, by its handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
