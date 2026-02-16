import { initializeApp } from 'firebase/app';
import {


    initializeAuth,
    // @ts-ignore
    getReactNativePersistence,
    GoogleAuthProvider,
    signInWithCredential,
} from 'firebase/auth';

import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyChmAjPaWhITu1x149zlVa4rgYMJuqDvOU",
    authDomain: "fintrack-dba26.firebaseapp.com",
    projectId: "fintrack-dba26",
    storageBucket: "fintrack-dba26.firebasestorage.app",
    messagingSenderId: "616503263288",
    appId: "1:616503263288:web:137d296d78db532905a6cd",
};

const app = initializeApp(firebaseConfig);

// 🔐 Auth con persistencia REAL en móvil
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});


// 🗄️ Firestore
export const db = getFirestore(app);