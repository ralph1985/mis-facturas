# Autenticación y sesiones

Mis Facturas usa un único código compartido. No hay cuentas, recuperación de contraseña ni roles en esta versión.

## Secretos

Configura mediante el entorno seguro del proceso:

- `MIS_FACTURAS_ACCESS_CODE_HASH`: resultado de `pnpm auth:hash`.
- `MIS_FACTURAS_SESSION_SECRET`: valor aleatorio de alta entropía, de al menos 32 bytes.

No pongas códigos, hashes ni secretos en `.env.example`, commits, logs, capturas, mensajes de Telegram o tickets. El script de hash nunca recibe el código como argumento y no lo imprime.

## Hash y comparación

`src/lib/auth.ts` usa scrypt con salt aleatorio por hash y una clave derivada de 64 bytes. La comparación usa `timingSafeEqual` después de comprobar longitudes. Un hash malformado, un código vacío o una configuración ausente no se trata como un acceso válido.

El formato persistido es `scrypt:<salt-base64url>:<derived-key-base64url>`. El salt y la clave derivada no son el código original.

## Cookie de sesión

La cookie `mis-facturas-session` contiene únicamente un payload temporal firmado:

```text
mis-facturas:<issued-at-ms>:<expires-at-ms>:<hmac-sha256-base64url>
```

La firma es HMAC-SHA-256 con `MIS_FACTURAS_SESSION_SECRET`. La cookie se crea solo en el servidor con estas propiedades:

- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- `Secure` en producción
- `Max-Age` y `Expires` según `MIS_FACTURAS_SESSION_MAX_AGE_SECONDS`

El helper rechaza firmas alteradas, payloads incompletos, fechas imposibles, sesiones futuras fuera de una pequeña tolerancia y sesiones expiradas.

## Protección de rutas y acciones

`requireSession()` es la protección definitiva. Cada página, consulta o Server Action que lea o modifique datos privados debe llamarlo antes de la primera consulta. Un guard de rutas puede mejorar la experiencia, pero nunca sustituye esta comprobación.

El logout en `/logout` elimina la cookie tanto para GET como para POST. El navegador no recibe datos privados en la respuesta de login fallido.

## Revocación global

`configureSessionRevocationStore()` permite conectar el modelo Prisma `SessionControl` sin importar el cliente de base de datos desde el módulo criptográfico. `revokeAllSessions()` fija `revokedBefore`; las sesiones emitidas en o antes de esa fecha dejan de ser válidas. Conecta el adaptador al inicializar la capa de datos y llama a `isSessionRevoked()` en la protección de servidor.

## Rate limiting

Los intentos fallidos se identifican con HMAC-SHA-256 y nunca guardan la IP en claro. La política por defecto usa una ventana de 15 minutos, bloquea después de 5 fallos y mantiene el bloqueo durante 15 minutos.

`createPrismaLoginRateLimitStore()` adapta el modelo `LoginRateLimit` del esquema Prisma. En producción, conecta el adaptador a un cliente Prisma y conserva la actualización como operación atómica (upsert dentro de una transacción, o equivalente del proveedor). El fallback en memoria sirve solo para desarrollo de un proceso y no debe considerarse protección distribuida.

El identificador `x-vercel-forwarded-for` solo se usa cuando lo establece el proxy de confianza. Si no existe, los intentos se agrupan en una cubeta `unknown`; no se confía en `x-forwarded-for` enviado directamente por el cliente.
