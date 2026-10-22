# EmpleoRapido - Backend

API REST de **EmpleoRapido**, un marketplace que conecta a personas que necesitan
reparaciones del hogar con trabajadores de oficio. Construida con **NestJS**,
**Prisma** y **PostgreSQL**.

## Requisitos

- Node.js 20 o superior
- PostgreSQL 14 o superior en ejecucion
- npm (incluido con Node)

## Stack

- **NestJS 12** (ESM, TypeScript)
- **Prisma 7** + PostgreSQL (`@prisma/adapter-pg`)
- **Autenticacion** JWT (access + refresh con rotacion, Passport)
- **Validacion** con `class-validator` / `class-transformer`
- **Swagger** en `/api/docs`
- **Sharp** para procesar imagenes (avatares, fotos, documentos KYC)
- **Vitest** para pruebas
- **oxlint** (type-aware) para lint

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el ejemplo y ajusta los valores:

```bash
cp .env.example .env
```

Variables principales (`.env.example`):

| Variable | Descripcion | Ejemplo |
| --- | --- | --- |
| `NODE_ENV` | Entorno de ejecucion | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `DATABASE_URL` | Cadena de conexion PostgreSQL | `postgresql://postgres:password@localhost:5432/empleo_rapido?schema=public` |
| `JWT_ACCESS_SECRET` | Secreto del access token | `cambia-este-secreto-de-acceso` |
| `JWT_ACCESS_EXPIRES_IN` | Vigencia del access token | `15m` |
| `JWT_REFRESH_SECRET` | Secreto del refresh token | `cambia-este-secreto-de-refresh` |
| `JWT_REFRESH_EXPIRES_IN` | Vigencia del refresh token | `30d` |
| `CORS_ORIGINS` | Origenes permitidos (separados por coma) | `http://localhost:5173` |
| `UPLOAD_DIR` | Carpeta de archivos subidos | `uploads` |
| `PUBLIC_BASE_URL` | URL publica para servir archivos | `http://localhost:3000` |

> En produccion usa secretos fuertes y distintos para access y refresh.

### 3. Crear la base de datos

Con PostgreSQL instalado y corriendo, crea la base (ajusta el usuario si no es
`postgres`):

```bash
# Crea la base (ajusta el usuario si no es "postgres")
createdb -U postgres empleo_rapido
```

> El nombre debe coincidir con el `DATABASE_URL` de tu `.env`.

### 4. Aplicar el esquema de base de datos

Con PostgreSQL disponible:

```bash
# Aplica las migraciones existentes
npm run prisma:migrate

# (Opcional) Carga datos de ejemplo (usuarios verificados, trabajos, etc.)
npm run seed
```

Otros comandos de Prisma:

```bash
npm run prisma:generate   # Regenera el cliente Prisma
npm run prisma:deploy     # Aplica migraciones (entornos no interactivos/produccion)
npm run prisma:studio     # Abre Prisma Studio
```

#### Crear una nueva migracion

Cada vez que modifiques `prisma/schema.prisma`, genera una migracion con un
nombre descriptivo:

```bash
npx prisma migrate dev --name descripcion_del_cambio
```

Esto crea un archivo `.sql` en `prisma/migrations/`, aplica el cambio a tu base
local y regenera el cliente. **Commitea siempre la carpeta `prisma/migrations/`**
junto con el `schema.prisma`: es lo que permite aplicar el mismo cambio en otros
entornos con `prisma deploy`.

> `prisma migrate dev` es solo para desarrollo. Nunca lo uses en produccion
> porque es interactivo y puede resetear la base si detecta divergencias.

#### Error de "drift" / base sin historial de migraciones

Si al correr `npm run prisma:migrate` Prisma avisa que hay *drift* o que la base
no esta en sincronia con el historial de migraciones (por ejemplo, si la base se
creo a mano o quedo vacia sin la tabla `_prisma_migrations`), resetea la base de
desarrollo. Esto **borra todos los datos** y vuelve a aplicar todas las
migraciones desde cero:

