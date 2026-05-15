import { Request, Response } from 'express';
import { app, getUserRepo } from "..";

export const createUserRoutes = () => {
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
}