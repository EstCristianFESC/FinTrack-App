import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Image } from 'react-native';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase/firebaseConfig';
import { updateProfile } from 'firebase/auth';
import { getUserProfile, updateUserProfile, createOrUpdateUserProfile } from '../database/userProfile';
import CustomModal from '../components/CustomModal';
import { spacing } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface UserProfileProps {
    onBack: () => void;
}

export default function UserProfile({ onBack }: UserProfileProps) {
    const { colors } = useTheme();
    const user = auth.currentUser;
    const [displayName, setDisplayName] = useState('');
    const [phone, setPhone] = useState('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info' | 'warning',
        onConfirm: undefined as undefined | (() => void)
    });

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onConfirm?: () => void) => {
        setModalConfig({ title, message, type, onConfirm });
        setModalVisible(true);
    };

    useEffect(() => {
        loadProfile();
    }, []);

    const pickImage = async () => {
        Alert.alert(
            'Cambiar Foto',
            '¿De dónde quieres obtener la foto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Cámara',
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            showModal('Permiso denegado', 'Necesitamos acceso a la cámara.', 'warning');
                            return;
                        }
                        const result = await ImagePicker.launchCameraAsync({
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.5,
                            base64: true,
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
                            showModal('Permiso denegado', 'Necesitamos permiso para acceder a tus fotos.', 'warning');
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.5,
                            base64: true,
                        });
                        if (!result.canceled) {
                            setPhotoUrl(result.assets[0].uri);
                        }
                    }
                }
            ]
        );
    };

    const loadProfile = async () => {
        if (user) {
            const profile = await getUserProfile(user.uid);
            if (profile) {
                setDisplayName(profile.display_name || '');
                setPhone(profile.phone || '');
                setPhotoUrl(profile.photo_url || null);
            }
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Update Firebase Auth Profile as well
            await updateProfile(user, {
                displayName: displayName,
                photoURL: photoUrl
            });

            await createOrUpdateUserProfile({
                firebase_uid: user.uid,
                display_name: displayName,
                email: user.email || '',
                phone: phone,
                // Note: photo_url from ImagePicker is a local file URI (cache).
                // It will only work on this device until cache is cleared.
                // Ideally, upload to Firebase Storage to get a permanent URL.
                // For now, we save it as is to support local personalization.
                photo_url: photoUrl || undefined,
            });
            console.log('✅ Profile saved with photo:', photoUrl);
            showModal('Éxito', 'Perfil actualizado correctamente', 'success', onBack);
        } catch (error) {
            showModal('Error', 'No se pudo actualizar el perfil', 'error');
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
                <Text style={[styles.title, { color: colors.text }]}>Editar Perfil</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                        {photoUrl ? (
                            <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: colors.cardBg, borderWidth: 2, borderColor: colors.primary }]}>
                                <Ionicons name="person" size={50} color={colors.primary} />
                            </View>
                        )}
                        <View style={[styles.editBadge, { backgroundColor: colors.accent }]}>
                            <Ionicons name="pencil" size={16} color="white" />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.avatarHint, { color: colors.textMuted }]}>
                        Toca para cambiar foto
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>NOMBRE</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="Tu nombre"
                            placeholderTextColor={colors.textMuted}
                            value={displayName}
                            onChangeText={setDisplayName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>EMAIL</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textMuted, borderColor: colors.border }]}
                            value={user?.email || ''}
                            editable={false}
                        />
                        <Text style={[styles.hint, { color: colors.textMuted }]}>
                            El email no se puede cambiar
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>TELÉFONO</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.cardBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="+57 300 123 4567"
                            placeholderTextColor={colors.textMuted}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <Text style={styles.saveButtonText}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            <CustomModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => setModalVisible(false)}
                onConfirm={modalConfig.onConfirm}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: spacing.lg, // Match Dashboard
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        // marginTop: 40,
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
    avatarSection: {
        alignItems: 'center',
        marginVertical: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    avatarText: {
        color: 'white',
        fontSize: 40,
        fontWeight: 'bold',
    },
    avatarHint: {
        fontSize: 13,
    },
    form: {
        marginBottom: 24,
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
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
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
        marginTop: 8,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