```bash
npx prisma migrate reset --force
```

Luego carga los datos de ejemplo:

```bash
npm run seed
```

> `prisma migrate reset` es solo para **desarrollo**. Nunca lo uses en
> produccion: destruye todos los datos de la base.

### 5. Levantar el servidor

```bash
npm run start:dev    # desarrollo con recarga en caliente
npm run start        # sin watch
npm run start:prod   # produccion (requiere build previo)
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Health check: `http://localhost:3000/api` (devuelve un mensaje de estado)

## Scripts disponibles

| Script | Descripcion |
| --- | --- |
| `npm run start` | Inicia la app |
| `npm run start:dev` | Inicia en modo watch |
| `npm run start:debug` | Inicia en modo debug + watch |
| `npm run start:prod` | Ejecuta el build compilado |
| `npm run build` | Compila a `dist/` (regenera Prisma antes) |
| `npm run lint` | Lint con oxlint (type-aware) |
| `npm run format` | Formatea con Prettier |
| `npm run test` | Pruebas unitarias (Vitest) |
| `npm run test:watch` | Pruebas en modo watch |
| `npm run test:cov` | Pruebas con cobertura |
| `npm run test:e2e` | Pruebas end-to-end |
| `npm run seed` | Compila y ejecuta el seed |

## Funcionalidades principales

- **Autenticacion**: registro/login con roles `WORKER` (trabajador) y `HOMEOWNER`
  (dueno de casa); refresh de tokens con rotacion y logout que revoca el token.
- **Trabajos** (`jobs`): publicacion, edicion, listado publico con filtros por
  ciudad/categoria/busqueda y orden por distancia, detalle, fotos (hasta 3) y
  presupuesto con **moneda** por publicacion.
- **Postulaciones** (`applications`): el trabajador se postula, el dueno ve
  postulantes, acepta/rechaza y el trabajador retira; "mis postulaciones"
  paginadas y filtrables por estado y texto.
- **Trabajadores** (`users` / `workers`): perfil publico y CV (especialidades,
  habilidades, experiencia, tarifa por hora con moneda, disponibilidad,
  reputacion).
- **Verificacion de identidad** (`identity`): envio de DNI (frente/reverso) y
  selfie con proveedor KYC (mock en desarrollo). Se exige verificacion para
  publicar trabajos y para postularse.
- **Resenas** (`reviews`): calificacion y comentarios al completar un trabajo.
- **Archivos** (`storage`): subida de imagenes convertidas a WebP y servidas
  desde `/uploads`.
- **Usuarios** (`users`): actualizacion de perfil (nombre, apellido, WhatsApp,
  ciudad) y ubicacion (latitud/longitud).

## Estructura del proyecto

```
src/
  auth/          Autenticacion (JWT, estrategias, guards)
  applications/  Postulaciones a trabajos
  jobs/          Publicaciones de trabajo
  users/         Perfil de usuario, CV y trabajadores
  identity/      Verificacion de identidad (KYC)
  reviews/       Resenas
  storage/       Subida y procesamiento de imagenes
  common/        Decoradores, DTOs y utilidades compartidas
  config/        Configuracion de la app
  prisma/        PrismaService, schema y seed
  generated/     Cliente Prisma generado
prisma/
  schema.prisma  Modelo de datos
  migrations/    Migraciones
test/            Pruebas
```

## Despliegue en produccion

### 1. Variables de entorno

