# Pond Intel design

## Overview

Pond Intel is a reading room for people following Identity.md builders and AI agents. A forest-green interface frames a comic-style AI Pepe scouting squad. A short illustrated introduction leads directly into a ranked tweet feed. Lime identifies the primary action and selected states; the feed itself stays quiet and readable.

The implementation is React and TypeScript in `src/App.tsx`, with plain CSS in `src/styles.css`. There is one page with Explore and Bookmarks hash states. The right rail supplies context on wide screens; it is not required to complete a task.

## Colors

Canonical primitives and semantic tokens are defined in `src/styles.css` under `:root`.

| Primitive | Value | Semantic use |
| --- | --- | --- |
| `--forest-950` | `#0b130e` | `--color-bg`, `--color-on-accent` |
| `--forest-925` | `#0e1812` | `--color-bg-sidebar` |
| `--forest-900` | `#111e16` | `--color-surface` |
| `--forest-850` | `#17271c` | `--color-surface-hover` |
| `--forest-800` | `#203628` | `--color-selected`, `--color-border` |
| `--forest-700` | `#304738` | `--color-control-border` |
| `--forest-400` | `#9cac9d` | `--color-text-muted` |
| `--forest-100` | `#e9efe7` | `--color-text` |
| `--lime-400` | `#b6ed79` | `--color-accent` |
| `--lime-300` | `#ccf6a2` | `--color-accent-hover`, `--color-focus` |

The hero surface is `#132519`. The secondary network panel uses `#17281c`. Tweet mentions use `#c2d8b7`; the hero description uses `#bdcbbb`; the artwork caption uses `#d5dfc8` on the opaque page background. Initial avatars have muted author-specific colors, which do not imply verification or status.

Measured rendered pairs at 1440px: tweet body 14.71:1, muted tweet metadata 7.21:1, primary button 13.81:1, selected filter 9.49:1, artwork caption 13.66:1. These are identified solid pairs, not a claim about every possible image pixel. See `artifacts/validation.md` for coverage and limits.

## Typography

The only loaded family is **DM Sans**, with Arial and the platform sans-serif as fallbacks. The three local WOFF2 files in `public/fonts/` provide normal styles at 400, 500 and 700. There is no synthetic italic or additional display font. Font display is `swap`; the regular face is preloaded.

| Token | Default size | Role |
| --- | --- | --- |
| `--text-caption` | 13px / `.8125rem` | Metadata, counts, compact controls |
| `--text-small` | 14px / `.875rem` | Navigation, names, secondary copy |
| `--text-body` | 16px / `1rem` | Tweet excerpts, mobile search and share input |
| `--text-section` | 20px / `1.25rem` | Feed heading, mobile brand, dialog headings |
| `--text-stat` | 28px / `1.75rem` | Wide-screen snapshot statistics |
| `--text-display` | 48px / `3rem` | Hero headline |

The hero uses 44px at 1041–1190px, returns to 48px at 761–1040px when the rail is removed, uses 40px at 501–760px, and 32px at 500px and below. At any checked viewport, there are no more than six visible repeated type sizes. Headlines use 700; compact navigation and statistical values use 500; prose uses 400.

The hero line height is 1.02–1.05, with tracking `-.05em`. Tweet excerpts use 1.65 (1.6 below 500px) and a 65ch maximum measure. Other prose uses 1.5–1.65. Metadata has natural tracking. Headings balance wrapping; long handles and excerpts can wrap. Counts use tabular numbers. Input text stays at 16px on phones. Text is selectable.

## Layout

Spacing tokens define 4, 8, 12, 16, 20, 24, 32 and 40px steps. Components also use small optical adjustments such as 6px icon gaps and 18px card insets. Values are visible in `src/styles.css`; this is not a CSS utility framework.

At a normal desktop width, the fixed navigation is 224px wide. The app starts after it. The top bar is at least 76px high, and the main content has 36px side padding. The hero is at least 286px high. The feed and 276px context rail share a grid with a 28px gap. The main wrapper has a 1440px maximum width.

| Breakpoint | Implemented adaptation |
| --- | --- |
| 1600px and above | 44px main gutters, 310px hero minimum, 300px context rail |
| At/below 1190px | 204px navigation, 26px main gutters, 244px rail, 20px grid gap |
| At/below 1040px | Context rail is removed; the feed becomes one column, capped at 760px |
| At/below 760px | Sidebar becomes an inline top navigation; 20px gutters; phone inputs use 16px text |
| At/below 500px | 16px gutters, 210px hero minimum, 32px headline, compact search/sort row and horizontally scrollable topic controls |

