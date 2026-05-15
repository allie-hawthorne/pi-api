import { DataSource } from "typeorm";
import { User } from "./entity/User";
import { CanvasItem } from "./entity/CanvasItem";

export const initialiseDb = () => {
  const DbDataSource = new DataSource({
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

  DbDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!")
    })
    .catch((err) => {
      console.error("Error during Data Source initialization:", err)
    }
  );

  const getUserRepo = () => DbDataSource.getRepository(User);
  const getCanvasRepo = () => DbDataSource.getRepository(CanvasItem);

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
      console.error("ERROR: JWT_SECRET is not defined in .env file");
      process.exit(1);
  }

  return {
    DbDataSource,
    JWT_SECRET,
    getUserRepo,
    getCanvasRepo
  }
};
