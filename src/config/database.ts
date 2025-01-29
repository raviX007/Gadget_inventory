// src/config/database.ts
import 'dotenv/config';
import { DataSource } from "typeorm";
import { Gadget } from "../models/Gadget";
import { User } from '../models/User';

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Gadget,User],
    synchronize: true,
    logging: true,
    ssl: {
        rejectUnauthorized: false // Use true in production with proper certificates
    }
});