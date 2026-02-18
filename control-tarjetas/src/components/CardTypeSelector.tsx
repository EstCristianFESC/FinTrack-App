import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CARD_TYPES, CardType } from '../utils/cardTypes';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius } from '../theme/designTokens';

interface CardTypeSelectorProps {
    selectedType: CardType;
    onSelect: (type: CardType) => void;
}

const CardTypeSelector = ({ selectedType, onSelect }: CardTypeSelectorProps) => {
    const { colors } = useTheme();

    return (
        <View style={styles.cardTypeContainer}>
            {CARD_TYPES.map((type) => {
                const isSelected = selectedType === type.value;
                return (
                    <TouchableOpacity
                        key={type.value}
                        style={[
                            styles.cardTypeButton,
                            {
                                backgroundColor: isSelected ? colors.primary : colors.cardBg,
                                borderColor: isSelected ? colors.primary : colors.border,
                            }
                        ]}
                        onPress={() => onSelect(type.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.cardLabel,
                            { color: isSelected ? 'white' : colors.text }
                        ]}>
                            {type.label}
                        </Text>

                        {isSelected && (
                            <View style={styles.checkBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    cardTypeContainer: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    cardTypeButton: {
        width: '47%',
        height: 50,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
    },
    cardLabel: {
        fontWeight: '600',
        fontSize: 16
    },
    checkBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
    }
});

export default memo(CardTypeSelector);
