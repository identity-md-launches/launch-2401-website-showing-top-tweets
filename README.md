# Pond Intel

A dark green reading room for the Identity.md conversation, with an AI Pepe scouting squad and eight sourced tweet excerpts.

Explore tweets, search by author or excerpt, filter by topic and month, rank by likes/reposts/views/date, bookmark posts, and share original tweet links. Bookmarks stay on the current device. The site does not require an account or wallet.

## Install, develop, preview, rebuild

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

To preview the delivered production site:

```sh
npm run preview
```

To rebuild it after editing:

```sh
npm run typecheck
npm run build
npm run check
```

`dist/index.html` and all runtime assets are included in this repository. Serve the contents of `dist/` from a static host. Vite uses `base: './'`; built assets, images, fonts, favicon and share image use relative URLs. Navigation uses hashes. The production export was tested under `/preview/` with external requests blocked.

`npm run build` performs the TypeScript check and writes a clean production export. Preview the site over HTTP rather than opening the HTML directly as a local file, because browser restrictions on JavaScript modules apply to `file:` URLs.

## Content and limits

This is a selective snapshot checked on **October 21, 2026**, not a live X feed or a complete ranking of all tweets. Its eight posts are dated August–October 2026. Recorded engagement comes from the public FxTwitter API; every card links to its original X post. The About dialog explains selection and storage and lists the sources.

`src/posts.json` contains the original URLs, API source URLs, dates, topic assignments, excerpts and recorded counts. Search covers those excerpts, authors, handles and topics. Update this file deliberately, keep excerpts short, check the linked posts, and update the snapshot date in `src/App.tsx` when refreshing. Rebuild `dist/` afterwards. The snapshot has no runtime API dependency.

An unavailable clipboard reveals a selectable original link and manual-copy guidance. If browser storage is blocked, bookmarks work for the current visit and the site explains the limitation. X and Identity.md links open external services, which may require sign-in. Most author portraits were unavailable during collection; initials identify those authors instead. No portrait is invented.

## Validation performed

Actual commands and evidence are recorded in [artifacts/validation.md](artifacts/validation.md). The final production build, standalone typecheck and export integrity check passed. Chromium interaction checks cover the primary flows, actual clipboard writing, denied clipboard access, unavailable/corrupt storage, dialog keyboard behavior, responsive layouts, text enlargement and reduced motion. Automated accessibility scans reported no violations in the checked states. The pinned taste@1 probe passed **16/16** checks at 320, 390 and 1440px.

WebKit was attempted. Its runtime could not create a browser page because the required headless EGL rendering environment was unavailable after dependency setup. Safari behavior, physical devices, a screen-reader session, and browser-native zoom remain unverified. Automated checks are worker observations, not independent certification.

To run the included browser validation on a supported workstation:

```sh
npx playwright install --with-deps chromium webkit
npm run validate:browser
```

The script serves the real `dist/` under a subpath, runs its checks, writes disposable evidence to `test/scratch/interactions/`, and closes its server and browsers. It reports unavailable WebKit dependencies as a limitation. No screenshots or test scaffolding from `test/scratch/` are required for the build.

## Source map

- `src/App.tsx`: feed, filters, bookmarks, sharing, dialogs and navigation.
- `src/posts.json`: sourced snapshot.
- `src/styles.css`: design tokens, components and responsive rules.
- `public/`: locally bundled fonts, artwork, avatar, favicon and social image.
- `scripts/check-export.mjs`: asset, content and submission-size integrity checks.
- `scripts/validate-browser.mjs`: production interaction and accessibility validation.
- [DESIGN.md](DESIGN.md): implemented design system.
- [artifacts/SOURCES.md](artifacts/SOURCES.md): post provenance and asset credits.

## Submission budgets

The ignore file only excludes generated dependencies, caches, TypeScript build metadata and disposable test scaffolding. These have a **zero-byte submission budget at every nesting level**. `dist/` is included.

| Path | Maximum submitted bytes |
| --- | ---: |
| `dist/` | 2,097,152 |
| `public/` | 2,097,152 |
| `src/` | 524,288 |
| `scripts/` | 131,072 |
| `artifacts/` | 2,097,152 |
| Root manifests, configuration and documentation | 1,048,576 |
| Reserved headroom | 393,216 |
| Total ceiling | 8,388,608 |

Fonts are DM Sans under the SIL Open Font License (`public/fonts/LICENSE.txt`). Runtime license notices are in `public/licenses/runtime.txt`. Design review guidance is adapted from Jakub Krehel’s Better Interface (MIT) and Paul Bakaus’s Impeccable documentation method (Apache-2.0); their notices are preserved in `artifacts/licenses/design-guidance.txt`. Pepe is a character by Matt Furie. Tweet excerpts belong to their authors; this independent site is not affiliated with X or Identity.md.
