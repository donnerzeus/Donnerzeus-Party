import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyATH9mc6Bcp1Chnm5malZX1mV_AmFydD0M",
    authDomain: "donnerzeus-party.firebaseapp.com",
    databaseURL: "https://donnerzeus-party-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "donnerzeus-party",
    storageBucket: "donnerzeus-party.firebasestorage.app",
    messagingSenderId: "898300453136",
    appId: "1:898300453136:web:e0ddeedef514c1c3334595",
    measurementId: "G-4YZT40V2WB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
