// Test utility for verifying admin-created credentials login
// File: hrms-mobile-app/utils/loginTest.ts

import { login } from '../api/api';

interface LoginTestResult {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
  error?: string;
}

/**
 * Test login with admin-created credentials
 * @param userName - Username created by admin
 * @param password - Password created by admin
 * @returns Test result with success status and details
 */
export const testAdminCreatedCredentials = async (
  userName: string,
  password: string
): Promise<LoginTestResult> => {
  try {
    console.log('🧪 Starting login test with admin-created credentials...');
    console.log(`📝 Username: ${userName}`);

    // Step 1: Validate inputs
    if (!userName || !password) {
      return {
        success: false,
        message: 'Username and password are required',
        error: 'INVALID_INPUT',
      };
    }

    // Step 2: Attempt login
    console.log('🔐 Attempting login...');
    const response = await login({
      userName,
      password,
    });

    // Step 3: Validate response
    if (!response.data?.access_token) {
      return {
        success: false,
        message: 'No token received from server',
        error: 'NO_TOKEN',
      };
    }

    const { access_token, user } = response.data;

    console.log('✅ Login successful!');
    console.log('📋 User Details:', {
      id: user?.id,
      userName: user?.userName,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      roles: user?.roles,
      organizationId: user?.organizationId,
    });

    return {
      success: true,
      message: 'Login successful with admin-created credentials',
      token: access_token,
      user: {
        id: user?.id,
        userName: user?.userName,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        roles: user?.roles,
        organizationId: user?.organizationId,
        isActive: user?.isActive,
        lastLoginAt: user?.lastLoginAt,
      },
    };
  } catch (error: any) {
    console.error('❌ Login test failed:', error);

    const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
    const statusCode = error?.response?.status;

    let errorType = 'UNKNOWN_ERROR';
    if (statusCode === 401) {
      errorType = 'INVALID_CREDENTIALS';
    } else if (statusCode === 404) {
      errorType = 'USER_NOT_FOUND';
    } else if (statusCode === 400) {
      errorType = 'BAD_REQUEST';
    }

    return {
      success: false,
      message: `Login failed: ${errorMessage}`,
      error: errorType,
    };
  }
};

/**
 * Verify token is valid and can be used for API calls
 * @param token - JWT token to verify
 * @returns Verification result
 */
export const verifyToken = async (token: string): Promise<LoginTestResult> => {
  try {
    console.log('🔍 Verifying token...');

    // Decode JWT to check expiration (basic check)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        success: false,
        message: 'Invalid token format',
        error: 'INVALID_TOKEN_FORMAT',
      };
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return {
        success: false,
        message: 'Token has expired',
        error: 'TOKEN_EXPIRED',
      };
    }

    console.log('✅ Token is valid');
    console.log('📋 Token Payload:', {
      userId: payload.userId,
      userName: payload.userName,
      roles: payload.roles,
      expiresIn: payload.exp ? `${Math.floor((payload.exp - now) / 60)} minutes` : 'N/A',
    });

    return {
      success: true,
      message: 'Token is valid and not expired',
      user: payload,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Token verification failed: ${error.message}`,
      error: 'TOKEN_VERIFICATION_FAILED',
    };
  }
};

/**
 * Run complete login test suite
 */
export const runLoginTestSuite = async (
  userName: string,
  password: string
): Promise<void> => {
  console.log('\n========================================');
  console.log('🧪 ADMIN-CREATED CREDENTIALS LOGIN TEST');
  console.log('========================================\n');

  // Test 1: Login
  console.log('Test 1: Login with admin-created credentials');
  console.log('-------------------------------------------');
  const loginResult = await testAdminCreatedCredentials(userName, password);

  if (!loginResult.success) {
    console.error('❌ Login test failed:', loginResult.message);
    console.error('Error:', loginResult.error);
    return;
  }

  console.log('✅ Login test passed\n');

  // Test 2: Verify token
  if (loginResult.token) {
    console.log('Test 2: Verify token validity');
    console.log('-------------------------------------------');
    const tokenResult = await verifyToken(loginResult.token);

    if (!tokenResult.success) {
      console.error('❌ Token verification failed:', tokenResult.message);
      return;
    }

    console.log('✅ Token verification passed\n');
  }

  // Summary
  console.log('========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
  console.log('\n✨ Admin-created credentials work correctly!');
  console.log('📱 User can now login to mobile app');
};

// Export for testing
export default {
  testAdminCreatedCredentials,
  verifyToken,
  runLoginTestSuite,
};
