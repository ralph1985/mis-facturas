# Runbook de backup PostgreSQL

Los backups de Mis Facturas son independientes de cualquier otra aplicación. No ejecutes comandos contra una base cuyo destino no hayas confirmado.

## Prerrequisitos

- `DATABASE_URL` está disponible en el entorno del proceso o en `.env.local`.
- `pg_dump` y `pg_restore` pertenecen a una instalación PostgreSQL compatible.
- El directorio `var/backups/postgres/` está en el mismo disco protegido que el proyecto o se copiará después a almacenamiento seguro.

Los scripts no imprimen la URL. `backup-postgres.sh` crea un archivo pgpass temporal con permisos restrictivos, elimina la contraseña de la URL entregada a `pg_dump` y borra los temporales al salir.

## Crear y verificar un backup

Ejecuta el backup PRE antes de una migración o importación:

```bash
pnpm backup:db
pnpm backup:db:verify
```

El resultado solo identifica el nombre del archivo. La verificación usa `pg_restore --list` y no abre una conexión ni modifica una base de datos.

Para verificar un archivo concreto:

```bash
scripts/verify-postgres-backup.sh var/backups/postgres/<archivo>.dump
```

No compartas archivos de backup: pueden contener datos domésticos completos.

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
