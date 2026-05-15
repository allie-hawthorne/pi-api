import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { CanvasItem } from "./entity/CanvasItem";
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { featuredTenor, searchTenor } from './tenor';
import { getItemsInTheLastDay, getTimeToWait, getUserDataOrFail } from './utils';
import { createAuthRoutes } from './routes/authRoutes';

export interface UserToken {
    id: number
    email: string
    firstName: string
}

export const getUserRepo = () => AppDataSource.getRepository(User);
export const getCanvasRepo = () => AppDataSource.getRepository(CanvasItem);

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "test",
    entities: [User, CanvasItem],
    synchronize: process.env.NODE_ENV === 'development', // Synchronize only in development
    // Turned off for now - log & sync makes reloading take so long
    // logging: process.env.NODE_ENV === 'development', // Log only in development
})

export const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// TODO: This is not secure - change this!
app.use(cors());

export const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in .env file");
    process.exit(1);
}

AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })

app.get('/api/hello', (req: Request, res: Response) => {
    res.json({ message: 'Hello from the API!' });
});

// Endpoint to get user by ID
app.get("/api/users/:id", async function (req: Request, res: Response) {
    try {
        const user = await getUserRepo().findOneBy({
            id: parseInt(req.params.id)
        })
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user)
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})

createAuthRoutes();

app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
});

app.get("/api/canvas", async function (req: Request, res: Response) {
    const items = await getCanvasRepo().find();
    res.status(200).json(items);
});

app.post("/api/canvas", async function (req: Request, res: Response) {
    const data = getUserDataOrFail(req);
    if (!data) {
        console.log('ERROR:', req.query, req.headers.authorization)
        return res.status(403).json('Something went wrong :(');
    }
    const {userId, fingerprint} = data;
    const {position, item} = req.body;

    const [recentUserItems, recentUserItemCount] = await getItemsInTheLastDay(userId, fingerprint)

    if (recentUserItemCount) {
        const timeToWait = getTimeToWait(recentUserItems)
        return res.status(403).json(`You've already added a GIF today, please wait ${timeToWait}`);
    }

    const newItem = await getCanvasRepo().save({
        userId,
        url: item.url,
        updatedAt: new Date(),
        position,
        fingerprint,
        dimensions: item.dims
    });

    res.status(200).json(newItem);
});

app.get('/api/gifs/search', async function (req: Request, res: Response) {
    const q = req.query.q?.toString();

    if (!q) throw new Error('No search query')

    const data = await searchTenor(q);

    // TODO: Deal with any
    // @ts-ignore
    const gifs = data.results.map(g => g.media_formats.webm);

    return res.status(200).json(gifs)
});

app.get('/api/gifs/featured', async function (req: Request, res: Response) {
    const data = await featuredTenor();

    // TODO: Deal with any
    // @ts-ignore
    const gifs = data.results.map(g => g.media_formats.webm);

    return res.status(200).json(gifs)
});
