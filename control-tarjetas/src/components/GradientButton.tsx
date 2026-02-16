import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, shadows } from '../theme/designTokens';

interface GradientButtonProps {
    title: string;
    onPress: () => void;
    gradient?: string[];
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    size?: 'sm' | 'md' | 'lg';
}

export default function GradientButton({
    title,
    onPress,
    gradient = colors.gradientPurple,
    disabled = false,
    loading = false,
    style,
    textStyle,
    size = 'md',
}: GradientButtonProps) {
    const sizeStyles = {
        sm: { paddingVertical: 12, fontSize: 14 },
        md: { paddingVertical: 16, fontSize: 16 },
        lg: { paddingVertical: 20, fontSize: 18 },
    };

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                    styles.gradient,
                    { paddingVertical: sizeStyles[size].paddingVertical },
                    disabled && styles.disabled,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text
                        style={[
                            styles.text,
                            { fontSize: sizeStyles[size].fontSize },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: borderRadius.md,
        overflow: 'hidden',
        ...shadows.colored.purple,
    },
    gradient: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: 'white',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    disabled: {
        opacity: 0.5,
    },
});
