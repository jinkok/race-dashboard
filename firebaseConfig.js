// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDVJRqmpFjR9g91AgQsJIV65_7BJ7yYEOU",
    authDomain: "race-app-3e41d.firebaseapp.com",
    projectId: "race-app-3e41d",
    storageBucket: "race-app-3e41d.firebasestorage.app",
    messagingSenderId: "232853669556",
    appId: "1:232853669556:web:f9e7c8ccfde227f50679e1",
    measurementId: "G-H6MB9KZ8M8"
};
// 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// index.html의 React 컴포넌트가 사용할 수 있도록 전역 변수에 등록
window.fb = { db, auth, doc, onSnapshot, setDoc, signInAnonymously, onAuthStateChanged };
