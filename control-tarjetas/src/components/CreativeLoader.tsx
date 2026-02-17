import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, borderRadius, spacing, shadows } from '../theme/designTokens';

interface CreativeLoaderProps {
    visible: boolean;
    messages?: string[];
}

const DEFAULT_MESSAGES = [
    "Contando las monedas...",
    "Acomodando los billetes...",
    "El sistema carga bonito...",
    "Verificando con el banco...",
    "Afinando motores...",
    "Organizando tus finanzas...",
    "Calculando intereses (ojalá sean pocos)...",
    "Conectando con la nube financiera..."
];

export default function CreativeLoader({ visible, messages = DEFAULT_MESSAGES }: CreativeLoaderProps) {
    const { colors } = useTheme();
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            // Reset and start animation
            setCurrentMessageIndex(0);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Rotate messages every 2 seconds
            const interval = setInterval(() => {
                setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
            }, 2000);

            return () => clearInterval(interval);
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.container,
                    {
                        backgroundColor: colors.cardBg,
                        borderColor: colors.border,
                        opacity: fadeAnim,
                        transform: [{
                            scale: fadeAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1]
                            })
                        }]
                    }
                ]}>
                    <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
                    <Text style={[styles.message, { color: colors.text }]}>
                        {messages[currentMessageIndex]}
                    </Text>
                </Animated.View>
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
    },
    container: {
        width: '80%',
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        alignItems: 'center',
        ...shadows.lg,
    },
    spinner: {
        marginBottom: spacing.lg,
        transform: [{ scale: 1.2 }]
    },
    message: {
        ...typography.h3,
        textAlign: 'center',
        fontWeight: '600',
    }
});
