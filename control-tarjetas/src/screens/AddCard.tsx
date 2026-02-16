import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { createCard } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { CARD_TYPES, CardType } from '../utils/cardTypes';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';

interface AddCardProps {
    onNavigate: (screen: string) => void;
    onBack: () => void;
}

export default function AddCard({ onNavigate, onBack }: AddCardProps) {
    const { colors, theme } = useTheme();
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [cardType, setCardType] = useState<CardType>('visa');
    const [creditLimit, setCreditLimit] = useState('');
    const [cutDay, setCutDay] = useState('');
    const [payDay, setPayDay] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [lastFourDigits, setLastFourDigits] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    const handleExpiryDateChange = (text: string) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');

        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
        }

        setExpiryDate(formatted);
    };

    const validateDay = (day: string) => {
        const num = parseInt(day);
        return !isNaN(num) && num >= 1 && num <= 31;
    };

    const handleSave = async () => {
        if (!name || !bank || !creditLimit || !cutDay || !payDay || !interestRate) {
            Alert.alert('Error', 'Por favor completa los campos principales');
            return;
        }

        if (!validateDay(cutDay) || !validateDay(payDay)) {
            Alert.alert('Error', 'El día de corte y pago debe ser entre 1 y 31');
            return;
        }

        if (expiryDate.length > 0 && expiryDate.length < 5) {
            Alert.alert('Error', 'Fecha de vencimiento incompleta (MM/YY)');
            return;
        }

        try {
            await createCard(
                name,
                bank,
                parseFloat(creditLimit),
                parseInt(cutDay),
                parseInt(payDay),
                parseFloat(interestRate),
                lastFourDigits,
                expiryDate,
                cardType
            );
            Alert.alert('Éxito', 'Tarjeta agregada correctamente');
            onBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo guardar la tarjeta');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Nueva Tarjeta</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Nombre de la Tarjeta</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="Ej. Visa Gold"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Banco</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="Ej. Bancolombia"
                    placeholderTextColor={colors.textMuted}
                    value={bank}
                    onChangeText={setBank}
                />

                {/* Card Type Selector */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Tipo de Tarjeta</Text>
                <View style={styles.cardTypeContainer}>
                    {CARD_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.value}
                            style={[
                                styles.cardTypeButton,
                                {
                                    backgroundColor: cardType === type.value ? colors.primary : colors.cardBg,
                                    borderColor: cardType === type.value ? colors.primary : colors.border,
                                }
                            ]}
                            onPress={() => setCardType(type.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.cardTypeLabel,
                                { color: cardType === type.value ? 'white' : colors.text }
                            ]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Últimos 4 Dígitos</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="1234"
                            placeholderTextColor={colors.textMuted}
                            value={lastFourDigits}
                            onChangeText={setLastFourDigits}
                            keyboardType="numeric"
                            maxLength={4}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Vencimiento</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="MM/YY"
                            placeholderTextColor={colors.textMuted}
                            value={expiryDate}
                            onChangeText={handleExpiryDateChange}
                            maxLength={5}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Cupo Total</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                    keyboardType="numeric"
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Corte</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                            value={cutDay}
                            onChangeText={setCutDay}
                            keyboardType="numeric"
                            maxLength={2}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Pago</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                            value={payDay}
                            onChangeText={setPayDay}
                            keyboardType="numeric"
                            maxLength={2}
                        />
                    </View>
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Tasa Efectiva Anual (% E.A.)</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="numeric"
                />

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Guardar Tarjeta</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg, // Match Dashboard
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        // marginTop: spacing.lg, // Removed
        paddingVertical: spacing.md
    },
    backButton: {
        padding: 8,
        borderRadius: borderRadius.md,
        marginRight: spacing.md,
        borderWidth: 1,
    },
    title: {
        ...typography.h2,
    },
    form: {
        paddingBottom: spacing.xl
    },
    label: {
        ...typography.label,
        marginBottom: spacing.xs,
        marginTop: spacing.md
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16
    },
    cardTypeContainer: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,

        marginTop: spacing.sm,
        marginBottom: 60, // Increased to provide more space as requested
    },

    cardTypeButton: {
        flex: 1,
        minWidth: '48%',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTypeLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md
    },
    halfInput: {
        flex: 1,
    },
    saveButton: {
        padding: 18,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xxl,
        ...shadows.md
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
