import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Animated, ScrollView, Image, ActionSheetIOS, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { authenticateWithBiometrics, isBiometricSupported, isBiometricEnrolled, getBiometricType } from '../utils/biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { createOrUpdateUserProfile } from '../database/userProfile';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const { colors, theme } = useTheme();
    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Registration State
    const [isRegistering, setIsRegistering] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    const [isResetting, setIsResetting] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('Biometría');
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
        const type = await getBiometricType();
        setBiometricAvailable(supported && enrolled);
        if (type === 'FaceID') setBiometricType('Face ID');
        else if (type === 'TouchID') setBiometricType('Huella');
    };

    const pickImage = async () => {
        Alert.alert(
            'Seleccionar Foto',
            '¿De dónde quieres obtener la foto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cámara',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara.');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.5,
                            base64: true, // Optional if we want to upload base64 later
                        });
                        if (!result.canceled) {
                            setPhotoUrl(result.assets[0].uri);
                        }
                    }
                },
                {
                    text: 'Galería',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert('Permiso denegado', 'Se requiere acceso a la galería.');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.5,
                        });
                        if (!result.canceled) {
                            setPhotoUrl(result.assets[0].uri);
                        }
                    }
                }
            ]
        );
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
            else if (msg.includes('auth/user-not-found')) msg = 'Usuario no registrado';
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

        if (isRegistering && !name) {
            Alert.alert('Error', 'El nombre es obligatorio');
            return;
        }

        setLoading(true);
        try {
            if (isRegistering) {
                // REGISTRO
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Actualizar perfil de Firebase (Auth)
                await updateProfile(user, {
                    displayName: name,
                    photoURL: photoUrl
                });

                // Guardar perfil extendido en DB local/remota
                await createOrUpdateUserProfile({
                    firebase_uid: user.uid,
                    display_name: name,
                    email: user.email || email,
                    phone: phone,
                    photo_url: photoUrl || undefined
                });

                Alert.alert('Bienvenido', 'Cuenta creada exitosamente');
                // Auto login happens automatically with Firebase

                // Save credentials for biometrics immediately after register?
                await AsyncStorage.setItem('saved_email', email);
                await AsyncStorage.setItem('saved_password', password);

            } else {
                // LOGIN
                await signInWithEmailAndPassword(auth, email, password);
                await AsyncStorage.setItem('saved_email', email);
                await AsyncStorage.setItem('saved_password', password);
            }
        } catch (error: any) {
            let msg = error.message;
            // Personalizar mensajes de error
            if (msg.includes('auth/invalid-email')) msg = 'Email inválido';
            else if (msg.includes('auth/user-not-found') || msg.includes('auth/invalid-credential')) {
                msg = 'Usuario no encontrado o contraseña incorrecta. Verifique sus datos o regístrese.';
            }
            else if (msg.includes('auth/wrong-password')) msg = 'Contraseña incorrecta';
            else if (msg.includes('auth/email-already-in-use')) msg = 'Este email ya está registrado. Intente iniciar sesión.';
            else if (msg.includes('auth/weak-password')) msg = 'La contraseña debe tener al menos 6 caracteres';

            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    // Google Sign-In Request (Placeholder logic maintained)
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: '616503263288-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',
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
                    // Check if profile exists, if not create default?
                    // For now, allow default flow
                    Alert.alert('Éxito', `Bienvenido ${userCredential.user.displayName || 'Usuario'}`);
                })
                .catch((error) => {
                    Alert.alert('Error', 'Fallo al iniciar sesión con Google: ' + error.message);
                })
                .finally(() => setLoading(false));
        }
    }, [response]);


    return (
        <LinearGradient
            colors={['#0A2540', '#133154']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                    {/* Logo/Title Section */}
                    <View style={[styles.header, isRegistering && { marginTop: 40 }]}>
                        <Text style={styles.logo}>💳</Text>
                        <Text style={styles.title}>FinTrack</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            {isResetting ? 'Recuperar Contraseña' : isRegistering ? 'Crear Nueva Cuenta' : 'Bienvenido de nuevo'}
                        </Text>
                    </View>

                    {/* Form Card */}
                    <View style={[styles.card, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                        <View style={styles.cardInner}>

                            {/* REGISTRATION FIELDS */}
                            {isRegistering && (
                                <>
                                    {/* Photo Picker */}
                                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                        <TouchableOpacity onPress={pickImage} style={styles.photoAvatar}>
                                            {photoUrl ? (
                                                <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                                            ) : (
                                                <View style={styles.avatarPlaceholder}>
                                                    <Ionicons name="camera-outline" size={32} color="white" />
                                                    <Text style={styles.avatarText}>Foto</Text>
                                                </View>
                                            )}
                                            <View style={styles.editIconContainer}>
                                                <Ionicons name="pencil" size={12} color="white" />
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Name Input */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>NOMBRE COMPLETO *</Text>
                                        <View style={[styles.inputContainer, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Tu nombre"
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={name}
                                                onChangeText={setName}
                                                autoCapitalize="words"
                                                editable={!loading}
                                            />
                                        </View>
                                    </View>

                                    {/* Phone Input */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>TELÉFONO (Opcional)</Text>
                                        <View style={[styles.inputContainer, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                            <Ionicons name="call-outline" size={20} color="rgba(255,255,255,0.6)" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="+57 300..."
                                                placeholderTextColor="rgba(255,255,255,0.4)"
                                                value={phone}
                                                onChangeText={setPhone}
                                                keyboardType="phone-pad"
                                                editable={!loading}
                                            />
                                        </View>
                                    </View>
                                </>
                            )}


                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>EMAIL {isRegistering && '*'}</Text>
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
                                    <Text style={styles.label}>CONTRASEÑA {isRegistering && '*'}</Text>
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
                                            {isResetting ? 'Enviar Correo' : isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Biometric Button */}
                            {biometricAvailable && !isResetting && !isRegistering && (
                                <TouchableOpacity
                                    style={[styles.biometricButton, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}
                                    onPress={handleBiometricLogin}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={biometricType === 'Face ID' ? "scan-outline" : "finger-print-outline"} size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.biometricText}>Ingresar con {biometricType}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Bottom Actions */}
                    <View style={styles.footer}>
                        {!isResetting && (
                            <TouchableOpacity
                                onPress={() => {
                                    setIsRegistering(!isRegistering);
                                    // Clear fields when switching
                                    if (!isRegistering) {
                                        // Entering registration mode
                                        setName('');
                                        setPhone('');
                                        setPhotoUrl(null);
                                    }
                                }}
                                disabled={loading}
                            >
                                <Text style={styles.footerLink}>
                                    {isRegistering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                                    <Text style={[styles.footerLinkBold, { color: colors.accentLight }]}>
                                        {isRegistering ? 'Inicia sesión' : 'Regístrate ahora'}
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
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
        marginTop: spacing.xxl,
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
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    biometricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: borderRadius.md,
        paddingVertical: 14,
        borderWidth: 1,
        marginTop: spacing.md,
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
        paddingBottom: spacing.xl,
    },
    footerLink: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        textAlign: 'center',
    },
    footerLinkBold: {
        fontWeight: '700',
    },
    photoAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden'
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        alignItems: 'center',
    },
    avatarText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 4,
    },
    editIconContainer: {
        position: 'absolute',
        bottom: 8,
        right: 8, // Center loosely
        backgroundColor: '#4AA9FF',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
