# Chat-App-Frontend strcture

chat-app/
│
├── app/
│   ├── _layout.js
│   │
│   ├── (auth)/
│   │   ├── login.js
│   │   └── register.js
│   │
│   ├── (main)/
│   │   ├── home.js
│   │   └── chat/[id].js
│
├── context/
│   └── AuthContext.js
│
├── services/
│   ├── api.js
│   └── socket.js
│
└── utils/
    └── storage.js

# Differnce work of file

home.js
  │
  │ user clicks chat
  ▼
chat/[id].js
  │
  │ load messages
  ▼
conversation screen

# Visual Architecture

home.js
│
│ shows chat list
│
└── click user
      │
      ▼
chat/[id].js
│
│ shows conversation
│
└── send messages

# online strcture 

User opens app
      ↓
Socket connects
      ↓
Backend stores userId in memory
      ↓
User is ONLINE

User closes app / logout
      ↓
Socket disconnects
      ↓
Remove user from memory
      ↓
User is OFFLINE


🟢 Online / Offline indicator 👀 Seen / Delivered ticks ⌨ Typing indicator 🕒 Last seen system 📱 WhatsApp-level UI 🏢 Production-level architecture


| File         | Purpose             | Logic                            |
| ------------ | ------------------- | -------------------------------- |
| home.js      | chat list screen    | conversations, search, open chat |
| chat/[id].js | conversation screen | messages, send message, socket   |


# 1️⃣High Level Architecture


           ┌────────────────────────┐
           │      React Native      │
           │        (Expo)          │
           │   Mobile Application   │
           └──────────┬─────────────┘
                      │
                      │ REST API
                      ▼
           ┌────────────────────────┐
           │     Node.js + Express  │
           │        Backend API     │
           └──────────┬─────────────┘
                      │
                      │ Socket.IO
                      ▼
           ┌────────────────────────┐
           │     Real-time Server   │
           │        (Socket.IO)     │
           └──────────┬─────────────┘
                      │
                      │ Database Queries
                      ▼
           ┌────────────────────────┐
           │      MongoDB Atlas     │
           │        Database        │
           └────────────────────────┘


# 2️⃣ Frontend Architecture (React Native)

chat-app-frontend
│
├── app
│   │
│   ├── _layout.js                → Navigation Layout
│   │
│   ├── (auth)
│   │   ├── login.js              → Login Screen
│   │   └── register.js           → Register Screen
│   │
│   ├── (main)
│   │   ├── home.js               → Chat list screen
│   │   └── chat
│   │        └── [id].js          → Chat conversation
│
├── components
│   ├── ChatBubble.js
│   ├── ChatInput.js
│   ├── MessageItem.js
│   └── Avatar.js
│
├── context
│   └── AuthContext.js            → Authentication state
│
├── services
│   ├── api.js                    → Axios API calls
│   └── socket.js                 → Socket connection
│
├── utils
│   ├── storage.js                → AsyncStorage helpers
│   └── formatDate.js
│
└── constants
    └── endpoints.js


# 3️⃣ Backend Architecture (Node.js)

chat-app-backend
│
├── server.js
│
├── config
│   └── db.js                     → MongoDB connection
│
├── models
│   ├── User.js
│   ├── Message.js
│   └── Conversation.js
│
├── controllers
│   ├── authController.js
│   ├── messageController.js
│   └── conversationController.js
│
├── routes
│   ├── authRoutes.js
│   ├── messageRoutes.js
│   └── conversationRoutes.js
│
├── middleware
│   └── authMiddleware.js
│
├── sockets
│   └── socketHandler.js
│
└── utils
    └── generateToken.js



# 4️⃣ Database Architecture (MongoDB)
    MongoDB
│
├── users
│
├── conversations
│
└── messages


# 1️⃣ Production Level Features

Online / Offline status
Typing indicator
Read receipts
Delivered ticks
Push notifications
Media messages
Message reactions
Group chats




register.tsx -->call register api
login screen -->call login api