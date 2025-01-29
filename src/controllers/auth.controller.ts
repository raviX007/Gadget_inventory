// src/controllers/auth.controller.ts

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { LoginDto } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const userRepository = AppDataSource.getRepository(User);

// First, let's add the RegisterDto type to your auth.types.ts
// You can add this to your types/auth.types.ts file:
interface RegisterDto {
    email: string;
    password: string;
    role: 'AGENT' | 'ADMIN';
}

export const register = async (
    req: Request<{}, {}, RegisterDto>,
    res: Response
): Promise<void> => {
    try {
        const { email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already registered' });
            return;
        }

        // Create new user
        const user = new User();
        user.email = email;
        user.password = password;
        user.role = role;

        // Hash password
        await user.hashPassword();

        // Save user
        const savedUser = await userRepository.save(user);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: savedUser.id, 
                email: savedUser.email, 
                role: savedUser.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return response without password
        res.status(201).json({
            token,
            user: {
                id: savedUser.id,
                email: savedUser.email,
                role: savedUser.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
};

export const login = async (
    req: Request<{}, {}, LoginDto>,
    res: Response
): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Login failed' });
    }
};