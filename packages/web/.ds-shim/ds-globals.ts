/* design-sync bundle shim.
   Several components import next/link, next/image and next/navigation, which
   drag Next.js internals into the bundle. Those read process.env.* at module
   scope, and esbuild only substitutes the exact expression process.env.NODE_ENV
   — every other read throws "process is not defined" and aborts the IIFE before
   a single export reaches window.TrainingManagerDS.

   This module is wired via cfg.extraEntries so it is re-exported ahead of the
   main entry and therefore evaluates first. */
const g = globalThis as unknown as {
  process?: { env: Record<string, string | undefined> };
};

if (!g.process) g.process = { env: {} };
else if (!g.process.env) g.process.env = {};

/* src/config/env.ts Zod-parses these at module scope and throws on a bad URL.
   The synth entry re-exports every component source file, so that module loads
   even though the components that actually call the API are out of scope here.
   These are inert placeholders — nothing in a rendered design issues requests. */
g.process.env.NEXT_PUBLIC_API_URL ??= 'http://localhost:3333';
g.process.env.NEXT_PUBLIC_BASE_URL ??= 'http://localhost:3000';

export {};
