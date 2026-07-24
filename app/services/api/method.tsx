import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "./baseurl";

// Helper function to get the auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("token");
    return token;
  } catch (error) {
    return null;
  }
};

// Helper function to make fetch requests
const fetchWithAuth = async (
  endpoint: string,
  method: string,
  data?: any,
  params?: Record<string, string>,
  explicitToken?: string
): Promise<any> => {
  try {
    // Build URL with query parameters if provided
    let url = `${BASE_URL}${endpoint}`;
    
    if (method === "GET" && params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    // Get the auth token - use explicit token if provided, otherwise get from storage
    const token = explicitToken || await getAuthToken();

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (data && method !== "GET") {
      fetchOptions.body = JSON.stringify(data);
    }

    // Make the request
    const response = await fetch(url, fetchOptions);

    // Get response as text first
    const responseText = await response.text();
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If not JSON, treat as error message
      responseData = { message: responseText || "Invalid response format" };
    }

    // Check if response is successful
    if (!response.ok) {
      throw new Error(responseData.message || `Request failed with status ${response.status}`);
    }

    return responseData;
  } catch (error: any) {
    throw error;
  }
};

// API methods object
export const API = {

  post: async (endpoint: string, data: any, token?: string): Promise<any> => {
    return fetchWithAuth(endpoint, "POST", data, undefined, token);
  },


  get: async (endpoint: string, params?: Record<string, string>, token?: string): Promise<any> => {
    return fetchWithAuth(endpoint, "GET", undefined, params, token);
  },

  
  put: async (endpoint: string, data: any): Promise<any> => {
    return fetchWithAuth(endpoint, "PUT", data);
  },

  delete: async (endpoint: string, data?: any): Promise<any> => {
    return fetchWithAuth(endpoint, "DELETE", data);
  },
};

export default API;
