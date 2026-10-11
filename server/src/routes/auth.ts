import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const JWT_SECRET = process.env.JWT_SECRET || 'bcis_super_secret_jwt_key_2026';

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ message: 'Invalid payload' });
    }

    const { username, password } = parseResult.data;

    // Auto-seed admin if database has no users yet
    const existingUsers = await db.select().from(users);
    if (existingUsers.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.insert(users).values({
        username: 'admin',
        passwordHash,
        fullName: 'System Administrator',
        role: 'Admin',
        isActive: true,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.username, username));

    if (!user || !user.isActive) {
      return reply.status(401).send({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return { token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } };
  });
}