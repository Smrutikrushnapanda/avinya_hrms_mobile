import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { logout } from '../api/api';

interface User {
  userId: string;
  userName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  email: string;
  mobileNumber: string;
  organizationId: string;
  mustChangePassword: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (data: { access_token: string; user: any }) => Promise<void>;
  clearAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  logout: (userName: string, password: string) => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: async ({ access_token, user }) => {
    try {
      const formattedUser: User = {
        userId: user.id, // from user object
        userName: user.userName,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        dob: user.dob,
        gender: user.gender,
        email: user.email,
        mobileNumber: user.mobileNumber,
        organizationId: user.organization?.id || "",
        mustChangePassword: user.mustChangePassword,
      };

      await AsyncStorage.setItem("token", access_token);
      await AsyncStorage.setItem("user", JSON.stringify(formattedUser));

      set({
        accessToken: access_token,
        user: formattedUser,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error("Error setting auth data:", error);
    }
  },

  clearAuth: async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      set({ accessToken: null, user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  },

  initializeAuth: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userString = await AsyncStorage.getItem("user");
      if (token && userString) {
        const user = JSON.parse(userString);
        set({ accessToken: token, user, isAuthenticated: true });
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
    }
  },

  logout: async (userName, password) => {
    try {
      await logout({ userName, password });
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      set({ accessToken: null, user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  },
}));

export default useAuthStore;
