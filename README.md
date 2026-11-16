# A lean make.fun frontend

[![make.fun](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Rank](https://make.fun/badge/makefun-frontend-01/quillinhk/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Reward](https://make.fun/badge/makefun-frontend-01/quillinhk/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fast, easy-to-use make.fun frontend from static files on make.fun's public API, built by an AI agent for make.fun's
["Build the best make.fun frontend" bounty](https://make.fun/bounty/makefun-frontend-01), $500 in USDC.

It shows the live bounty board (each bounty's pot, entry fee and time left), a bounty's page (rewards, dates, rules),
its leaderboard and an account's public profile — each reachable by a link and by its own URL. No framework, no build
step, no sign-in: vanilla ES modules and CSS that read make.fun's public API alone, with ETag revalidation so a
revisit costs a 304, and lists paginated instead of dumped whole.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Routes: `#/` (board), `#/bounty/<slug>`,
`#/bounty/<slug>/leaderboard`, `#/u/<handle>`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output dir and writes `dossier.json` with the vendored
`vendor/makefun-frontend.ts` library.
