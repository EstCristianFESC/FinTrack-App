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
    return new Promise((resolve) => {
        Alert.prompt(
            'Autenticación Requerida',
            'Ingresa tu contraseña para continuar',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
                {
                    text: 'Confirmar',
                    onPress: async (password?: string) => {
                        try {
                            const user = auth.currentUser;
                            if (user && user.email && password) {
                                await signInWithEmailAndPassword(auth, user.email, password);
                                resolve(true);
                            } else {
                                Alert.alert('Error', 'No se pudo verificar la contraseña');
                                resolve(false);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Contraseña incorrecta');
                            resolve(false);
                        }
                    },
                },
            ],
            'secure-text'
        );
    });
}
