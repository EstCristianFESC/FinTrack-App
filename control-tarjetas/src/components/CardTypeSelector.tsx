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

    const renderCardLogo = (type: string, isSelected: boolean) => {
        const t = type.toLowerCase();

        if (t === 'visa') {
            return <Text style={[styles.visaText, { color: isSelected ? 'white' : '#1A1F71' }]}>VISA</Text>;
        }
        if (t === 'mastercard') {
            return (
                <View style={styles.mcContainer}>
                    <View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
                    <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', right: 0 }]} />
                </View>
            );
        }
        if (t === 'amex') {
            return (
                <View style={[styles.amexContainer, { backgroundColor: isSelected ? 'white' : '#2E77BC' }]}>
                    <Text style={[styles.amexText, { color: isSelected ? '#2E77BC' : 'white' }]}>AMERICAN EXPRESS</Text>
                </View>
            );
        }
        if (t === 'diners') {
            return (
                <View style={{ alignItems: 'flex-start' }}>
                    <Text style={[styles.dinersText, { color: isSelected ? 'white' : '#0079BE', fontSize: 12 }]}>Diners Club</Text>
                    <Text style={[styles.dinersText, { color: isSelected ? 'rgba(255,255,255,0.7)' : '#0079BE', fontSize: 7 }]}>INTERNATIONAL</Text>
                </View>
            );
        }
        return <Text>💳</Text>;
    };

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
                                transform: [{ scale: isSelected ? 1.05 : 1 }]
                            }
                        ]}
                        onPress={() => onSelect(type.value)}
                        activeOpacity={0.7}
                    >
                        {renderCardLogo(type.value, isSelected)}
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
        height: 60,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
    },
    checkBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    // Logo Styles
    visaText: {
        fontWeight: '900',
        fontSize: 24,
        fontStyle: 'italic',
        letterSpacing: -1
    },
    mcContainer: {
        width: 44,
        height: 30,
        position: 'relative',
        transform: [{ scale: 1.2 }]
    },
    mcCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        position: 'absolute',
        opacity: 0.9,
    },
    amexContainer: {
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    amexText: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    dinersText: {
        fontWeight: 'bold',
        letterSpacing: 0.5
    }
});

export default memo(CardTypeSelector);
