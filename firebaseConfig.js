// firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyDVJRqmpFjR9g91AgQsJIV65_7BJ7yYEOU",
    authDomain: "race-app-3e41d.firebaseapp.com",
    projectId: "race-app-3e41d",
    storageBucket: "race-app-3e41d.firebasestorage.app",
    messagingSenderId: "232853669556",
    appId: "1:232853669556:web:f9e7c8ccfde227f50679e1",
    measurementId: "G-H6MB9KZ8M8"
};

// Firebase 초기화 및 내보내기
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
