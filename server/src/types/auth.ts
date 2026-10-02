export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export const toSafeUser = (user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string;
}): SafeUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
