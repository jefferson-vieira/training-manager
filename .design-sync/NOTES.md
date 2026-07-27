# design-sync notes — training-manager

Repo-specific gotchas for syncing this design system to claude.ai/design.
Read this before re-running the sync.

## Shape of this repo

- This is **a Next.js app, not a design-system package**. There is no `dist/`, no
  `exports`, no `.d.ts` tree — the converter runs in synth-entry mode and builds
  the bundle straight from `packages/web/src/components`.
- `cfg.pkg` is `"web"` and resolves because npm workspaces symlinks
  `node_modules/web -> packages/web`. Pass the **repo-root** `node_modules` as
  `--node-modules`: `packages/web/node_modules` has `react` but not `next`.
- `cfg.srcDir` is `src/components`, deliberately narrow. Pointing it at `src`
  sweeps in `src/app/globals.css` and `src/lib/dal.ts` (`server-only`) and the
  esbuild pass dies.

## Always rebuild through `.design-sync/rebuild.sh`

`globals.css` is a Tailwind 4 **source** file, so `cfg.cssEntry` cannot point at
it — it would ship `@import 'tailwindcss'` and zero utilities. The script
compiles `packages/web/.ds-css/entry.css` → `compiled.css` first, then runs the
converter. A bare `package-build.mjs` run silently reuses a stale stylesheet.

`.design-sync/previews/` is inside the Tailwind `@source` set, so **authoring a
preview that uses a new utility class requires a recompile**, not just a
preview rebuild.

## Next.js has to be shimmed out

Components import `next/image`, `next/link` and `next/navigation`. Bundled for
the browser these break in three separate ways, all fixed under
`packages/web/.ds-shim/`:

- `next/image` and `next/link` bundle to a **module object**, not a component —
  React throws `Element type is invalid … but got: object`. Aliased to plain
  `<img>` / `<a>` shims. The `next/image` shim also honours `fill`, which is
  layout-critical: cover images are absolutely positioned and the card derives
  no height from them.
- `next/navigation` hooks need App Router context. `usePathname()` is stubbed to
  `'/'`, so in `NavLink` the `/` item renders active and everything else inert.
- Next internals read `process.env.*` at module scope. esbuild only substitutes
  the exact expression `process.env.NODE_ENV`, so the IIFE threw
  `process is not defined` before assigning a single export. `ds-globals.ts`
  (wired through `cfg.extraEntries`, which is emitted **before** the main entry)
  defines `process` and the two `NEXT_PUBLIC_*` URLs that `src/config/env.ts`
  Zod-parses at module scope.

The aliases live in `packages/web/tsconfig.design-sync.json`, pointed at by
`cfg.tsconfig`.

> **Do not put a `"//"` JSON key in that tsconfig.** The converter's comment
> stripper mangles it, `JSON.parse` throws, and `tsconfigPathsPlugin` silently
> returns `null` — disabling *all* aliasing. It is not obvious because esbuild's
> own tsconfig auto-discovery keeps `@/*` working, so the build still succeeds
> and only the Next shims go missing. Use `//` line comments instead.

## Props are hand-written

There is no `.d.ts` tree to extract from, so every component's props come from
`cfg.dtsPropsFor`. **If you change a component's props in `src/components`, update
`cfg.dtsPropsFor` too** — nothing checks this automatically, and the `.d.ts` is
the contract the design agent codes against.

## Fonts are self-hosted

The app loads Inter / Inter Tight via `next/font/google`, which self-hosts at
build time; there is no Next build here, so `--font-sans` would resolve to
nothing and every card would render in a browser default face.
`.design-sync/fetch-fonts.mjs` downloads the woff2s into
`packages/web/.ds-fonts/` (committed) and `cfg.extraFonts` ships them. The
`:root` block in `.ds-css/entry.css` binds `--font-sans` / `--font-heading`.
Re-run the script only if the font set changes.

## The CSS safelist is load-bearing

Tailwind only emits utilities it sees. Without the `@source inline(...)` block
at the top of `.ds-css/entry.css`, a design the agent composes with, say,
`grid-cols-3` or `bg-accent` would ship with **no CSS for those classes** —
the repo simply never uses them. That block pins the vocabulary advertised in
`conventions.md`; the two must stay in sync. It costs ~200KB of CSS (90 → 290KB)
and is worth it.

## Known render warns (triaged, expected — not new)

- `[RENDER_THIN] Drawer` — measured height 1px. The popup is `position: fixed`
  inside a portal, so the measured root collapses. The screenshot is correct.
- `[TOKENS_MISSING]` for `--drawer-swipe-progress`, `--drawer-swipe-strength`,
  `--drawer-swipe-movement-x/y`, `--nested-drawers` — Base UI sets these at
  runtime via inline style. `--tw` is a Tailwind internal. `--sdm-tbg` comes
  from `streamdown` (chat rendering, out of scope). `--font-geist-mono` is
  declared in `globals.css`'s `@theme` but no scoped component uses it.

## Deliberate omissions

- **`Toaster` ships on the floor card.** Sonner's `toast()` is not exported by
  the DS, and importing `sonner` inside a preview creates a *second* module
  instance whose toasts never reach the bundled `<Toaster/>`. The component is
  fully importable and its `.d.ts` documents the real usage; there is just no
  honest way to render a populated toast statically. To fix properly, re-export
  `toast` from the app's `ui/sonner.tsx`, then author the preview.
- `Chat`, `ChatPanel`, `Header` and everything under `components/ai-elements/`
  are excluded via `cfg.componentSrcMap` — context- and auth-coupled, or
  vendored third-party.
- Compound subparts (`Avatar*`, `Drawer*`, `Tooltip*`, `ScrollBar`) are excluded
  from the **card list** only. They remain exported on
  `window.TrainingManagerDS` and are documented in their parent's `.prompt.md`.

## Editor noise you can ignore

`.design-sync/previews/*.tsx` report `Cannot find module 'web'` in the IDE —
they are outside the app's tsconfig. esbuild resolves them fine through the
workspace symlink.

## Re-sync risks — what can silently go stale

- **`cfg.dtsPropsFor` drifts from the source.** The single most likely rot: a
  prop added or renamed in `src/components` will not surface anywhere. Skim the
  18 prop bodies against source on any re-sync that follows component changes.
- **The CSS safelist drifts from `conventions.md`.** If the header advertises a
  utility family the safelist drops, designs render unstyled with no warning.
- **The Next shims cover only what today's components import.** A component that
  starts using `next/font`, `next/script`, `next/dynamic` or a new
  `next/navigation` export will fail the same way — extend
  `tsconfig.design-sync.json` and `.ds-shim/`.
- **Preview cover images are remote Unsplash URLs.** If they rot, cards render
  with broken images; the render check only catches an empty root, not a 404.
- **Bundle is ~2.8MB** because the synth entry re-exports *every* file under
  `src/components`, including the excluded chat/ai-elements tree and its AI SDK
  dependencies. `componentSrcMap` prunes cards, not the entry. A real
  `dist` build (tsup over just the DS components) would cut this substantially
  and is the single biggest available improvement.
- **Grades and verified state are not in git.** They live in the uploaded
  `_ds_sync.json`; a re-sync from a fresh clone re-verifies everything.
