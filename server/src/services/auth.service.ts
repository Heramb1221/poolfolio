import prisma from '../config/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { RegisterInput, LoginInput } from '../middleware/auth.validation';
import { AuthResponse, SafeUser, toSafeUser } from '../types/auth';

export class AuthService {
  /**
   * Register a new user with Argon2 password hashing.
   * Ensures email uniqueness and returns safe user data with a JWT.
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();

    // Check for existing user with this email
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    // Hash password with Argon2
    const passwordHash = await hashPassword(input.password);

    // Create user in database without returning passwordHash
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Issue JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user,
      token,
    };
  }

  /**
   * Authenticate a user by verifying email and password against Argon2 hash.
   * Returns safe user information and a JWT token.
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await verifyPassword(user.passwordHash, input.password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Fetch safe user record by ID.
   */
  async getUserById(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    return user;
  }
}

export const authService = new AuthService();
export default authService;
