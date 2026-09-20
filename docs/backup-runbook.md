# Runbook de backup PostgreSQL

Los backups de Mis Facturas son independientes de cualquier otra aplicación. No ejecutes comandos contra una base cuyo destino no hayas confirmado.

## Prerrequisitos

- `DATABASE_URL` está disponible en el entorno del proceso o en `.env.local`.
- `node`, `pg_dump` y `pg_restore` pertenecen a instalaciones compatibles.
- El directorio `var/backups/postgres/` está en el mismo disco protegido que el proyecto o se copiará después a almacenamiento seguro.

Los scripts no imprimen la URL. `backup-postgres.sh` crea un archivo pgpass temporal con permisos restrictivos, elimina la contraseña de la URL entregada a `pg_dump`, publica el dump mediante un archivo temporal del mismo directorio y borra los temporales al salir.

## Configuración opcional

Estas variables no contienen secretos y permiten adaptar rutas o binarios en una instalación local:

- `MIS_FACTURAS_BACKUP_DIR`: directorio de dumps; por defecto `var/backups/postgres`.
- `MIS_FACTURAS_LOG_DIR`: directorio de logs; por defecto `var/log`.
- `MIS_FACTURAS_BACKUP_RETENTION_DAYS`: días de retención; por defecto 30.
- `PG_DUMP_BIN` y `NODE_BIN`: rutas explícitas de los binarios.
- `MIS_FACTURAS_BACKUP_CRON_SCHEDULE`: horario del cron; por defecto `30 1 * * *`.
- `MIS_FACTURAS_BACKUP_LOCK_FILE`: lock de `flock`; por defecto `/tmp/mis-facturas-postgres-backup.lock`.
- `CRONTAB_BIN`: binario de crontab; se puede sustituir por un stub en pruebas, pero no debe apuntar a un crontab real durante los tests.

No pongas credenciales en estas variables ni las guardes en el repositorio.

## Crear y verificar un backup

`pnpm backup:db` ejecuta un backup manual inmediato. Ejecuta el backup PRE antes de una migración o importación:

```bash
pnpm backup:db
pnpm backup:db:verify
```

El resultado de éxito incluye `OK: backup SQL creado en ...` y solo identifica la ruta local. En caso de error se registra `ERROR: ...` sin la URL ni la contraseña. La verificación usa `pg_restore --list` y no abre una conexión ni modifica una base de datos.

Para verificar un archivo concreto:

```bash
scripts/verify-postgres-backup.sh var/backups/postgres/<archivo>.dump
pg_restore --list var/backups/postgres/<archivo>.dump
```

La retención elimina únicamente archivos `mis-facturas-*.dump` cuyo `mtime` supera `MIS_FACTURAS_BACKUP_RETENTION_DAYS`. Los temporales `.backup.*` y `.pgpass.*` no se conservan.

No compartas archivos de backup: pueden contener datos domésticos completos.

## Instalación programada

`pnpm backup:db:cron:install` instala o actualiza solamente el bloque delimitado por `MIS-FACTURAS BACKUP` en el crontab. No ejecuta el backup al instalarlo y es idempotente. El bloque usa `CRON_TZ=Europe/Madrid`, `flock`, rutas explícitas para `node` y `pg_dump`, y por defecto ejecuta el backup cada día a la `01:30`:

```cron
30 1 * * *
```

La salida del cron se añade a `var/log/postgres-backup.cron.log`; el script mantiene además `var/log/postgres-backup.log` con las líneas `OK:` y `ERROR:`. CronWatch genera su informe a las `08:00 Europe/Madrid` y analiza la ventana anterior. Si falta el log o la última ejecución falla, la tabla mostrará `SIN EVIDENCIA` o `FALLO`.

Antes de instalar el cron real, verifica los binarios y prueba el instalador con un `CRONTAB_BIN` falso. No ejecutes el instalador de pruebas contra el crontab del usuario.

## Flujo PRE/POST

1. Comprueba el entorno sin imprimir `DATABASE_URL`.
2. Ejecuta `pnpm backup:db`.
3. Ejecuta `pnpm backup:db:verify` y conserva el nombre del archivo PRE.
4. Ejecuta la migración o importación autorizada.
5. Verifica contadores y sumas agregadas; no muestres filas ni identificadores completos.
6. Ejecuta un backup POST y vuelve a verificarlo.
7. Copia los archivos a almacenamiento cifrado con una política de retención definida.

## Recuperación manual

La restauración no forma parte de ningún script automático. Antes de recuperar:

- detén la aplicación o impide escrituras concurrentes;
- confirma que el destino es una base independiente y que existe un backup del estado actual;
- revisa el catálogo con `pg_restore --list`;
- acuerda el impacto y conserva un registro de la operación.

Una restauración sobre una base compartida o de producción requiere una decisión explícita del coordinador. Nunca añadas una URL real como argumento, salida de comando o documentación.

Una copia local en el mismo disco no protege frente a pérdida del disco, ransomware o corrupción del host. Configura y verifica una réplica externa por separado.
