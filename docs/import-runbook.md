# Runbook de importación

La importación heredada debe ejecutarse solo contra la base independiente de Mis Facturas. La fuente se abre en modo lectura y los scripts deben mostrar únicamente contadores agregados.

## Secuencia obligatoria

1. Configura `DATABASE_URL` en el entorno seguro sin imprimirla.
2. Crea el backup PRE:
   ```bash
   pnpm backup:db
   pnpm backup:db:verify
   ```
3. Ejecuta el dry-run y revisa sus contadores:
   ```bash
   pnpm import:legacy
   ```
4. Si el alcance y los contadores son correctos, ejecuta la escritura autorizada:
   ```bash
   pnpm import:legacy -- --write
   ```
5. Ejecuta la verificación agregada:
   ```bash
   pnpm verify:import
   ```
6. Repite la importación y `verify:import` para comprobar que la unicidad de `ImportRecord` evita duplicados.
7. Crea y verifica el backup POST:
   ```bash
   pnpm backup:db
   pnpm backup:db:verify
   ```

Si los contadores aumentan en la segunda ejecución, detén el proceso y no sigas escribiendo. Conserva el backup PRE y solicita revisión antes de restaurar o corregir datos.

## Avisos de seguridad

- No ejecutes `--write` sin backup PRE verificable.
- No ejecutes el importador contra una base compartida con otro producto.
- No pegues salidas completas en tickets o chat: elimina URLs, CUPS, IBAN, direcciones, números de factura y filas.
- No borres tablas ni restaures bases como parte de este runbook.
