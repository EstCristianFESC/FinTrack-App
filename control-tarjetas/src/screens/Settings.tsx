import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile, UserProfile } from '../database/userProfile';
import { deleteAllUserData } from '../database/resetData';
import { authenticateUser } from '../utils/authenticateUser';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { checkForOTAUpdate, fetchAndReloadUpdate } from '../utils/updateUtils';
import { syncUp } from '../firebase/sync';
import CreativeLoader from '../components/CreativeLoader';
import CustomModal from '../components/CustomModal';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface SettingsProps {
    onNavigate: (screen: string, params?: any) => void;
    onBack: () => void;
}

export default function Settings({ onNavigate, onBack }: SettingsProps) {
    const { colors, theme, toggleTheme } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [backupModalVisible, setBackupModalVisible] = useState(false);
    const user = auth.currentUser;

    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info' | 'warning' | 'confirmation',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        onConfirm: () => { }
    });

    const showModal = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'warning' | 'confirmation',
        onConfirm?: () => void,
        confirmText: string = 'Aceptar',
        cancelText: string = 'Cancelar'
    ) => {
        setModalConfig({
            title,
            message,
            type,
            onConfirm: onConfirm || (() => setModalVisible(false)),
            confirmText,
            cancelText
        });
        setModalVisible(true);
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        if (user) {
            const userProfile = await getUserProfile(user.uid);
            setProfile(userProfile);
        }
    };

    const handleLogout = () => {
        showModal(
            'Cerrar Sesión',
            '¿Estás seguro que deseas salir?',
            'confirmation',
            async () => {
                setModalVisible(false);
                await auth.signOut();
            },
            'Salir',
            'Cancelar'
        );
    };

    const checkForUpdates = async () => {
        setIsLoading(true);
        const result = await checkForOTAUpdate();
        setIsLoading(false);

        if (result.status === 'development') {
            showModal('Modo Desarrollo', 'Las actualizaciones OTA no funcionan en modo desarrollo.', 'info');
        } else if (result.status === 'uptodate') {
            showModal('Todo al día', 'Ya tienes la última versión disponible.', 'success');
        } else if (result.status === 'available') {
            showModal(
                'Actualización Disponible',
                '¿Quieres descargar e instalar la nueva versión? La app se reiniciará.',
                'confirmation',
                async () => {
                    try {
                        setModalVisible(false);
                        setIsLoading(true); // Show loader during fetch
                        await fetchAndReloadUpdate();
                    } catch (e) {
                        setIsLoading(false);
                        showModal('Error', 'Falló la actualización.', 'error');
                    }
                },
                'Actualizar',
                'Cancelar'
            );
        } else {
            const errorMessage = result.error instanceof Error ? result.error.message : JSON.stringify(result.error || 'Error desconocido');
            showModal('Error', `No se pudo verificar la actualización.\nDetalle: ${errorMessage}`, 'error');
        }
    };

    const confirmResetData = async () => {
        setResetModalVisible(false);
        const bioSuccess = await authenticateUser();

        if (bioSuccess) {
            proceedWithReset();
        } else {
            // Biometrics failed or cancelled, or not available. Show Password Modal.
            setTimeout(() => setPasswordModalVisible(true), 500);
        }
    };

    const verifyPassword = async (password?: string) => {
        setPasswordModalVisible(false); // Close first to avoid stacking issues logic

        if (!password) return;

        setIsLoading(true);
        try {
            if (user && user.email) {
                await signInWithEmailAndPassword(auth, user.email, password);
                // Success
                proceedWithReset();
            }
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Error', 'Contraseña incorrecta');
        }
    };

    const proceedWithReset = async () => {
        setIsLoading(true);
        try {
            if (user) {
                await deleteAllUserData(user.uid);
                await new Promise(resolve => setTimeout(resolve, 1000));
                setIsLoading(false);
                Alert.alert('Éxito', 'Todos los datos han sido eliminados.');
                onBack();
            }
        } catch (error: any) {
            setIsLoading(false);
            console.error(error);
            Alert.alert('Error', 'No se pudo eliminar los datos: ' + (error.message || error));
        }
    };

    const handleBackup = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            await syncUp(user.uid);
            setIsLoading(false);
            setBackupModalVisible(true);
        } catch (error) {
            setIsLoading(false);
            Alert.alert('Error', 'Falló el respaldo de datos. Verifica tu conexión.');
        }
    };

    const renderAvatar = () => {
        const photoUrl = user?.photoURL || profile?.photo_url;

        if (photoUrl) {
            return (
                <Image
                    source={{ uri: photoUrl }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                />
            );
        }

        return (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.primary }]}>
                <Ionicons name="person" size={24} color={colors.primary} />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <CreativeLoader visible={isLoading} />

            <CustomModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => setModalVisible(false)}
                onConfirm={modalConfig.onConfirm}
                confirmText={modalConfig.confirmText}
                cancelText={modalConfig.cancelText}
            />

            <CustomModal
                visible={resetModalVisible}
                type="warning"
                title="BORRADO GENERAL"
                message="Esta acción eliminará PERMANENTEMENTE todos los datos de la aplicación (tarjetas, movimientos, usuarios, configuraciones) tanto del dispositivo como de la nube. La aplicación quedará como recién instalada. ¿Estás absolutamente seguro de continuar?"
                confirmText="SÍ, BORRAR TODO"
                cancelText="Cancelar"
                onClose={() => setResetModalVisible(false)}
                onConfirm={confirmResetData}
            />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Configuración</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PERFIL</Text>

                    <TouchableOpacity
                        style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={() => onNavigate('UserProfile')}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatarContainer}>
                            {renderAvatar()}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.profileName, { color: colors.text }]}>
                                {profile?.display_name || 'Sin nombre'}
                            </Text>
                            <Text style={[styles.profileEmail, { color: colors.textMuted }]}>
                                {user?.email || 'Sin email'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>

                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>APARIENCIA</Text>

                    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <View style={styles.row}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={theme === 'dark' ? "moon-outline" : "sunny-outline"} size={22} color={colors.text} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: colors.text }]}>Tema</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                                    {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.toggle, { backgroundColor: theme === 'dark' ? colors.primary : colors.border }]}
                                onPress={toggleTheme}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.toggleThumb, {
                                    backgroundColor: colors.cardBg,
                                    transform: [{ translateX: theme === 'dark' ? 20 : 0 }]
                                }]} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Security Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SEGURIDAD</Text>

                    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => onNavigate('ChangePassword')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="lock-closed-outline" size={22} color={colors.text} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: colors.text }]}>Cambiar Contraseña</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                                    Actualiza tu contraseña
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CUENTA</Text>

                    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={checkForUpdates}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: colors.primary }]}>Buscar Actualizaciones</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                                    Versión {Constants.expoConfig?.version ?? '1.0.0'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity
                            style={styles.row}
                            onPress={handleLogout}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="log-out-outline" size={22} color={colors.error} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: colors.error }]}>Cerrar Sesión</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity
                            style={styles.row}
                            onPress={handleBackup}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="cloud-upload-outline" size={22} color={colors.success || '#4CAF50'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: colors.success || '#4CAF50' }]}>Respaldar Datos</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                                    Subir datos locales a la nube
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => setResetModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.iconContainer}>
                                <Ionicons name="trash-outline" size={22} color={colors.error} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, { color: colors.error }]}>Reiniciar Aplicación</Text>
                                <Text style={[styles.itemSubtitle, { color: colors.textMuted }]}>
                                    Eliminar todos los datos
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <CustomModal
                visible={passwordModalVisible}
                type="input"
                title="🔐 Autenticación"
                message="Ingresa tu contraseña para continuar"
                confirmText="Verificar"
                cancelText="Cancelar"
                showInput={true}
                inputPlaceholder="Contraseña actual"
                secureTextEntry={true}
                onClose={() => setPasswordModalVisible(false)}
                onConfirm={verifyPassword}
            />

            <CustomModal
                visible={backupModalVisible}
                type="success"
                title="Respaldo Exitoso"
                message="Tus datos han sido subidos a la nube correctamente."
                onClose={() => setBackupModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 10, // Reduced from 40
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        marginRight: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: 44,
        height: 44
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    profileName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: 13,
    },
    toggle: {
        width: 50,
        height: 30,
        borderRadius: 15,
        padding: 2,
        justifyContent: 'center',
    },
    toggleThumb: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
});
