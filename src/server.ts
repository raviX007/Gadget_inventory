import "reflect-metadata";  
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './config/database';
import gadgetRoutes from './routes/gadget.routes';
import setupSwagger from './swagger'; 
import { authenticateToken } from './middleware/auth.middleware';
import authRoutes from './routes/auth.routes';


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/gadgets',authenticateToken, gadgetRoutes);


setupSwagger(app);


AppDataSource.initialize()
    .then(() => {
        console.log("Database connected successfully");
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => console.log("Database connection failed:", error));


app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;