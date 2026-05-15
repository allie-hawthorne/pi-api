import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { app, AppDataSource, getUserRepo, JWT_SECRET, UserToken } from "..";
import { User } from '../entity/User';

export const createAuthRoutes = () => {
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
}