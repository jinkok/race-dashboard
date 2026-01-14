// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSy...", // 여기에 본인의 API Key 입력
    authDomain: "race-app-3e41d.firebaseapp.com",
    projectId: "race-app-3e41d",
    storageBucket: "race-app-3e41d.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};

// Firebase 초기화 및 내보내기
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
