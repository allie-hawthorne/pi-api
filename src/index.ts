import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createAuthRoutes } from './routes/authRoutes';
import { createGifCanvasRoutes } from './routes/gifCanvasRoutes';
import { createUserRoutes } from './routes/userRoutes';
import { initialiseDb } from './dbConfig';

export const { DbDataSource, JWT_SECRET, getCanvasRepo, getUserRepo } = initialiseDb();

export const app = express();
const port = process.env.PORT || 3001;

// TODO: This is not secure - change this!
app.use(cors());
app.use(express.json());

app.get('/api/hello', (req: Request, res: Response) => {
    res.json({ message: 'Hello from the API!' });
});

createUserRoutes();
createAuthRoutes();
createGifCanvasRoutes();

app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
