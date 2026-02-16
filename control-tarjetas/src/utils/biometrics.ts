import * as LocalAuthentication from 'expo-local-authentication';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function isBiometricSupported(): Promise<boolean> {
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        return compatible;
    } catch (error) {
        return false;
    }
}

export async function isBiometricEnrolled(): Promise<boolean> {
    try {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        return enrolled;
    } catch (error) {
        return false;
    }
}

export async function authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Autenticarse con huella o Face ID',
            fallbackLabel: 'Usar contraseña',
            cancelLabel: 'Cancelar',
        });

        if (result.success) {
            return { success: true };
        } else {
            return { success: false, error: result.error || 'Autenticación fallida' };
        }
    } catch (error) {
        return { success: false, error: 'Error en autenticación biométrica' };
    }
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem('biometric_enabled', enabled ? 'true' : 'false');
}

export async function getBiometricPreference(): Promise<boolean> {
    const pref = await AsyncStorage.getItem('biometric_enabled');
    return pref === 'true';
}
