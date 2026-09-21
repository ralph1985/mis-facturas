# Mis Facturas

Aplicación privada para consultar y gestionar facturas de electricidad. El proyecto es independiente de cualquier aplicación de referencia y no comparte sus secretos, base de datos ni migraciones.

## Requisitos

- Node.js 22 o superior
- pnpm 10.x
- PostgreSQL para las operaciones de base de datos
- `pg_dump` y `pg_restore` para backups

## Configuración local

Copia `.env.example` a `.env.local` y rellena los valores únicamente en el entorno local o en el gestor de secretos del despliegue:

```bash
cp .env.example .env.local
```

Variables necesarias:

- `DATABASE_URL`: conexión a la base PostgreSQL independiente.
- `MIS_FACTURAS_ACCESS_CODE_HASH`: hash generado por `pnpm auth:hash`; nunca el código en claro.
- `MIS_FACTURAS_SESSION_SECRET`: secreto aleatorio largo para firmar cookies; nunca se imprime ni se guarda en el repositorio.

`MIS_FACTURAS_SESSION_MAX_AGE_SECONDS` es opcional. Si falta, la sesión dura 12 horas; se aceptan valores entre 5 minutos y 30 días.

## Instalación como PWA

La aplicación publica un manifest en `/manifest.webmanifest` y puede instalarse desde un navegador compatible cuando se sirve por HTTPS.

- En Chrome o Edge: abre la aplicación y usa la opción del navegador `Instalar aplicación` o `Añadir a pantalla de inicio`.
- En Safari para iPhone o iPad: abre la aplicación, pulsa Compartir y elige `Añadir a pantalla de inicio`.
- La aplicación conserva la autenticación privada y necesita conectividad para consultar o guardar facturas.

La primera versión no usa service worker ni caché offline: no se almacenan facturas ni datos domésticos en el dispositivo por defecto.

## Hash del código de acceso

El generador no acepta el código como argumento, para evitar que aparezca en el historial o en la lista de procesos. Introduce el código dos veces sin que se muestre en pantalla:

```bash
pnpm auth:hash
```

También admite entrada no interactiva por stdin. La entrada debe contener dos líneas iguales:

```bash
printf '%s\n%s\n' 'codigo-local' 'codigo-local' | pnpm auth:hash
```

El resultado es un hash scrypt destinado a `MIS_FACTURAS_ACCESS_CODE_HASH`. No pegues códigos reales en documentación, incidencias o chat.

## Desarrollo y migraciones

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm format
pnpm build
```

Las migraciones se ejecutan únicamente contra la base independiente y después de disponer de un backup verificable:

```bash
pnpm backup:db
pnpm backup:db:verify
pnpm db:migrate --name <nombre>
```

No ejecutes migraciones destructivas ni comandos de restauración sin revisar antes el destino y el backup.

## Importación y verificación

La importación heredada debe comenzar siempre en modo de simulación y con la fuente SQLite en solo lectura:

```bash
pnpm import:legacy
```

Para una escritura autorizada, sigue [`docs/import-runbook.md`](docs/import-runbook.md), que exige backup PRE, verificación, importación, comprobación de contadores e idempotencia y backup POST.

## Backups PostgreSQL

Los scripts guardan archivos custom-format bajo `var/backups/postgres/`, directorio ignorado por Git, y no imprimen `DATABASE_URL`:

```bash
pnpm backup:db
pnpm backup:db:verify
```

`pnpm backup:db` ejecuta un backup manual inmediato. `pnpm backup:db:cron:install` solo instala o actualiza el bloque idempotente del crontab; no ejecuta el backup en ese momento. La instalación usa `flock`, rutas explícitas para `node` y `pg_dump`, y programa por defecto:

- horario: `01:30 Europe/Madrid` (`30 1 * * *`);
- log del cron: `var/log/postgres-backup.cron.log`;
- log persistente del script: `var/log/postgres-backup.log`;
- retención local: 30 días.

La instalación debe ejecutarse únicamente después de revisar el destino de `DATABASE_URL`. Para comprobar un archivo concreto:

```bash
scripts/verify-postgres-backup.sh var/backups/postgres/<archivo>.dump
pg_restore --list var/backups/postgres/<archivo>.dump
```

La verificación solo inspecciona el catálogo del archivo con `pg_restore --list`; no conecta ni restaura nada. CronWatch genera su informe a las `08:00 Europe/Madrid` y analiza la ventana anterior. Si falta el log o la última ejecución contiene un error, mostrará `SIN EVIDENCIA` o `FALLO`.

`var/backups/postgres/` contiene datos domésticos completos y no se comparte. Una copia en el mismo disco protege frente a errores operativos, pero no sustituye una copia externa.

La restauración sigue siendo manual: confirma siempre el destino, detén las escrituras y crea un backup del estado actual antes de sobrescribir una base. No ejecutes restauraciones con una URL cuyo destino no hayas revisado.

## Seguridad operativa

- Las páginas, consultas y acciones privadas deben llamar a `requireSession()` antes de acceder a datos.
- La sesión usa una cookie HttpOnly, SameSite=Lax, con firma HMAC-SHA-256 y expiración configurable.
- El logout elimina la cookie del navegador. El hook de revocación global permite invalidar sesiones anteriores cuando se conecta a `SessionControl`.
- Los intentos fallidos se agrupan por una clave HMAC, no por una IP en claro. El adaptador Prisma usa `LoginRateLimit` y debe operar con upsert/transacción en producción.
- No se registran códigos, hashes, URLs de conexión, filas de facturas ni identificadores domésticos completos.

El alcance inicial es electricidad. Gas, agua, OCR, subida de documentos y sincronizaciones externas no forman parte de este producto.
