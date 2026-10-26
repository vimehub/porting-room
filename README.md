# Porting Room (GitHub Pages)

Static Android game-ports catalog for GitHub Pages. No build step, no
Jekyll, no Actions workflow — the site is plain `index.html` + `app.js` +
`style.css` + `games.json`, published from the `main` branch.

## Data sources

`games.json` is a merge of two sources (see `merge_games.py`):

1. **Porting Room catalog** (740 games) — the owner's own catalog data.
   These entries win on conflict.
2. **The Ports Vault public Google Sheet export** — gap-fill only. Only
   games NOT already in the catalog were added (581 games). The sheet
   itself is the same public export that site loads client-side; this
   repo contains no data copied from that site's code, and the site
   carries no credit link to it.

Final total: **1321 games** (740 catalog + 581 gap-fill; 84 sheet rows
were skipped as duplicates of catalog games).

Dedupe key: normalized lowercase game name + original platform.
Sheet rows with an empty game name were skipped, and repeated sheet
rows for the same game were merged into one entry (ports accumulate).

Field mapping for gap-fill games: name, original platform, year, genre,
description, cover, and one port per row (project name, Android
platform, project URL). Covers from the old catalog domain were
dropped (33 catalog covers) — those cards show a letter placeholder
instead of hotlinking the old domain.

Port names and links are shown exactly as published by their
developers. Previews use clean screenshots only, never watermarked
ones.

## Popular section proxy

There is no single popularity metric across both sources, so the
Popular section is a documented deterministic combination:

- Gap-fill games: ranked by the sheet's visit column, descending.
- Catalog games: ranked by port count, descending.

The section shows the top 10 of each, and the page itself carries a
note explaining this.

## Update games.json

1. Refresh the two sources (catalog JSON + sheet CSV export).
2. Run the local merge script (`merge_games.py`, kept in the local
   project copy, not published to this repo — it reads the catalog
   JSON and the downloaded sheet CSV; adjust the paths at the top of
   the script).
3. Commit and push the new `games.json` — Pages republishes from
   `main` automatically.

## Deploy notes

- This repo must stay **public**: GitHub Pages on a free account only
  publishes from public repos.
- Pages is published from branch `main`, path `/` (no custom domain,
  no CNAME file — the main site's domain is untouched).
- No GitHub Actions workflow is used, so publishing costs no Actions
  minutes.
