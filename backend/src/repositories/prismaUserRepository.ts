/**
 * prismaUserRepository.ts — Postgres-backed UserRepository.
 */
import { Prisma, type PrismaClient } from '@prisma/client';
import { DuplicateEmailError, type UserRepository } from './userRepository';

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    async create({ email, passwordHash }) {
      try {
        return await prisma.user.create({ data: { email, passwordHash } });
      } catch (err) {
        // P2002 = unique constraint violated. Relying on the DB constraint (not a
        // find-then-insert) means two simultaneous signups can't both succeed.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new DuplicateEmailError();
        }
        throw err;
      }
    },
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),
    findById: (id) => prisma.user.findUnique({ where: { id } }),
  };
}
