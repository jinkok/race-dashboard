import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyDVJRqmpFjR9g91AgQsJIV65_7BJ7yYEOU",
    authDomain: "race-app-3e41d.firebaseapp.com",
    projectId: "race-app-3e41d",
    storageBucket: "race-app-3e41d.firebasestorage.app",
    messagingSenderId: "232853669556",
    appId: "1:232853669556:web:f9e7c8ccfde227f50679e1",
    measurementId: "G-H6MB9KZ8M8"
};


try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    window.fb = { auth, db, doc, setDoc, onSnapshot, signInAnonymously, onAuthStateChanged, isReady: true };
} catch (e) {
    console.error("Firebase Init Error:", e);
}
