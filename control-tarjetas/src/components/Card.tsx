import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { shadows } from '../theme/designTokens';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    shadowSize?: 'sm' | 'md' | 'lg';
}

export default function Card({ children, style, shadowSize = 'md' }: CardProps) {
    return (
        <View style={[styles.card, shadows[shadowSize], style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
    },
});
