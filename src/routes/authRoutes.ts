import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { app, DbDataSource, getUserRepo, JWT_SECRET } from "..";
import { User } from '../entity/User';
import { UserToken } from './userRoutes';

export const createAuthRoutes = () => {
  app.post("/api/auth/register", async function (req: Request, res: Response) {
      const { firstName, lastName, email, password } = req.body;

      if (!firstName || !lastName || !email || !password) {
          return res.status(400).json({ message: "All fields are required" });
      }

      try {
          const existingUser = await getUserRepo().findOneBy({ email: email });
          if (existingUser) {
              return res.status(409).json({ message: "Email already exists" });
          }

          const user = new User();
          user.firstName = firstName;
          user.lastName = lastName;
          user.email = email;
          user.password = password;

          await getUserRepo().save(user);

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

      const userRepository = DbDataSource.getRepository(User);

      try {
          const user = await userRepository.createQueryBuilder("user")
              .addSelect("user.password")
              .where("user.email = :email", { email })
              .getOne();

          if (!user) {
              return res.status(401).json({ message: "Invalid credentials" });
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
              return res.status(401).json({ message: "Invalid credentials" });
          }

          const tokenPayload: UserToken = { id: user.id, email: user.email, firstName: user.firstName };
          const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });

          res.json({ message: "Login successful", token });

      } catch (error) {
          console.error("Error during login:", error);
          res.status(500).json({ message: "Internal server error" });
      }
  });
}