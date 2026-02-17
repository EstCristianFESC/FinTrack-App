// Utility function for authentication before sensitive operations
import { Alert } from 'react-native';
import { authenticateWithBiometrics, isBiometricSupported, isBiometricEnrolled } from './biometrics';
import { auth } from '../firebase/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function authenticateUser(): Promise<boolean> {
    // Try biometric first
    const supported = await isBiometricSupported();
    const enrolled = await isBiometricEnrolled();

    if (supported && enrolled) {
        const result = await authenticateWithBiometrics();
        return result.success;
    }

    // Fallback to password
    // Fallback to password - Caller must handle UI
    return false;
}
