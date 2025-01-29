export interface JwtPayload {
    userId: string;
    email: string;
    role: 'AGENT' | 'ADMIN';
    iat?: number;
    exp?: number;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: string;
    }
}