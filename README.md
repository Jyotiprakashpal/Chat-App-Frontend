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