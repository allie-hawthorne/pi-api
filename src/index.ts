import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createAuthRoutes } from './routes/authRoutes';
import { createGifCanvasRoutes } from './routes/gifCanvasRoutes';
import { createUserRoutes } from './routes/userRoutes';
import { initialiseDb } from './dbConfig';
import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import z from 'zod';

// TODO: Consider a framework like CO-STAR for better responses
const generateRecyclePrompt = (postcode: string, item: string) => `
Given the user's postcode: ${postcode}, can the user recycle the following item: "${item}" at their curbside/from their home?
`;

export const { DbDataSource, JWT_SECRET, getCanvasRepo, getUserRepo } = initialiseDb();

export const app = express();
const port = process.env.PORT || 3001;

// TODO: This is not secure - change this!
app.use(cors());
app.use(express.json());

app.get('/api/recycle', async (req: Request, res: Response) => {
  const item = req.query.item as string;
  const postcode = req.query.postcode as string;
  const prompt = generateRecyclePrompt(postcode, item);

  console.log({ query: req.query, prompt });

  // TODO: This still has type: text, find a way to change this to JSON
  const { content } = await generateText({
    model: google('gemini-3.1-flash-lite'),
    output: Output.object({
      schema: z.object({
        recyclable: z.enum(['yes', 'no', 'more_info_needed']),
        reason: z.string(),
        tips: z.string().optional(),
      })
    }),
    prompt
  });
  console.log(content);

  res.json(content);
});

app.get('/api/hello', (req: Request, res: Response) => {
    res.json({ message: 'Hello from the API!' });
});

createUserRoutes();
createAuthRoutes();
createGifCanvasRoutes();

app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
});