Define estas variables en el entorno del servidor de produccion (no subas el
`.env` al repositorio):

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://usuario:password@host:5432/empleo_rapido?schema=public"
JWT_ACCESS_SECRET="<secreto-largo-y-aleatorio>"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="<otro-secreto-largo-y-aleatorio>"
JWT_REFRESH_EXPIRES_IN="30d"
CORS_ORIGINS="https://tu-dominio-del-frontend"
UPLOAD_DIR="uploads"
PUBLIC_BASE_URL="https://api.tu-dominio.com"
```

> - Genera los secretos con, por ejemplo, `openssl rand -hex 32`.
> - `CORS_ORIGINS` debe ser el origen exacto del frontend (separados por coma si
>   hay varios). No uses `*` con credenciales.
> - `PUBLIC_BASE_URL` es la URL publica desde la que se sirven los archivos de
>   `uploads`; debe ser accesible por los clientes.
> - Asegura que `UPLOAD_DIR` apunte a un almacenamiento persistente; si se borra,
>   se pierden las imagenes subidas.

### 2. Instalar dependencias y compilar

```bash
npm ci
npm run build
```

`npm run build` ejecuta `prisma generate` (via `prebuild`) y compila a `dist/`.

### 3. Aplicar migraciones de Prisma

En produccion **no** uses `prisma migrate dev` (es interactivo y puede resetear
datos). Usa `migrate deploy`, que solo aplica las migraciones pendientes de
`prisma/migrations/` sobre la base:

```bash
npm run prisma:deploy   # equivale a: npx prisma migrate deploy
```

Forma parte del flujo de despliegue: **ejecuta esto antes de arrancar** cada vez
que haya cambios de esquema. Es seguro reejecutarlo (no reaplica lo ya aplicado).

> - No ejecutes `npm run seed` en produccion: crea datos de ejemplo.
> - Los archivos de `prisma/migrations/` deben estar incluidos en el despliegue
>   (no los excluyas del build/artefacto), o `migrate deploy` no tendra nada que
>   aplicar.
> - Si un despliegue introduce una migracion que elimina o renombra columnas, haz
>   backup de la base antes.

### 4. Arrancar

```bash
npm run start:prod
```

Esto ejecuta `node dist/main`. Para mantener el proceso vivo usa un gestor de
procesos o un orquestador:

- **PM2**:

  ```bash
  npm install -g pm2
  pm2 start dist/main.js --name empleo-rapido-api
  pm2 save
  pm2 startup
  ```

- **systemd** (servicio `empleo-rapido-api.service`):

  ```ini
  [Unit]
  Description=EmpleoRapido API
  After=network.target

  [Service]
  WorkingDirectory=/ruta/al/proyecto
  ExecStart=/usr/bin/node dist/main.js
  EnvironmentFile=/ruta/al/proyecto/.env
  Restart=always

  [Install]
  WantedBy=multi-user.target
  ```

### 5. Proxy inverso y HTTPS

Coloca la API detras de Nginx (o similar) para terminar TLS y servir los
archivos de `uploads`:

```nginx
server {
    listen 443 ssl;
    server_name api.tu-dominio.com;

    ssl_certificate     /ruta/cert.pem;
    ssl_certificate_key /ruta/key.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

> Si servis los archivos de Nginx en vez de Express, mapea `/uploads` al
> directorio `UPLOAD_DIR`.

### 6. Base de datos en produccion

- Usa un PostgreSQL gestionado (RDS, Cloud SQL, Neon, Supabase, etc.) o un
  contenedor con volumen persistente.
- Configura **backups automaticos** y no expongas el puerto de la base a
  internet.
- Ejecuta `npm run prisma:deploy` en cada despliegue con cambios de esquema.

### 7. Verificacion

- `GET https://api.tu-dominio.com/api` debe responder el mensaje de salud.
- `GET https://api.tu-dominio.com/api/docs` debe mostrar Swagger.
- Confirma desde el frontend que login, publicacion y subida de imagenes
  funcionan contra el backend en produccion.

## Notas

- La app usa `setGlobalPrefix('api')`; todas las rutas cuelgan de `/api`.
- El seed crea usuarios verificados y datos de ejemplo (los perfiles parten con
  moneda por defecto **PEN**).
- Los archivos subidos se guardan en `uploads/` (configurable con `UPLOAD_DIR`).
