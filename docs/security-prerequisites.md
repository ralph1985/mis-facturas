# Prerrequisitos de seguridad antes de publicar

Este checklist debe ejecutarse antes de cualquier publicación o despliegue. No publica nada por sí mismo.

## Archivos y secretos

```bash
git status --short
git check-ignore -v .env.local var/backups/postgres/example.dump
git grep -nE 'DATABASE_URL=.+|MIS_FACTURAS_(ACCESS_CODE_HASH|SESSION_SECRET)=.+|postgres(ql)?://|BEGIN (RSA|OPENSSH) PRIVATE KEY|sk-[A-Za-z0-9]+' -- ':!pnpm-lock.yaml' || true
git ls-files '*.db' '*.sqlite' '*.sql' '*.dump' '.env*'
```

Resultado esperado:

- `.env.local`, bases, SQL y backups están ignorados y no trackeados.
- Solo `.env.example` puede aparecer entre `.env*`.
- La búsqueda de secretos no devuelve valores reales.
- Los archivos operativos no contienen URLs privadas ni filas de datos.

## Checks locales

```bash
pnpm lint
pnpm typecheck
pnpm format
git diff --check
pnpm test
pnpm build
```

Verifica también un backup PRE/POST con `pnpm backup:db:verify`. No uses una salida que incluya `DATABASE_URL` como evidencia compartida.

## Límites de publicación

No configures secretos en archivos, no ejecutes migraciones destructivas, no restaures bases automáticamente y no publiques desde un agente de bloque. La publicación y el despliegue requieren revisión del coordinador y lectura posterior del estado remoto.
