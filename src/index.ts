import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createAuthRoutes } from './routes/authRoutes';
import { createGifCanvasRoutes } from './routes/gifCanvasRoutes';
import { createUserRoutes } from './routes/userRoutes';
import { initialiseDb } from './dbConfig';
import { createRecycleRoutes } from './routes/recycleRoutes';

export const { DbDataSource, JWT_SECRET, getCanvasRepo, getUserRepo } = initialiseDb();

export const app = express();
const port = process.env.PORT || 3001;
app.set('trust proxy', 1);

// TODO: This is not secure - change this!
app.use(cors());
app.use(express.json());
app.use(rateLimit({limit: 10}));

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the API!' });
});

createUserRoutes();
createAuthRoutes();
createRecycleRoutes();
createGifCanvasRoutes();

app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