The mobile navigation wraps when enlarged text needs more room. The document never relies on a fixed bottom bar. Topic controls scroll within their own row; the partly visible next item signals that more topics are available. Their keyboard focus scrolls into view. Tweet metadata can wrap rather than being clipped. Phone cards use 18px side padding.

Rendered reflow was checked at 320, 390, 760, 1040 and 1440px. The 390px first screen contains the brand, product description, Explore tweets action, search, ranking, filters and the first actual tweet. Text enlargement to 200% and a mobile RTL stress check were run separately from native browser zoom.

## Elevation & Depth

The interface uses flat tonal surfaces and structural borders. Cards do not combine borders with shadows, and there are no nested card containers. A native dialog enters the browser top layer with a `#030a07cc` backdrop and 5px backdrop blur. Its border distinguishes it from the feed. The notification uses a pale solid surface. The hero image has a horizontal alpha mask so the artwork recedes near the copy.

There are no entrance animations, autoplaying media or endless motion. Hover color, background and border transitions last 140ms with `cubic-bezier(.2,0,0,1)` only when reduced motion is not requested. Primary and icon buttons use a `.96` press scale under the same preference guard.

## Shapes

The repeated radius tokens are 6px for controls, 10px for tweet cards, and 14px for the hero and dialogs. The phone hero uses 10px. Topic markers use 4px corners; avatar portraits and initials use circles. Images in avatar circles have a subtle white outline. Tweet borders and dividers use the same green structural token.

## Components

All component patterns live in `src/App.tsx`; their styles live in `src/styles.css`.

- **`Frog`** is the small outlined brand illustration. It is decorative and hidden from assistive technology. The favicon is a separate local SVG in `public/favicon.svg`.
- **`Avatar`** accepts a post and a regular/small size. It uses a local author portrait when present, reuses it for the same handle, and falls back to initials when unavailable or failed. Initials are not fabricated portraits.
- **`Tweet`** accepts a post, rank, saved flag and save/share callbacks. It contains an author profile link, a labeled excerpt, date, active topic filter, recorded views/replies/reposts/likes, a pressed bookmark control, a share control, and an original-tweet link. Engagement values are display data, not simulated social actions.
- **Feed controls** combine a labeled native search input, a native sort select, a native month select and pressed topic buttons. Controls filter the same included snapshot. No-results states explain how to clear filters. The saved view has its own empty-state recovery.
- **Navigation** uses links and `aria-current`. Explore and Bookmarks are hashes; selecting a navigation item resets filters and moves to the top. The hero action moves to the feed and focuses search.
- **Dialogs** use native `dialog.showModal()` for background inertness and browser focus restoration. `trapDialogFocus` wraps Tab/Shift+Tab inside the active dialog. Escape, the close control and an actual backdrop click close it; clicking panel padding leaves it open. Source links are disclosed with native `details`.
- **Sharing** offers a read-only selectable original URL, Copy link and Share on X. Clipboard rejection produces persistent manual-copy guidance. A successful copy closes the dialog and announces success.
- **Bookmarks and status** use the `pond-intel-bookmarks-v1` local-storage key. Storage exceptions retain usable session state and explain that it is temporary. A stable polite status region announces changes. Notifications remain until dismissed.

Every icon-only action has an accessible name. The first tab stop is a skip link. Focus indicators are 2px with a 4px offset, using the focus token; forced-colors mode uses the system Highlight color. Hover styles are restricted to hover-capable devices. Small metadata controls meet the probe's 24px/spacing baseline, although many are below the preferred 44px comfort size.

## Do’s and don’ts

Start additional reading surfaces with the existing main wrapper and feed grid. Reuse the native input/select, tweet and dialog patterns. Give one main action the solid lime fill; keep secondary controls neutral. Use the semantic color roles and the existing type scale.

Keep real post URLs, short attributed excerpts and recorded counts together. Refresh the snapshot date when changing the data. Keep all runtime assets local and preserve Vite’s relative base. Do not introduce a live indicator, fabricated engagement, a wallet flow, or implied cross-device bookmark syncing into this static reading room.

For another view, add a hash state and an appropriately labeled section, reuse the feed controls where they apply, and verify mobile reflow, empty states, keyboard navigation and export assets before rebuilding `dist/`.
