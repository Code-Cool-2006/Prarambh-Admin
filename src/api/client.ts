import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set this to true to run the app standalone with hardcoded credentials and local mock data.
// Set to false to connect to your live Express + database backend.
const USE_MOCK = false;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.20:3000';
const baseURL = API_BASE_URL;

// eslint-disable-next-line import/no-named-as-default-member
const client = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock database in-memory for testing scanner & list
const mockAttendance = [
  { id: '1', name: 'Rishab Dev', check_ins: 1, last_in: new Date(Date.now() - 3600000).toISOString(), last_out: null },
  { id: '2', name: 'Aditya Sen', check_ins: 0, last_in: null, last_out: null },
  { id: '3', name: 'Neha Gupta', check_ins: 2, last_in: new Date(Date.now() - 7200000).toISOString(), last_out: new Date(Date.now() - 5400000).toISOString() },
  { id: '4', name: 'Siddharth Roy', check_ins: 0, last_in: null, last_out: null },
  { id: '5', name: 'Priya Sharma', check_ins: 0, last_in: null, last_out: null }
];

// Configure Mock Adapter if enabled
if (USE_MOCK) {
  client.defaults.adapter = async (config) => {
    const { url, method, data } = config;
    
    // Simulate a brief network delay
    await new Promise((resolve) => setTimeout(resolve, 400));

    // 1. Mock Login Endpoint
    if (url === '/auth/login' && method?.toLowerCase() === 'post') {
      const { username, password } = JSON.parse(data || '{}');
      
      // Hardcoded Admin Credentials check
      if (username?.toLowerCase() === 'admin' && password === 'admin123') {
        return {
          data: {
            token: 'mock-jwt-token-12345',
            user: {
              id: 'mock-admin-id',
              name: 'System Admin',
              email: 'admin@prarambh.com',
              role: 'admin'
            }
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      } else {
        return Promise.reject({
          response: {
            data: { error: 'Invalid credentials' },
            status: 401,
            statusText: 'Unauthorized',
            headers: {},
            config,
          }
        });
      }
    }

    // 2. Mock Today's Attendance Report
    if (url === '/attendance/report/today' && method?.toLowerCase() === 'get') {
      return {
        data: [...mockAttendance],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 3. Mock Scan Check In/Out
    if (url === '/scan' && method?.toLowerCase() === 'post') {
      const { qrData, scanType } = JSON.parse(data || '{}');
      
      // Check if scanned QR data matches a name or ID in our mock list
      let attendee = mockAttendance.find(
        (a) => a.name.toLowerCase() === qrData.trim().toLowerCase() || a.id === qrData.trim()
      );

      // If attendee doesn't exist, dynamically add them to the list (great for testing)
      if (!attendee) {
        attendee = {
          id: String(mockAttendance.length + 1),
          name: qrData.trim(),
          check_ins: 0,
          last_in: null,
          last_out: null
        };
        mockAttendance.push(attendee);
      }

      // Log IN/OUT scan
      if (scanType === 'IN') {
        attendee.check_ins += 1;
        attendee.last_in = new Date().toISOString();
      } else {
        attendee.last_out = new Date().toISOString();
      }

      return {
        data: {
          message: `Logged ${scanType} for ${attendee.name} successfully!`
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // Return 404 for unhandled requests
    return Promise.reject({
      response: {
        data: { error: 'Not Found' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
      }
    });
  };
}

// Request interceptor to automatically attach authorization token to requests
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('adminToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching admin token from SecureStore:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface HealthStatus {
  status: 'connected' | 'waking' | 'offline';
  latencyMs?: number;
  message?: string;
  checkedAt: Date;
}

export async function checkBackendHealth(timeoutMs = 6000): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const res = await axios.get(`${baseURL}/health`, { timeout: timeoutMs });
    const latencyMs = Date.now() - start;
    if (res.status === 200 && res.data?.status === 'ok') {
      return { status: 'connected', latencyMs, checkedAt: new Date() };
    }
    return { status: 'offline', message: `Server responded with ${res.status}`, checkedAt: new Date() };
  } catch (err: any) {
    const duration = Date.now() - start;
    if (err.code === 'ECONNABORTED' || duration >= timeoutMs - 500) {
      return { status: 'waking', message: 'Server is waking up (cold start)...', checkedAt: new Date() };
    }
    return { status: 'offline', message: err.message || 'Cannot reach server', checkedAt: new Date() };
  }
}

export default client;
