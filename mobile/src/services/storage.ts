import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types/api';

const TOKEN_KEY = 'poolfolio_auth_token';
const USER_KEY = 'poolfolio_auth_user';

export const storage = {
  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch {
      // storage error fallback
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
      // storage error fallback
    }
  },

  async getUser(): Promise<User | null> {
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = typeof window !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
      } else {
        raw = await SecureStore.getItemAsync(USER_KEY);
      }
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    try {
      const raw = JSON.stringify(user);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.setItem(USER_KEY, raw);
      } else {
        await SecureStore.setItemAsync(USER_KEY, raw);
      }
    } catch {
      // storage error fallback
    }
  },

  async removeUser(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') localStorage.removeItem(USER_KEY);
      } else {
        await SecureStore.deleteItemAsync(USER_KEY);
      }
    } catch {
      // storage error fallback
    }
  },

  async clear(): Promise<void> {
    await Promise.all([this.removeToken(), this.removeUser()]);
  },
};
