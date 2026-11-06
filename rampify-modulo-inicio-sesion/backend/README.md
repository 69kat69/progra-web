# Backend de Rampify

API en Node.js + Express y MySQL. Está separado del front; no se ha conectado a sus formularios.

## Preparación local

1. Usa Node.js 20 o posterior y MySQL 8.0.16 o posterior.
2. En MySQL Workbench ejecuta `database/rampify_v2.sql`.
3. Copia `.env.example` como `.env` dentro de esta carpeta y completa `DB_USER`, `DB_PASSWORD` y una `JWT_SECRET` privada de al menos 32 caracteres. No subas `.env` a GitHub.
4. Abre PowerShell en esta carpeta y ejecuta `npm install`.
5. Crea el primer administrador configurando temporalmente `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`, y corre `npm run admin:init`. El script guarda solo el hash. Los administradores posteriores se crean mediante invitación.
6. Inicia la API con `npm run dev`.
7. Revisa `http://localhost:4000/api/health`.

El servidor no sirve archivos del front. `FRONT_URL` solo permite solicitudes de navegador desde el origen indicado; por defecto es `http://localhost:3000`.

## Módulos

- `auth`: inicio y cierre de sesión, registro de usuario y empleado, registro por invitación de administrador y recuperación de contra.
- `reports`: crear reporte con imagen, consultar cercanos o propios, detalle, actualizar estado, denunciar y eliminar.
- `requests`: solicitar la eliminación de un reporte y resolver solicitudes como administrador.
- `profile`: editar nombre, correo con código, contra, preferencias y eliminación programada de cuenta.
- `organizations`: revisar peticiones de empleados, suspenderlos, darles de baja e invitar administradores.
- `catalogs`: listar, agregar, editar y desactivar tipos de problema.
- `users`: consultar cuentas ciudadanas, banear, eliminar datos personales y enviar alertas.
- `dashboard`: totales, filtros, reportes por estado/tipo/día y concentración por coordenadas.

Las rutas están declaradas en cada archivo `*.routes.js`; controladores validan la petición y los servicios contienen las consultas parametrizadas a MySQL.

## Rutas principales

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/login` | Público |
| POST | `/api/auth/registro` | Público |
| POST | `/api/auth/registro-empleado` | Público |
| POST | `/api/auth/registro-admin` | Invitación vigente |
| POST | `/api/auth/recuperar/codigo` | Público |
| POST | `/api/auth/recuperar/verificar` | Público |
| POST | `/api/auth/recuperar/contra` | Público |
| GET | `/api/reportes/cercanos?latitud=19.43&longitud=-99.13` | Usuario |
| GET | `/api/reportes/mios` | Usuario |
| POST | `/api/reportes` | Usuario, `multipart/form-data` |
| GET/PATCH/DELETE | `/api/reportes/:id` | Según rol |
| POST/GET/PATCH | `/api/solicitudes/reportes...` | Usuario/Admin |
| GET/PATCH | `/api/perfil` | Sesión activa |
| GET/POST/PATCH/DELETE | `/api/catalogos` | Sesión/Admin |
| GET | `/api/dashboard?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` | Empleado/Admin |

Las rutas protegidas reciben `Authorization: Bearer <token>`. Las rutas de registro, perfil, reportes, solicitudes y organización tienen más acciones; revisa los `*.routes.js` correspondientes.

## Reglas implementadas

- Contra: hash bcrypt; de 8 a 64 caracteres, mayúscula, minúscula y número.
- Inicio de sesión: solo cuentas Activas; 5 intentos fallidos bloquean la cuenta por 15 minutos.
- Código de verificación: 6 dígitos, vence en 10 minutos, máximo 5 intentos y hasta 3 reenvíos en una hora.
- Invitación de administrador: vence en 24 horas y se usa una vez.
- Reportes: descripción de 10 a 500 caracteres; una imagen JPG/PNG de hasta 5 MB; coordenadas dentro de latitud -90..90 y longitud -180..180; folio `RMP-` más 8 dígitos.
- Cuenta propia: eliminación programada en 30 días, con opción para cancelarla antes de vencer.
- Peticiones a la API: permite 5 peticiones por minuto; la sexta bloquea esa IP o sesión por 30 segundos.
- Cambios importantes se escriben en `bitacora`.

En desarrollo, si no hay SMTP configurado, el código de correo se muestra en la consola del servidor. El control de peticiones se guarda en memoria del proceso y se reinicia cuando reinicias el servidor. En producción configura correo, HTTPS y un almacén compartido para el control de peticiones.

