# Protocolo operativo del bloque

Este bloque se integra bajo el control del coordinador. El agente de autenticación y operaciones:

- trabaja solo en sus archivos asignados;
- no modifica la aplicación de referencia;
- no configura secretos reales;
- no ejecuta migraciones, importaciones con escritura, restauraciones, publicaciones ni despliegues;
- entrega resultados de checks y bloqueos sin incluir secretos ni datos de facturas.

## Inicio y cierre

Antes de una operación dependiente de infraestructura, el coordinador comprueba el estado del gateway y del canal de avisos sin mostrar tokens ni identificadores. El inicio del bloque, bloqueos, fallos de migración/importación/publicación, checks completados y disponibilidad para revisión se notifican con mensajes breves.

El aviso debe incluir solo:

- estado (`iniciado`, `bloqueado`, `fallido`, `verificado` o `listo`);
- bloque afectado;
- decisión necesaria, si existe;
- respuesta esperada en la sesión principal.

No debe incluir códigos, hashes, `DATABASE_URL`, CUPS, IBAN, direcciones, números de factura, filas, archivos de backup ni URLs privadas. El canal móvil es informativo; las preguntas y respuestas se conservan también en la sesión principal.

## Evidencia segura

Comparte solo resultados agregados como `6 tests passed`, `typecheck passed`, `backup verified` o `no tracked secret files`. Para probar que un hash se generó, valida su formato localmente sin imprimirlo. Para probar un backup, usa `pg_restore --list` sin conexión de restauración.
