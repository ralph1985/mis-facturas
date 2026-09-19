# Modelo de datos operativo

El esquema Prisma de Mis Facturas usa una base PostgreSQL independiente. Las entidades de dominio son hogares, proveedores, puntos de suministro, categorías, facturas y líneas de coste. `ImportRecord` conserva la correspondencia idempotente entre una fila de origen y su entidad destino mediante `(sourceTable, sourceId)` único.

## Controles operativos

### `LoginRateLimit`

Guarda una clave HMAC, no una IP ni un identificador de red en claro:

- `keyHash`: clave primaria derivada con el secreto de sesión.
- `failedAttempts`: fallos de la ventana actual.
- `windowStartedAt`: inicio de la ventana.
- `blockedUntil`: fin opcional del bloqueo.
- `createdAt`, `updatedAt`: auditoría técnica.

Las actualizaciones de este modelo deben ser atómicas. Usa upsert y una transacción Prisma para evitar que dos intentos concurrentes pierdan incrementos.

### `SessionControl`

Tiene una fila de control fija. `revokedBefore` invalida todas las sesiones emitidas en esa fecha o antes. No contiene tokens ni secretos. Es un control global, no una tabla de sesiones individuales.

## Datos sensibles

`ElectricitySupplyPoint` y `ElectricityBill` pueden contener identificadores domésticos, direcciones, referencias y URLs privadas. Las consultas, logs, backups y verificaciones deben aplicar mínimo privilegio y no mostrar filas completas. La UI debe enmascarar identificadores de suministro.

`ImportRecord.payload` sirve para trazabilidad de importación y puede contener datos de origen; queda bajo la misma política de backup y acceso que el resto de la base.

## Integridad y operaciones

- Las relaciones de facturas y puntos de suministro se mantienen mediante claves foráneas.
- Las líneas de coste son únicas por factura y categoría.
- Las anulaciones y rectificativas se expresan con `status` y `originalBillId`; no se deben inferir desde el número visible de factura.
- Las migraciones se versionan en `prisma/migrations/` y se ejecutan después de un backup verificable.
