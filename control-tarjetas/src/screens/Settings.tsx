import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile, UserProfile } from '../database/userProfile';
import { deleteAllUserData } from '../database/resetData';
import { authenticateUser } from '../utils/authenticateUser';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';

interface SettingsProps {
    onNavigate: (screen: string, params?: any) => void;
    onBack: () => void;
}

export default function Settings({ onNavigate, onBack }: SettingsProps) {
    const { colors, theme, toggleTheme } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const user = auth.currentUser;

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
        Alert.alert(
            'Cerrar Sesión',
            '¿Estás seguro que deseas salir?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: async () => {
                        await auth.signOut();
                    }
                }
            ]
        );
    };

    const checkForUpdates = async () => {
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                Alert.alert(
                    'Actualización Disponible',
                    'Hay una nueva versión de la aplicación. ¿Deseas descargarla e instalarla ahora?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Actualizar',
                            onPress: async () => {
                                await Updates.fetchUpdateAsync();
                                await Updates.reloadAsync();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Todo al día', 'Ya tienes la última versión instalada.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo verificar actualizaciones: ' + error);
        }
    };

    const handleResetAllData = async () => {
        Alert.alert(
            '⚠️ Reiniciar Aplicación',
            'Esto eliminará TODOS tus datos: tarjetas, transacciones y perfil. Esta acción NO se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar Todo',
                    style: 'destructive',
                    onPress: async () => {
                        const authenticated = await authenticateUser();
                        if (authenticated && user) {
                            try {
                                await deleteAllUserData(user.uid);
                                Alert.alert('Éxito', 'Todos los datos han sido eliminados');
                                onBack();
                            } catch (error) {
                                Alert.alert('Error', 'No se pudo eliminar los datos');
                            }
                        } else {
                            Alert.alert('Cancelado', 'Autenticación fallida');
                        }
                    }
                }
            ]
        );
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
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                    {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                                    Versión {Updates.runtimeVersion ?? '1.0.0'}
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
                            onPress={handleResetAllData}
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
