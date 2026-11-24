
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";


const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const dbUrl = new URL("mysql://root:@localhost:3306/mydb");
function createClient() {
    const adapter = new PrismaMariaDb({
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port) || 3306,
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.slice(1),
        prepareCacheLength: 0,
    });
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;