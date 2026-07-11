// ../../store/useUserStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getEmployeeProfile, getOrganizationPlan, logout } from '../api/api'; // Adjust path as needed

type OrganizationPlanType = "BASIC" | "PRO" | "ENTERPRISE" | null;

function normalizeOrganizationPlanType(
  planType?: string | number | null
): OrganizationPlanType {
  const normalizedType =
    planType == null ? "" : String(planType).trim().toUpperCase();

  if (
    normalizedType === "BASIC" ||
    normalizedType === "PRO" ||
    normalizedType === "ENTERPRISE"
  ) {
    return normalizedType as OrganizationPlanType;
  }

  if (normalizedType === "1") return "BASIC";
  if (normalizedType === "2") return "PRO";
  if (normalizedType === "3") return "ENTERPRISE";

  return null;
}

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
  profileImage: string; // Signed passport/photo URL
  designation: string; // Added for designation.name
  planType?: OrganizationPlanType;
  planName?: string | null;
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
      const organizationId = user.organization?.id || "";
      const hintedPlanName =
        user.planName ??
        user.organization?.planName ??
        null;
      const hintedPlanType = normalizeOrganizationPlanType(
        user.planType ??
          user.pricingTypeId ??
          user.pricingType?.typeId ??
          user.organization?.planType ??
          user.organization?.pricingTypeId ??
          user.organization?.pricingType?.typeId ??
          null
      );

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
        organizationId,
        mustChangePassword: user.mustChangePassword,
        profileImage: "", // Initialize as empty, to be updated by fetchEmployeeProfile
        designation: "", // Initialize as empty, to be updated by fetchEmployeeProfile
        planType: hintedPlanType,
        planName: hintedPlanName,
      };

      await AsyncStorage.setItem("token", access_token);
      await AsyncStorage.setItem("user", JSON.stringify(formattedUser));

      set({
        accessToken: access_token,
        user: formattedUser,
        isAuthenticated: true,
      });

      const profilePromise = user.id
        ? getEmployeeProfile(user.id).catch(() => null)
        : Promise.resolve(null);
      const orgPlanPromise = organizationId
        ? getOrganizationPlan(organizationId).catch(() => null)
        : Promise.resolve(null);

      const [profileResponse, orgPlanResponse] = await Promise.all([
        profilePromise,
        orgPlanPromise,
      ]);

      let resolvedPlanType = hintedPlanType;
      let resolvedPlanName = hintedPlanName;
      const orgPlan = (orgPlanResponse as any)?.data ?? null;

      if (orgPlan) {
        resolvedPlanName =
          orgPlan.name ??
          orgPlan.planName ??
          orgPlan.plan?.name ??
          orgPlan.plan?.planName ??
          resolvedPlanName;
        resolvedPlanType = normalizeOrganizationPlanType(
          orgPlan.planType ??
            orgPlan.pricingTypeId ??
            orgPlan.plan?.planType ??
            orgPlan.plan?.pricingTypeId ??
            null
        );
      }

      const employeeData = (profileResponse as any)?.data ?? null;
      const updatedUser: User = {
        ...formattedUser,
        profileImage:
          employeeData?.passportPhotoUrl ||
          employeeData?.photoUrl ||
          "",
        designation: employeeData?.designation?.name || "",
        planType: resolvedPlanType,
        planName: resolvedPlanName,
      };
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      set({ user: updatedUser });
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

        const shouldFetchProfile =
          Boolean(user.userId) && (!user.profileImage || !user.designation);
        const shouldFetchPlan =
          Boolean(user.organizationId) && !user.planType;

        if (shouldFetchProfile || shouldFetchPlan) {
          const profilePromise = shouldFetchProfile
            ? getEmployeeProfile(user.userId).catch(() => null)
            : Promise.resolve(null);
          const planPromise = shouldFetchPlan
            ? getOrganizationPlan(user.organizationId).catch(() => null)
            : Promise.resolve(null);

          const [profileResponse, planResponse] = await Promise.all([
            profilePromise,
            planPromise,
          ]);

          const employeeData = (profileResponse as any)?.data ?? null;
          const planData = (planResponse as any)?.data ?? null;
          const planName =
            planData?.name ??
            planData?.planName ??
            planData?.plan?.name ??
            planData?.plan?.planName ??
            user.planName ??
            null;
          const planType = planData
            ? normalizeOrganizationPlanType(
                planData?.planType ??
                  planData?.pricingTypeId ??
                  planData?.plan?.planType ??
                  planData?.plan?.pricingTypeId ??
                  null
              )
            : user.planType ?? null;

          const updatedUser: User = {
            ...user,
            profileImage:
              employeeData?.passportPhotoUrl ||
              employeeData?.photoUrl ||
              user.profileImage ||
              "",
            designation: employeeData?.designation?.name || user.designation || "",
            planType,
            planName,
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
              profileImage:
                employeeData.passportPhotoUrl ||
                employeeData.photoUrl ||
                "",
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
          profileImage:
            employeeData.passportPhotoUrl ||
            employeeData.photoUrl ||
            "",
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
