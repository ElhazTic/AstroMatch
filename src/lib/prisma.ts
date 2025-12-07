import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Déclaration pour éviter les instances multiples en développement
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Déterminer si on est en production
const isProduction = process.env.NODE_ENV === "production";

// Créer le pool de connexion PostgreSQL
// Configuration SSL pour accepter les certificats auto-signés (développement)
const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  // Accepter les certificats auto-signés en développement
  // En production, utilisez un certificat valide
  ssl: isProduction 
    ? { rejectUnauthorized: true } // En production, valider les certificats
    : { rejectUnauthorized: false }, // En développement, accepter les certificats auto-signés
});

// Créer l'adaptateur Prisma pour PostgreSQL
const adapter = new PrismaPg(pool);

// Créer une instance singleton du client Prisma
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: !isProduction ? ["error", "warn"] : ["error"],
});

if (!isProduction) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
