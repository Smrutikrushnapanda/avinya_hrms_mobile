import axios from "axios";
import useAuthStore from "../store/useUserStore";

// Base fallback API URL
const fallbackURL = "https://hrms-backend-346486007446.asia-south1.run.app/";

// Axios instance configuration
const api = axios.create({
  baseURL: fallbackURL,
  timeout: 30000, // Timeout in ms
  withCredentials: true,
});

// Request interceptor to attach Authorization header
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("API Request Config:", {
      url: config.url,
      method: config.method,
      headers: config.headers,
      timeout: config.timeout,
    });
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor to log success and handle 401
api.interceptors.response.use(
  (response) => {
    console.log("API Response Success:", {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error("API Response Error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      console.error("Unauthorized - Redirect to login");
      useAuthStore.getState().clearAuth();
    }
    return Promise.reject(error);
  }
);

//
// 🔐 Auth APIs
//

// ✅ Login API - Authenticate user and receive token
export const login = (data: { userName: string; password: string }) =>
  api.post("/auth/login", data);

// ✅ Logout API - Invalidate the user's session/token
export const logout = () => api.post("/auth/logout");

// ✅ Profile API - Get the logged-in user's profile
export const profile = () => api.get("/auth/profile");

//
// 🕒 Attendance APIs
//

// ✅ Log Attendance API - Submit attendance with location, WiFi, and photo
export const logAttendance = async (data: {
  organizationId: string;
  userId: string;
  source: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  wifiSsid: string;
  wifiBssid: string;
  deviceInfo: string;
  enableFaceValidation: boolean;
  enableWifiValidation: boolean;
  enableGPSValidation: boolean;
  imageUri: string;
}) => {
  try {
    console.log("=== logAttendance API Call Started ===");

    console.log("Input data validation:", {
      organizationId: data.organizationId,
      userId: data.userId,
      source: data.source,
      timestamp: data.timestamp,
      latitude: data.latitude,
      longitude: data.longitude,
      locationAddress: data.locationAddress,
      wifiSsid: data.wifiSsid,
      wifiBssid: data.wifiBssid,
      deviceInfo: data.deviceInfo,
      enableFaceValidation: data.enableFaceValidation,
      enableWifiValidation: data.enableWifiValidation,
      enableGPSValidation: data.enableGPSValidation,
      imageUri: data.imageUri ? `URI: ${data.imageUri.substring(0, 50)}...` : "❌ NO URI",
    });

    if (!data.imageUri || data.imageUri.trim() === '') {
      console.error("❌ Image URI validation failed");
      throw new Error("Image URI is required but missing");
    }

    console.log("✅ Image URI validation passed");

    // Check network connectivity before submission
    try {
      const networkTest = await api.get("/");
      console.log("✅ Network test successful");
    } catch (networkError) {
      console.error("❌ Network test failed:", networkError.message);
      throw new Error("Network connectivity issue. Please check your internet connection.");
    }

    // Create FormData for file upload
    const formData = new FormData();

    formData.append('organizationId', data.organizationId);
    formData.append('userId', data.userId);
    formData.append('source', data.source);
    formData.append('timestamp', data.timestamp);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    formData.append('locationAddress', data.locationAddress);
    formData.append('wifiSsid', data.wifiSsid);
    formData.append('wifiBssid', data.wifiBssid);
    formData.append('deviceInfo', data.deviceInfo);
    formData.append('enableFaceValidation', data.enableFaceValidation.toString());
    formData.append('enableWifiValidation', data.enableWifiValidation.toString());
    formData.append('enableGPSValidation', data.enableGPSValidation.toString());

    const imageFile = {
      uri: data.imageUri,
      type: 'image/jpeg',
      name: 'attendance_photo.jpg',
    };

    console.log("📸 Image file object:", {
      uri: imageFile.uri ? `${imageFile.uri.substring(0, 50)}...` : "❌ UNDEFINED",
      type: imageFile.type,
      name: imageFile.name,
    });

    if (!imageFile.uri) {
      throw new Error("Image file URI became undefined during FormData creation");
    }

    formData.append('photo', imageFile as any);

    console.log("✅ FormData created successfully");

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json',
      },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    };

    console.log("🚀 Making API request...");
    console.log("📍 URL:", `${fallbackURL}attendance/log`);

    const response = await api.post("/attendance/log", formData, config);

    console.log("=== ✅ logAttendance API Call Successful ===");
    return response;

  } catch (error:any) {
    console.error("=== ❌ logAttendance API Call Failed ===");
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });

    if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again with a better connection.');
    } else if (error.message.includes('Image URI')) {
      throw new Error('Image capture failed. Please try taking the photo again.');
    } else {
      throw error;
    }
  }
};

// ✅ Get Today's Attendance Logs - Returns all logs submitted by the user today
export const todayLogs = () => {
  const { user } = useAuthStore.getState();

  if (!user?.userId || !user?.organizationId) {
    throw new Error("User ID or Organization ID not found in auth store.");
  }

  return api.get("/attendance/today-logs", {
    params: {
      organizationId: user.organizationId,
      userId: user.userId,
    },
  });
};

// ✅ Get Monthly Attendance - Returns all attendance logs for a specific month and year
export const monthlyAttendance = (userId: string, month: number, year: number,organizationId:string) => {
  return api.get("/attendance/monthly", {
    params: {
      userId,
      month,
      year,
      organizationId
    },
  });
};

export const getHolidaysByFinancialYear = ({
  organizationId,
  fromYear,
}: {
  organizationId: string;
  fromYear: number;
}) => {
  return api.get("/attendance/holidays/financial-year", {
    params: {
      organizationId,
      fromYear,
    },
  });
};

export default api;