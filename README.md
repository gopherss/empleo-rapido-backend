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

### 3. Preparar la base de datos

```bash
# Aplica las migraciones existentes
npm run prisma:migrate

# (Opcional) Carga datos de ejemplo
npm run seed
```

Otros comandos de Prisma:

```bash
npm run prisma:generate   # Regenera el cliente Prisma
npm run prisma:deploy     # Aplica migraciones en produccion
npm run prisma:studio     # Abre Prisma Studio
```

### 4. Levantar el servidor

```bash
npm run start:dev    # desarrollo con recarga en caliente
npm run start        # sin watch
npm run start:prod   # produccion (requiere build previo)
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

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

## Notas

- La app usa `setGlobalPrefix('api')`; todas las rutas cuelgan de `/api`.
- El seed crea usuarios verificados y datos de ejemplo (los perfiles parten con
  moneda por defecto **PEN**).
- Los archivos subidos se guardan en `uploads/` (configurable con `UPLOAD_DIR`).
