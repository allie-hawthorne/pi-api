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

export interface UserToken {
    id: number
    email: string
    firstName: string
}

const getUserRepo = () => AppDataSource.getRepository(User);
export const getCanvasRepo = () => AppDataSource.getRepository(CanvasItem);

// Create a new DataSource instance using environment variables
const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "root", // Be cautious with default passwords in production
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

// --- Authentication Endpoints ---

// Register Endpoint
app.post("/api/auth/register", async function (req: Request, res: Response) {
    const { firstName, lastName, email, password } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        // Check if user already exists
        const existingUser = await getUserRepo().findOneBy({ email: email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already exists" });
        }

        // Create new user instance
        const user = new User();
        user.firstName = firstName;
        user.lastName = lastName;
        user.email = email;
        user.password = password; // Password will be hashed by @BeforeInsert hook

        // Save the user (password gets hashed automatically)
        await getUserRepo().save(user);

        // Don't send password back
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ message: "User created successfully", user: userWithoutPassword });

    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Login Endpoint
app.post("/api/auth/login", async function (req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const userRepository = AppDataSource.getRepository(User);

    try {
        // Find user by email, explicitly selecting the password
        const user = await userRepository.createQueryBuilder("user")
            .addSelect("user.password")
            .where("user.email = :email", { email })
            .getOne();

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" }); // User not found
        }

        // Compare provided password with stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" }); // Incorrect password
        }

        // Generate JWT - Include firstName in the payload
        const tokenPayload: UserToken = { id: user.id, email: user.email, firstName: user.firstName };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

        res.json({ message: "Login successful", token });

    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// --- End Authentication Endpoints ---

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
