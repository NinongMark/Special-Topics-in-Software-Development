import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { subscriberRoutes } from './routes/subscribers';
import { billingRoutes } from './routes/billing';

dotenv.config();

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // API Routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(subscriberRoutes, { prefix: '/api/subscribers' });
  await app.register(billingRoutes, { prefix: '/api/billing' });

  const port = Number(process.env.PORT) || 3001;
  app.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    console.log(`Server listening on ${address}`);
  });
}

start();