import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme/designTokens';

interface ChangePasswordProps {
    onBack: () => void;
}

export default function ChangePassword({ onBack }: ChangePasswordProps) {
    const { colors } = useTheme();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChangePassword = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            Alert.alert('Error', 'No hay usuario autenticado');
            return;
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            // Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update password
            await updatePassword(user, newPassword);

            Alert.alert('Éxito', 'Contraseña actualizada correctamente');
            onBack();
        } catch (error: any) {
            let msg = error.message;
            if (msg.includes('auth/wrong-password')) msg = 'Contraseña actual incorrecta';
            else if (msg.includes('auth/weak-password')) msg = 'La contraseña es muy débil';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.backText, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Cambiar Contraseña</Text>
            </View>

            <View style={styles.form}>
                {/* Current Password */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>CONTRASEÑA ACTUAL</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry={!showCurrent}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowCurrent(!showCurrent)}
                        >
                            <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>NUEVA CONTRASEÑA</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showNew}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowNew(!showNew)}
                        >
                            <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.hint, { color: colors.textMuted }]}>
                        Mínimo 6 caracteres
                    </Text>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>CONFIRMAR CONTRASEÑA</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textMuted}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirm}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowConfirm(!showConfirm)}
                        >
                            <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleChangePassword}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>
                        {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        // marginTop: 40, // Removed to match Dashboard
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        marginRight: 16,
        borderWidth: 1,
    },
    backText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    form: {
        marginTop: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    passwordContainer: {
        position: 'relative',
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        padding: 4,
    },
    eyeIcon: {
        fontSize: 20,
    },
    hint: {
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
    },
    saveButton: {
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
