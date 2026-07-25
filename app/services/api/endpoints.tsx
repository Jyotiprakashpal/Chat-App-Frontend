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
    GET_PROFILE: '/users/me/profile-image',
    UPDATE_PROFILE: '/users/me/profile-image',
    GET_USERS: '/auth/users',
    DELETE_PROFILE: '/users/me/profile-image',
  },
};

export default ENDPOINTS;
