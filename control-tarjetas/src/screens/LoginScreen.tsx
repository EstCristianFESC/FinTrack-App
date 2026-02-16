import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { authenticateWithBiometrics, isBiometricSupported, isBiometricEnrolled } from '../utils/biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const { colors, theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        checkBiometrics();
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const checkBiometrics = async () => {
        const supported = await isBiometricSupported();
        const enrolled = await isBiometricEnrolled();
        setBiometricAvailable(supported && enrolled);
    };

    const handleBiometricLogin = async () => {
        const result = await authenticateWithBiometrics();
        if (result.success) {
            try {
                const savedEmail = await AsyncStorage.getItem('saved_email');
                const savedPassword = await AsyncStorage.getItem('saved_password');

                if (savedEmail && savedPassword) {
                    setLoading(true);
                    try {
                        await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
                    } catch (error: any) {
                        Alert.alert('Error', 'Credenciales guardadas inválidas. Por favor inicia sesión nuevamente.');
                        await AsyncStorage.removeItem('saved_email');
                        await AsyncStorage.removeItem('saved_password');
                    } finally {
                        setLoading(false);
                    }
                } else {
                    Alert.alert('Info', 'Por favor inicia sesión primero para habilitar el login biométrico.');
                }
            } catch (error) {
                Alert.alert('Error', 'No se pudieron recuperar las credenciales guardadas.');
            }
        } else {
            Alert.alert('Error', result.error || 'No se pudo autenticar');
        }
    };

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Por favor ingresa tu email para restablecer la contraseña');
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña');
            setIsResetting(false);
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('auth/invalid-email')) msg = 'Email inválido';
            else if (msg.includes('auth/user-not-found')) msg = 'Usuario no encontrado';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa email y contraseña');
            return;
        }

        setLoading(true);
        try {
            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                Alert.alert('Bienvenido', 'Cuenta creada exitosamente');
                // You might want to automatically save credentials here too if desired
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                await AsyncStorage.setItem('saved_email', email);
                await AsyncStorage.setItem('saved_password', password);
            }
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('auth/invalid-email')) msg = 'Email inválido';
            else if (msg.includes('auth/user-not-found')) msg = 'Usuario no encontrado';
            else if (msg.includes('auth/wrong-password')) msg = 'Contraseña incorrecta';
            else if (msg.includes('auth/email-already-in-use')) msg = 'Este email ya está registrado';
            else if (msg.includes('auth/weak-password')) msg = 'La contraseña debe tener al menos 6 caracteres';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In Request
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: '616503263288-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // TODO: Reemplazar con Client ID real de Google Cloud
        iosClientId: '616503263288-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
        androidClientId: '616503263288-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            setLoading(true);
            signInWithCredential(auth, credential)
                .then(async (userCredential) => {
                    Alert.alert('Éxito', `Bienvenido ${userCredential.user.displayName || 'Usuario'}`);
                })
                .catch((error) => {
                    Alert.alert('Error', 'Fallo al iniciar sesión con Google: ' + error.message);
                })
                .finally(() => setLoading(false));
        }
    }, [response]);

    const handleGoogleSignIn = () => {
        promptAsync();
    };

    return (
        <LinearGradient
            colors={['#0A2540', '#133154']} // Deep Blue Gradient
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Logo/Title Section */}
                <View style={styles.header}>
                    <Text style={styles.logo}>💳</Text>
                    <Text style={styles.title}>FinTrack</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        {isResetting ? 'Recuperar Contraseña' : isRegistering ? 'Crear Cuenta' : 'Bienvenido de nuevo'}
                    </Text>
                </View>

                {/* Form Card */}
                <View style={[styles.card, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <View style={styles.cardInner}>
                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>EMAIL</Text>
                            <View style={[styles.inputContainer, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="tu@email.com"
                                    placeholderTextColor="rgba(255,255,255,0.4)"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        {!isResetting && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>CONTRASEÑA</Text>
                                <View style={[styles.inputContainer, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="••••••••"
                                        placeholderTextColor="rgba(255,255,255,0.4)"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        editable={!loading}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeButton}
                                    >
                                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="rgba(255,255,255,0.6)" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Main Action Button */}
                        <TouchableOpacity
                            style={styles.mainButton}
                            onPress={isResetting ? handleResetPassword : handleAuth}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.accent, colors.accentLight]}
                                style={styles.mainButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.mainButtonText}>
                                        {isResetting ? 'Enviar Correo' : isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>


                        {/* Divider removed as requested */}

                        {/* Google Sign-In Button removed as requested */}


                        {/* Biometric Button */}
                        {biometricAvailable && !isResetting && !isRegistering && (
                            <TouchableOpacity
                                style={[styles.biometricButton, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}
                                onPress={handleBiometricLogin}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="finger-print-outline" size={20} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.biometricText}>Usar Biometría</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Bottom Actions */}
                <View style={styles.footer}>
                    {!isResetting && (
                        <TouchableOpacity
                            onPress={() => setIsRegistering(!isRegistering)}
                            disabled={loading}
                        >
                            <Text style={styles.footerLink}>
                                {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                <Text style={[styles.footerLinkBold, { color: colors.accentLight }]}>
                                    {isRegistering ? 'Inicia sesión' : 'Regístrate'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    )}

                    {!isRegistering && (
                        <TouchableOpacity
                            onPress={() => setIsResetting(!isResetting)}
                            disabled={loading}
                        >
                            <Text style={styles.footerLink}>
                                {isResetting ? 'Volver al ' : '¿Olvidaste tu contraseña? '}
                                <Text style={[styles.footerLinkBold, { color: colors.accentLight }]}>
                                    {isResetting ? 'inicio de sesión' : 'Recupérala'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    logo: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: '#FFFFFF',
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
    card: {
        borderRadius: borderRadius.xl,
        padding: 2,
        borderWidth: 1,
        ...shadows.lg,
    },
    cardInner: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // keep dark semi-transparent for contrast
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.label,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        height: 50,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
    },
    eyeButton: {
        padding: spacing.xs,
    },
    mainButton: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...shadows.md,
    },
    mainButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    mainButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        marginHorizontal: spacing.md,
        fontWeight: '500',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: borderRadius.md,
        paddingVertical: 14,
        marginBottom: spacing.md,
        ...shadows.sm,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    biometricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.md,
        paddingVertical: 14,
        borderWidth: 1,
    },
    biometricText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        marginTop: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    footerLink: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        textAlign: 'center',
    },
    footerLinkBold: {
        fontWeight: '700',
    },
});
