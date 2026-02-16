import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface CustomModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'confirmation';
    onClose: () => void;
    onConfirm?: () => void; // For confirmation type
    confirmText?: string;
    cancelText?: string;
}

export default function CustomModal({
    visible,
    title,
    message,
    type = 'info',
    onClose,
    onConfirm,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar'
}: CustomModalProps) {

    // Colors based on type
    const getColors = () => {
        switch (type) {
            case 'success': return ['#10B981', '#059669']; // Green
            case 'error': return ['#EF4444', '#B91C1C']; // Red
            case 'warning': return ['#F59E0B', '#D97706']; // Amber
            case 'confirmation': return ['#8B5CF6', '#7C3AED']; // Purple
            case 'info':
            default: return ['#3B82F6', '#2563EB']; // Blue
        }
    };

    const gradientColors = getColors();

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'confirmation': return '❓';
            case 'info': default: return 'ℹ️';
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
                        <Text style={styles.icon}>{getIcon()}</Text>
                        <Text style={styles.title}>{title}</Text>
                    </LinearGradient>

                    {/* Content */}
                    <View style={styles.content}>
                        <Text style={styles.message}>{message}</Text>
                    </View>

                    {/* Footer / Actions */}
                    <View style={styles.footer}>
                        {type === 'confirmation' ? (
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
                                        if (onConfirm) onConfirm();
                                        onClose();
                                    }}
                                >
                                    <Text style={styles.buttonText}>{confirmText}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: gradientColors[0] }]}
                                onPress={onClose}
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
        fontSize: 40,
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
        alignItems: 'center'
    },
    message: {
        fontSize: 16,
        color: '#374151',
        textAlign: 'center',
        lineHeight: 24
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
