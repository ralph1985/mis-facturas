<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cierre de procesos locales

- Antes de terminar la sesión, detén todos los procesos locales que hayas iniciado para este proyecto (`pnpm dev`, `next dev`, daemons de Prisma, watchers y servidores auxiliares). Usa una parada ordenada y comprueba que no quedan procesos hijos ejecutándose. No dejes servidores ni daemons en segundo plano salvo petición explícita de Rafa.
