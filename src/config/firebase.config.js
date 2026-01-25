// Firebase Configuration Template
// Replace these values with your actual Firebase project credentials
// Get these from: Firebase Console > Project Settings > General > Your apps > SDK setup and configuration

export const firebaseConfig = {
  apiKey: "AIzaSyCCoeCBpdebVBJy4GDOrY21x562VIiVBgo",
  authDomain: "fullertonflyer-3afb9.firebaseapp.com",
  databaseURL: "https://fullertonflyer-3afb9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fullertonflyer-3afb9",
  storageBucket: "fullertonflyer-3afb9.firebasestorage.app",
  messagingSenderId: "707470285080",
  appId: "1:707470285080:web:e0b10126c6ba756549e66d"
};

// Instructions:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select existing one
// 3. Enable Authentication (Email/Password)
// 4. Enable Realtime Database
// 5. Copy your config values above
// 6. Set up database rules (see below)

/*
Recommended Realtime Database Rules:
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "$uid === auth.uid"
      }
    },
    "leaderboard": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
*/
