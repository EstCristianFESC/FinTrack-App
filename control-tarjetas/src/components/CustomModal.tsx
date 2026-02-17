import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface CustomModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'confirmation' | 'input';
    onClose: () => void;
    onConfirm?: (inputValue?: string) => void; // Support returning input value
    confirmText?: string;
    cancelText?: string;
    showInput?: boolean;
    inputPlaceholder?: string;
    secureTextEntry?: boolean;
}

export default function CustomModal({
    visible,
    title,
    message,
    type = 'info',
    onClose,
    onConfirm,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    showInput = false,
    inputPlaceholder = '',
    secureTextEntry = false
}: CustomModalProps) {
    const [inputValue, setInputValue] = React.useState('');

    // Reset input when visible changes
    React.useEffect(() => {
        if (visible) setInputValue('');
    }, [visible]);

    // Colors based on type
    const getColors = () => {
        switch (type) {
            case 'success': return ['#10B981', '#059669']; // Green
            case 'error': return ['#EF4444', '#B91C1C']; // Red
            case 'warning': return ['#F59E0B', '#D97706']; // Amber
            case 'confirmation': return ['#8B5CF6', '#7C3AED']; // Purple
            case 'input': return ['#3B82F6', '#2563EB']; // Blue for input
            case 'info':
            default: return ['#3B82F6', '#2563EB']; // Blue
        }
    };

    const gradientColors = getColors();

    const getIconName = (): keyof typeof Ionicons.glyphMap => {
        switch (type) {
            case 'success': return 'checkmark-circle-outline';
            case 'error': return 'alert-circle-outline';
            case 'warning': return 'warning-outline';
            case 'confirmation': return 'help-circle-outline';
            case 'input': return 'key-outline';
            case 'info': default: return 'information-circle-outline';
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header with Gradient */}
                    <LinearGradient
                        colors={gradientColors as any}
                        style={styles.header}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name={getIconName()} size={40} color="white" style={styles.icon} />
                        <Text style={styles.title}>{title}</Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.message}>{message}</Text>

                        {showInput && (
                            <TextInput
                                style={styles.input}
                                placeholder={inputPlaceholder}
                                value={inputValue}
                                onChangeText={setInputValue}
                                secureTextEntry={secureTextEntry}
                                placeholderTextColor="#9CA3AF"
                                autoFocus={visible} // Auto focus when opening
                            />
                        )}
                    </View>

                    {/* Footer / Actions */}
                    <View style={styles.footer}>
                        {(type === 'confirmation' || type === 'input' || type === 'warning') ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, { backgroundColor: gradientColors[0] }]}
                                    onPress={() => {
                                        if (onConfirm) onConfirm(inputValue);
                                        // Don't close automatically if input is required and empty? 
                                        // For now, let parent handle validation or close.
                                        // But usually we want to close. Let's close here.
                                        // Actually, for password input, we might want to keep it open on error...
                                        // But this is a generic component. Let's close it and let parent re-open or handle it.
                                        // Better: close it here.
                                        // Wait, parent might setVisible(false) manually.
                                        // If we allow parent to control visibility, we should just call onConfirm.
                                        // But standard behaviour is close.
                                    }}
                                >
                                    <Text style={styles.buttonText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: gradientColors[0] }]}
                                onPress={() => {
                                    if (onConfirm) onConfirm(inputValue);
                                    else onClose();
                                }}
                            >
                                <Text style={styles.buttonText}>Entendido</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        width: width - 60,
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: 'black',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    header: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    icon: {
        marginBottom: 10
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center'
    },
    content: {
        padding: 24,
        alignItems: 'center',
        width: '100%'
    },
    message: {
        fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 10
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        fontSize: 16,
        color: '#1F2937'
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        paddingTop: 0,
        justifyContent: 'center',
        gap: 12
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        elevation: 2,
        minWidth: 100,
        alignItems: 'center'
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    cancelButton: {
        backgroundColor: '#F3F4F6',
    },
    cancelButtonText: {
        color: '#4B5563',
        fontWeight: 'bold',
        fontSize: 16
    }
});
