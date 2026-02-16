import axios from "axios";
import { router } from "expo-router";

const getAuthStore = () => require("../store/useUserStore").default;

const cloudFallbackURL = "https://avinya-hrms-backend.onrender.com";
const localFallbackURL = "http://10.0.2.2:8080";
const envOverrideURL =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL;
const isDev = process.env.NODE_ENV === "development";
const apiBaseURL = envOverrideURL || (isDev ? localFallbackURL : cloudFallbackURL);


// Axios instance configuration
const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000, // Timeout in ms
  withCredentials: true,
});

// Request interceptor to attach Authorization header
api.interceptors.request.use(
  (config) => {
    const accessToken = getAuthStore().getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
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
      const requestUrl = error.config?.url || "";
      const isAuthRoute = requestUrl.includes("/auth/");

      if (!isAuthRoute) {
        const authState = getAuthStore().getState();
        if (authState.isAuthenticated) {
          console.error("Unauthorized - Redirect to login");
          authState.clearAuth();
          router.replace("/(auth)/Login");
        }
      }
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

// ✅ Employee Profile API - Get employee details by user ID
export const getEmployeeProfile = (userId: string) => {
  return api.get(`/employees/by-user/${userId}`);
};

// ✅ Organization API - Get organization details by ID
export const getOrganization = (organizationId: string) => {
  return api.get(`/organizations/${organizationId}`);
};


// ✅ Log Attendance API - Submit attendance with location, WiFi, and photo
export const logAttendance = async (data: {
  organizationId: string;
  userId: string;
  source: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  locationAddress?: string;
  wifiSsid?: string;
  wifiBssid?: string;
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
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      locationAddress: data.locationAddress ?? "",
      wifiSsid: data.wifiSsid ?? "",
      wifiBssid: data.wifiBssid ?? "",
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
    if (data.latitude != null) formData.append('latitude', data.latitude.toString());
    if (data.longitude != null) formData.append('longitude', data.longitude.toString());
    if (data.locationAddress) formData.append('locationAddress', data.locationAddress);
    if (data.wifiSsid) formData.append('wifiSsid', data.wifiSsid);
    if (data.wifiBssid) formData.append('wifiBssid', data.wifiBssid);
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
    console.log("📍 URL:", `${apiBaseURL}/attendance/log`);

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
export const todayLogs = (organizationId?: string, userId?: string) => {
  const { user } = getAuthStore().getState();
  const finalOrganizationId = organizationId ?? user?.organizationId;
  const finalUserId = userId ?? user?.userId;

  if (!finalUserId || !finalOrganizationId) {
    throw new Error("User ID or Organization ID not found in auth store.");
  }

  return api.get("/attendance/today-logs", {
    params: {
      organizationId: finalOrganizationId,
      userId: finalUserId,
    },
  });
};

// ✅ Get Monthly Attendance - Returns all attendance logs for a specific month and year
export const monthlyAttendance = (userId: string, month: number, year: number, organizationId: string) => {
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

// ✅ Get Active Polls - Returns currently active polls for the authenticated user
export const getActivePolls = () => {
  const { user } = getAuthStore().getState();

  if (!user?.userId) {
    throw new Error("User ID not found in auth store.");
  }

  return api.get("/polls/active", {
    params: {
      userId: user.userId,
    },
  });
};

// ✅ Save Poll Response - Submit user's selected option for a poll
export const savePollResponse = (data: {
  poll_id: string;
  question_id: string;
  user_id: string;
  option_ids: string[];
}) => {
  return api.post("/polls/save-response", data);
};

export const timeSlips = (data: {
  employeeId: string;
  organizationId: string;
  date: string; 
  missingType: "IN" | "OUT" | "BOTH";
  correctedIn?: string;  
  correctedOut?: string; 
  reason: string;
}) => {
  return api.post("/Timeslips", data);
};


export const getActiveNotices = () => {
  return api.get("/notices/active");
};

// 💬 Messaging APIs
export const getInboxMessages = () => api.get("/messages/inbox");
export const markMessageRead = (messageId: string) =>
  api.post("/messages/read", { messageId });

export const getCurrentTime = () => {
  return api.get("/common/time/now");
};

// 💰 Payroll APIs
export const getPayrollRecords = (params: any) => api.get("/payroll", { params });
export const downloadPayrollSlip = (id: string) =>
  api.get(`/payroll/${id}/slip`, { responseType: "arraybuffer" });
export const getPayrollNotifications = (employeeId: string) =>
  api.get(`/payroll/notifications/${employeeId}`);
export const markPayrollNotificationRead = (notificationId: string) =>
  api.patch(`/payroll/notifications/${notificationId}/read`);

export const getTimeslipsByEmployee = (employeeId: string, limit: number = 10, page: number = 1) => {
  return api.get(`/timeslips/employee/${employeeId}`, {
    params: {
      limit,
      page,
    },
  });
};

export const getTimeslipById = (timeslipId: string) => {
  return api.get(`/timeslips/${timeslipId}`);
};
  
// ✅ Get All Timeslips by Employee ID
export const getAllTimeslipsByEmployee = (employeeId: string, limit = 10, page = 1) => {
  return api.get(
    `/timeslips/approver/${employeeId}?limit=${limit}&page=${page}`
  );
};

export const batchApproveUpdate = (
  approvalIds: string[],
  action: "APPROVED" | "REJECTED" | "PENDING",
  remarks: string
) => {
  return api.post("/timeslips/batch-approve-submissions", {
    approvalIds,
    action,
    remarks,
  });
};

// ✅ Get Authenticated User Profile - Returns details of the logged-in user
export const getAuthProfile = () => {
  return api.get("/auth/profile");
};

// 📋 Leave APIs
export const getLeaveTypes = (orgId: string) =>
  api.get(`/leave/types/${orgId}`);
export const getLeaveBalance = (userId: string) =>
  api.get(`/leave/balance/${userId}`);
export const applyLeave = (userId: string, data: any) =>
  api.post(`/leave/apply/${userId}`, data);
export const getLeaveRequests = (userId: string) =>
  api.get(`/leave/requests/${userId}`);
export const getPendingLeaves = (approverId: string) =>
  api.get(`/leave/pending/${approverId}`);
export const approveLeave = (
  requestId: string,
  approverId: string,
  data: any
) => api.post(`/leave/approve/${requestId}/${approverId}`, data);
export const getAllLeaveApprovals = (approverId: string) =>
  api.get(`/leave/my-approvals/${approverId}`);

// 🏠 WFH APIs
export const applyWfh = (userId: string, data: any) =>
  api.post(`/wfh/apply/${userId}`, data);
export const getWfhRequests = (userId: string) =>
  api.get(`/wfh/requests/${userId}`);
export const getPendingWfh = (approverId: string) =>
  api.get(`/wfh/pending/${approverId}`);
export const approveWfh = (
  requestId: string,
  approverId: string,
  data: any
) => api.post(`/wfh/approve/${requestId}/${approverId}`, data);
export const getWfhBalance = (userId: string) =>
  api.get(`/wfh/balance/${userId}`);

// 💬 Chat APIs
export const getChatConversations = () => api.get("/chat/conversations");
export const createDirectConversation = (userId: string) =>
  api.post("/chat/conversations/direct", { userId });
export const getChatMessages = (conversationId: string, params?: any) =>
  api.get(`/chat/conversations/${conversationId}/messages`, { params });
export const sendChatMessage = (conversationId: string, data: any) =>
  api.post(`/chat/conversations/${conversationId}/messages`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getEmployees = (organizationId: string) =>
  api.get("/employees", { params: { organizationId } });

export default api;
