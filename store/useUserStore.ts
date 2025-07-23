// ../../store/useUserStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getEmployeeProfile, logout } from '../api/api'; // Adjust path as needed

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
  profileImage: string; // Added for photoUrl
  designation: string; // Added for designation.name
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean; // Added for fetch state
  error: string | null; // Added for fetch errors

  setAuth: (data: { access_token: string; user: any }) => Promise<void>;
  clearAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  logout: (userName: string, password: string) => Promise<void>;
  fetchEmployeeProfile: (userId: string) => Promise<void>; // Added for fetching profile
}

const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  setAuth: async ({ access_token, user }) => {
    try {
      const formattedUser: User = {
        userId: user.id,
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
        profileImage: "", // Initialize as empty, to be updated by fetchEmployeeProfile
        designation: "", // Initialize as empty, to be updated by fetchEmployeeProfile
      };

      await AsyncStorage.setItem("token", access_token);
      await AsyncStorage.setItem("user", JSON.stringify(formattedUser));

      set({
        accessToken: access_token,
        user: formattedUser,
        isAuthenticated: true,
      });

      // Fetch employee profile to get profileImage and designation
      if (user.id) {
        const response = await getEmployeeProfile(user.id);
        const employeeData = response.data; // Assuming API returns data in `data` field
        const updatedUser: User = {
          ...formattedUser,
          profileImage: employeeData.photoUrl || "",
          designation: employeeData.designation?.name || "",
        };
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        set({ user: updatedUser });
      }
    } catch (error) {
      console.error("Error setting auth data:", error);
    }
  },

  clearAuth: async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      set({ accessToken: null, user: null, isAuthenticated: false, loading: false, error: null });
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

        // Fetch employee profile if profileImage or designation is missing
        if (user.userId && (!user.profileImage || !user.designation)) {
          const response = await getEmployeeProfile(user.userId);
          const employeeData = response.data;
          const updatedUser: User = {
            ...user,
            profileImage: employeeData.photoUrl || "",
            designation: employeeData.designation?.name || "",
          };
          await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          set({ user: updatedUser });
        }
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
      set({ accessToken: null, user: null, isAuthenticated: false, loading: false, error: null });
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  },

  fetchEmployeeProfile: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await getEmployeeProfile(userId);
      const employeeData = response.data;
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              profileImage: employeeData.photoUrl || "",
              designation: employeeData.designation?.name || "",
            }
          : state.user,
        loading: false,
      }));
      // Update AsyncStorage
      const userString = await AsyncStorage.getItem("user");
      if (userString) {
        const user = JSON.parse(userString);
        const updatedUser = {
          ...user,
          profileImage: employeeData.photoUrl || "",
          designation: employeeData.designation?.name || "",
        };
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      }
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));

export default useAuthStore;