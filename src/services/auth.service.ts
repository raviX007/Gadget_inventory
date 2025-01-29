// src/services/auth.service.ts
import { getRepository } from 'typeorm';
import { User } from '../models/User';

export class AuthService {
    private userRepository = getRepository(User);

    async register(email: string, password: string, role: 'AGENT' | 'ADMIN'): Promise<User> {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Create new user
        const user = new User();
        user.email = email;
        user.password = password;
        user.role = role;

        // Hash password before saving
        await user.hashPassword();

        // Save user to database
        return this.userRepository.save(user);
    }
}