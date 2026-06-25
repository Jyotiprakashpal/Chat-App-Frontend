// API Endpoints
export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    GET_CURRENT_USER: '/auth/me',
    PUSH_TOKEN: '/auth/push-token',
  },
  // Chat endpoints
  CHAT: {
    GET_CONVERSATIONS: '/messages/conversations',
    MESSAGES: '/messages',  // (GET, POST)
    MARK_READ: '/messages/read',
  },
  // App metadata endpoints
  APP: {
    VERSION: '/app/version',
  },
  // Image endpoints
  IMAGES: {
    UPLOAD: '/images/upload',
    GET: '/images', // GET /images/:filename
    DELETE: '/images', // DELETE /images/:filename
  },
  // User endpoints
  USER: {
    GET_PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile',
    GET_USERS: '/auth/users',
  },
};

export default ENDPOINTS;
