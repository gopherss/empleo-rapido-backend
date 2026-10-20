import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

import { PrismaClient } from '../generated/prisma/client.js';
import {
  ApplicationStatus,
  Currency,
  IdVerificationStatus,
  JobStatus,
  Role,
  type WorkCategory,
} from '../generated/prisma/enums.js';

const BCRYPT_ROUNDS = 10;
const SEED_PASSWORD = 'secreto123';

const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

interface CityCoords {
  latitude: number;
  longitude: number;
}

const CITY_COORDS: Record<string, CityCoords> = {
  'Santa Cruz': { latitude: -17.7833, longitude: -63.1821 },
  'La Paz': { latitude: -16.5, longitude: -68.15 },
  Cochabamba: { latitude: -17.3895, longitude: -66.1568 },
};

/** Desplaza ligeramente las coordenadas de una ciudad para repartir el mapa. */
function offsetCoords(city: string, index: number): CityCoords {
  const base = CITY_COORDS[city] ?? CITY_COORDS['Santa Cruz'];
  const delta = ((index % 5) - 2) * 0.007;

  return {
    latitude: Number((base.latitude + delta).toFixed(4)),
    longitude: Number((base.longitude - delta).toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

interface UserSeed {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
}

interface WorkerSeed extends UserSeed {
  headline: string;
  bio: string;
  categories: WorkCategory[];
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  currency: Currency;
  isAvailable: boolean;
}

const OWNERS: UserSeed[] = [
  {
    email: 'carlos.rojas@example.com',
    firstName: 'Carlos Andrés',
    lastName: 'Rojas',
    phone: '+59170010001',
    city: 'Santa Cruz',
  },
];

const WORKERS: WorkerSeed[] = [
  {
    email: 'juan.mamani@example.com',
    firstName: 'Juan Carlos',
    lastName: 'Mamani',
    phone: '+59170020001',
    city: 'Santa Cruz',
    headline: 'Plomero con 12 años de experiencia',
    bio: 'Especialista en detección y reparación de fugas, instalación de tuberías y gas domiciliario. Trabajo garantizado.',
    categories: ['PLOMERIA', 'GAS'],
    skills: ['Fugas', 'Instalación de tuberías', 'Destape', 'Gas domiciliario'],
    experienceYears: 12,
    hourlyRate: 60,
    currency: Currency.BOB,
    isAvailable: true,
  },
  {
    email: 'pedro.quispe@example.com',
    firstName: 'Pedro',
    lastName: 'Quispe',
    phone: '+59170020002',
    city: 'Santa Cruz',
    headline: 'Electricista certificado',
    bio: 'Instalaciones eléctricas, tableros, cortocircuitos y mantenimiento residencial. Puntualidad y limpieza.',
    categories: ['ELECTRICIDAD'],
    skills: ['Tableros', 'Cortocircuitos', 'Cableado', 'Iluminación'],
    experienceYears: 9,
    hourlyRate: 55,
    currency: Currency.BOB,
    isAvailable: true,
  },
];

// ---------------------------------------------------------------------------
// Publicaciones, postulaciones y reseñas
// ---------------------------------------------------------------------------

interface ApplicationSeed {
  worker: string;
  message?: string;
  status: ApplicationStatus;
}

interface ReviewSeed {
  rating: number;
  comment: string;
}

interface JobSeed {
  ref: string;
  homeowner: string;
  worker?: string;
  title: string;
  description: string;
  category: WorkCategory;
  city: string;
  address?: string;
  budget?: number;
  status: JobStatus;
  createdDaysAgo: number;
  selectedDaysAgo?: number;
  completedDaysAgo?: number;
  photoCount: number;
  applications: ApplicationSeed[];
  review?: ReviewSeed;
}

const accepted: ApplicationStatus = ApplicationStatus.ACCEPTED;
const rejected: ApplicationStatus = ApplicationStatus.REJECTED;
const pending: ApplicationStatus = ApplicationStatus.PENDING;

const JOBS: JobSeed[] = [
  // ---- Abiertos (aparecen en el feed) --------------------------------------
  {
    ref: 'fuga-cocina-carlos',
    homeowner: 'carlos.rojas@example.com',
    title: 'Fuga de agua en la cocina',
    description:
      'Hay una fuga debajo del lavaplatos que moja el piso y el mueble. Necesito revisión y reparación.',
    category: 'PLOMERIA',
    city: 'Santa Cruz',
    address: 'Av. Monseñor Rivero #123',
    budget: 180,
    status: JobStatus.OPEN,
    createdDaysAgo: 1,
    photoCount: 2,
    applications: [
      { worker: 'juan.mamani@example.com', message: 'Puedo ir hoy mismo.', status: pending },
    ],
  },
  {
    ref: 'tomacorrientes-carlos',
    homeowner: 'carlos.rojas@example.com',
    title: 'Instalar 3 tomacorrientes',
    description:
      'Necesito instalar 3 tomacorrientes nuevos en la sala y el dormitorio principal.',
    category: 'ELECTRICIDAD',
    city: 'Santa Cruz',
    budget: 200,
    status: JobStatus.OPEN,
    createdDaysAgo: 2,
    photoCount: 1,
    applications: [
      { worker: 'pedro.quispe@example.com', message: 'Tengo el material disponible.', status: pending },
    ],
  },
  {
    ref: 'gas-cocina-carlos',
    homeowner: 'carlos.rojas@example.com',
    title: 'Revisión de instalación de gas',
    description:
      'Revisar la conexión de gas de la cocina por posible fuga. Se requiere certificado.',
    category: 'GAS',
    city: 'Santa Cruz',
    budget: 250,
    status: JobStatus.OPEN,
    createdDaysAgo: 3,
    photoCount: 1,
    applications: [
      { worker: 'juan.mamani@example.com', message: 'Puedo el fin de semana.', status: pending },
    ],
  },

  // ---- En progreso (trabajador ya seleccionado) ----------------------------
  {
    ref: 'fuga-bano-carlos',
    homeowner: 'carlos.rojas@example.com',
    worker: 'juan.mamani@example.com',
    title: 'Reparar fuga bajo el lavamanos',
    description: 'Fuga bajo el lavamanos del baño principal, se moja el piso.',
    category: 'PLOMERIA',
    city: 'Santa Cruz',
    budget: 220,
    status: JobStatus.IN_PROGRESS,
    createdDaysAgo: 5,
    selectedDaysAgo: 2,
    photoCount: 2,
    applications: [
      { worker: 'juan.mamani@example.com', message: 'Puedo ir mañana temprano.', status: accepted },
      { worker: 'pedro.quispe@example.com', status: rejected },
    ],
  },

  // ---- Completados (con reseña) -------------------------------------------
  {
    ref: 'c-grifo-juan',
    homeowner: 'carlos.rojas@example.com',
    worker: 'juan.mamani@example.com',
    title: 'Cambio de grifería de baño',
    description: 'Cambio completo de grifería y desagüe del baño.',
    category: 'PLOMERIA',
    city: 'Santa Cruz',
    budget: 300,
    status: JobStatus.COMPLETED,
    createdDaysAgo: 18,
    selectedDaysAgo: 15,
    completedDaysAgo: 10,
    photoCount: 2,
    applications: [{ worker: 'juan.mamani@example.com', status: accepted }],
    review: { rating: 5, comment: 'Excelente trabajo, muy puntual y limpio.' },
  },
  {
    ref: 'c-tablero-pedro',
    homeowner: 'carlos.rojas@example.com',
    worker: 'pedro.quispe@example.com',
    title: 'Reemplazo de tablero eléctrico',
    description: 'Cambio de tablero eléctrico y ordenamiento de circuitos.',
    category: 'ELECTRICIDAD',
    city: 'Santa Cruz',
    budget: 800,
    status: JobStatus.COMPLETED,
    createdDaysAgo: 16,
    selectedDaysAgo: 13,
    completedDaysAgo: 8,
    photoCount: 1,
    applications: [{ worker: 'pedro.quispe@example.com', status: accepted }],
    review: { rating: 4, comment: 'Buen trabajo, llegó un poco tarde pero cumplió.' },
  },
];

// ---------------------------------------------------------------------------
// Imagenes de ejemplo (webp) escritas en /uploads
// ---------------------------------------------------------------------------

const PALETTE = [
  ['#1e3a8a', '#3b82f6'],
  ['#7c2d12', '#ea580c'],
  ['#14532d', '#22c55e'],
  ['#581c87', '#a855f7'],
  ['#7f1d1d', '#ef4444'],
  ['#134e4a', '#14b8a6'],
  ['#78350f', '#f59e0b'],
  ['#1e293b', '#64748b'],
];

function svgFor(index: number): Buffer {
  const [from, to] = PALETTE[index % PALETTE.length];

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${from}"/>
          <stop offset="1" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)"/>
      <circle cx="640" cy="120" r="70" fill="rgba(255,255,255,0.18)"/>
      <rect x="60" y="440" width="360" height="90" rx="12" fill="rgba(255,255,255,0.18)"/>
    </svg>`,
  );
}

async function writeImages(
  uploadDir: string,
  folder: string,
  prefix: string,
  count: number,
): Promise<string[]> {
  const targetDir = join(uploadDir, folder);
  await mkdir(targetDir, { recursive: true });

  const urls: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const filename = `${prefix}-${String(i + 1).padStart(2, '0')}.webp`;
    const buffer = await sharp(svgFor(i)).webp({ quality: 80 }).toBuffer();
    await writeFile(join(targetDir, filename), buffer);
    urls.push(`/uploads/${folder}/${filename}`);
  }

  return urls;
}

/** Devuelve `count` imagenes del pool empezando en `offset` (rotando). */
function pick(pool: string[], count: number, offset: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(pool[(offset + i) % pool.length]);
  }
  return result;
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Falta la variable de entorno DATABASE_URL');
  }

  const uploadDir = resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });
  const password = await hash(SEED_PASSWORD, BCRYPT_ROUNDS);

  try {
    console.log('1/5  Sembrando usuarios...');
    const userIdByEmail = new Map<string, string>();

    for (const owner of OWNERS) {
      const coords = offsetCoords(owner.city, OWNERS.indexOf(owner));
      const user = await prisma.user.upsert({
        where: { email: owner.email },
        update: {
          password,
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          role: Role.HOMEOWNER,
          city: owner.city,
          latitude: coords.latitude,
          longitude: coords.longitude,
          idVerificationStatus: IdVerificationStatus.VERIFIED,
          isActive: true,
        },
        create: {
          email: owner.email,
          password,
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          role: Role.HOMEOWNER,
          city: owner.city,
          latitude: coords.latitude,
          longitude: coords.longitude,
          idVerificationStatus: IdVerificationStatus.VERIFIED,
        },
      });
      userIdByEmail.set(owner.email, user.id);
    }

    for (const worker of WORKERS) {
      const coords = offsetCoords(worker.city, WORKERS.indexOf(worker));
      const profile = {
        headline: worker.headline,
        bio: worker.bio,
        categories: worker.categories,
        skills: worker.skills,
        experienceYears: worker.experienceYears,
        hourlyRate: worker.hourlyRate,
        currency: worker.currency,
        isAvailable: worker.isAvailable,
      };

      const user = await prisma.user.upsert({
        where: { email: worker.email },
        update: {
          password,
          firstName: worker.firstName,
          lastName: worker.lastName,
          phone: worker.phone,
          role: Role.WORKER,
          city: worker.city,
          latitude: coords.latitude,
          longitude: coords.longitude,
          idVerificationStatus: IdVerificationStatus.VERIFIED,
          isActive: true,
          workerProfile: { upsert: { create: profile, update: profile } },
        },
        create: {
          email: worker.email,
          password,
          firstName: worker.firstName,
          lastName: worker.lastName,
          phone: worker.phone,
          role: Role.WORKER,
          city: worker.city,
          latitude: coords.latitude,
          longitude: coords.longitude,
          idVerificationStatus: IdVerificationStatus.VERIFIED,
          workerProfile: { create: profile },
        },
      });
      userIdByEmail.set(worker.email, user.id);
    }

    console.log('2/5  Limpiando publicaciones anteriores...');
    await prisma.reviewPhoto.deleteMany();
    await prisma.review.deleteMany();
    await prisma.application.deleteMany();
    await prisma.jobPhoto.deleteMany();
    await prisma.job.deleteMany();

    console.log('3/5  Generando imagenes de ejemplo (webp)...');
    const jobImages = await writeImages(uploadDir, 'jobs', 'seed-job', 8);
    const reviewImages = await writeImages(uploadDir, 'reviews', 'seed-review', 8);

    console.log('4/5  Creando publicaciones, postulaciones y reseñas...');
    for (let index = 0; index < JOBS.length; index += 1) {
      const job = JOBS[index];
      const homeownerId = userIdByEmail.get(job.homeowner);
      const workerId = job.worker ? userIdByEmail.get(job.worker) : undefined;

      if (!homeownerId) {
        throw new Error(`Dueño no encontrado: ${job.homeowner}`);
      }
      if (job.worker && !workerId) {
        throw new Error(`Trabajador no encontrado: ${job.worker}`);
      }

      const coords = offsetCoords(job.city, index + 1);
      const photos = pick(jobImages, job.photoCount, index);
      const reviewPhotos = job.review
        ? pick(reviewImages, (index % 2) + 1, index)
        : [];

      await prisma.job.create({
        data: {
          id: `seed-job-${job.ref}`,
          homeownerId,
          workerId: workerId ?? null,
          title: job.title,
          description: job.description,
          category: job.category,
          city: job.city,
          address: job.address,
          latitude: coords.latitude,
          longitude: coords.longitude,
          budget: job.budget,
          status: job.status,
          createdAt: daysAgo(job.createdDaysAgo),
          selectedAt:
            job.selectedDaysAgo !== undefined
              ? daysAgo(job.selectedDaysAgo)
              : null,
          completedAt:
            job.completedDaysAgo !== undefined
              ? daysAgo(job.completedDaysAgo)
              : null,
          photos: {
            create: photos.map((url, order) => ({ url, order })),
          },
          applications: {
            create: job.applications.map((application) => {
              const applicationWorkerId = userIdByEmail.get(application.worker);
              if (!applicationWorkerId) {
                throw new Error(`Trabajador no encontrado: ${application.worker}`);
              }

              return {
                workerId: applicationWorkerId,
                message: application.message,
                status: application.status,
                createdAt: daysAgo(Math.max(0, job.createdDaysAgo - 1)),
              };
            }),
          },
          review:
            job.review && workerId
              ? {
                  create: {
                    authorId: homeownerId,
                    targetId: workerId,
                    rating: job.review.rating,
                    comment: job.review.comment,
                    createdAt: daysAgo(job.completedDaysAgo ?? 0),
                    photos: {
                      create: reviewPhotos.map((url, order) => ({
                        url,
                        order,
                      })),
                    },
                  },
                }
              : undefined,
        },
      });
    }

    console.log('5/5  Recalculando reputación de los trabajadores...');
    for (const worker of WORKERS) {
      const workerId = userIdByEmail.get(worker.email);
      if (!workerId) continue;

      const aggregate = await prisma.review.aggregate({
        where: { targetId: workerId },
        _avg: { rating: true },
        _count: { _all: true },
      });

      await prisma.workerProfile.update({
        where: { userId: workerId },
        data: {
          averageRating: aggregate._avg.rating ?? 0,
          completedJobs: aggregate._count._all,
        },
      });
    }

    const statusCount = (status: JobStatus) =>
      JOBS.filter((job) => job.status === status).length;

    console.log('');
    console.log('Seed completado.');
    console.log('');
    console.log(`  Dueños de casa:      ${OWNERS.length}`);
    console.log(`  Trabajadores:        ${WORKERS.length}`);
    console.log(`  Publicaciones:       ${JOBS.length}`);
    console.log(`    - Abiertas:        ${statusCount(JobStatus.OPEN)}`);
    console.log(`    - En progreso:     ${statusCount(JobStatus.IN_PROGRESS)}`);
    console.log(`    - Completadas:     ${statusCount(JobStatus.COMPLETED)}`);
    console.log(
      `  Postulaciones:       ${JOBS.reduce((acc, job) => acc + job.applications.length, 0)}`,
    );
    console.log(
      `  Reseñas:             ${JOBS.filter((job) => job.review).length}`,
    );
    console.log('');
    console.log(`Contraseña para todas las cuentas: ${SEED_PASSWORD}`);
    console.log('');
    console.log('Dueños de casa:');
    for (const owner of OWNERS) {
      console.log(`  - ${owner.email}  (${owner.city})`);
    }
    console.log('');
    console.log('Trabajadores:');
    for (const worker of WORKERS) {
      console.log(
        `  - ${worker.email}  (${worker.categories.join(', ')})  ${worker.city}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Error al ejecutar el seed:', error);
  process.exit(1);
});
