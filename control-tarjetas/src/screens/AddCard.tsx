import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { createCard } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { CARD_TYPES, CardType } from '../utils/cardTypes';
import { spacing, borderRadius, shadows, typography, colors as tokens } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatNumberInput, parseCurrencyInput } from '../utils/formatters';
import CustomModal from '../components/CustomModal';
import CardTypeSelector from '../components/CardTypeSelector';

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

    // Refs for Auto-Focus
    const bankRef = useRef<TextInput>(null);
    const last4Ref = useRef<TextInput>(null);
    const expiryRef = useRef<TextInput>(null);
    const quotaRef = useRef<TextInput>(null);
    const cutRef = useRef<TextInput>(null);
    const payRef = useRef<TextInput>(null);
    const interestRef = useRef<TextInput>(null);

    const handleExpiryDateChange = (text: string) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');

        // Validation: Month <= 12
        if (cleaned.length >= 2) {
            const month = parseInt(cleaned.substring(0, 2));
            if (month > 12 || month === 0) {
                // Invalid month, ignore input or clamp? Ignoring is safer for UX flow or user realizes mistake.
                // If we return, the input won't update, creating a "stuck" feeling. 
                // Better to strict validate only valid months.
                return;
            }
        }

        let formatted = cleaned;
        if (cleaned.length > 2) {
            formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
        }

        setExpiryDate(formatted);

        // Auto-advance if full
        if (formatted.length === 5) {
            quotaRef.current?.focus();
        }
    };

    const handleDayChange = (text: string, setter: (val: string) => void, nextRef?: React.RefObject<TextInput | null>) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned) {
            const num = parseInt(cleaned);
            if (num > 31) return; // Prevent > 31
        }
        setter(cleaned);
        if (cleaned.length === 2 && nextRef) {
            nextRef.current?.focus();
        }
    };

    const handleCurrencyChange = (text: string) => {
        const formatted = formatNumberInput(text);
        setCreditLimit(formatted);
    };

    const validateDay = (day: string) => {
        const num = parseInt(day);
        return !isNaN(num) && num >= 1 && num <= 31;
    };

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info' | 'warning',
        confirmText: 'Aceptar',
        onConfirm: () => { }
    });

    const showModal = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'warning',
        onConfirm?: () => void,
        confirmText: string = 'Aceptar'
    ) => {
        setModalConfig({
            title,
            message,
            type,
            onConfirm: onConfirm || (() => setModalVisible(false)),
            confirmText
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name || !bank || !creditLimit || !cutDay || !payDay || !interestRate) {
            showModal('Faltan Datos', 'Por favor completa todos los campos obligatorios para crear tu tarjeta.', 'warning');
            return;
        }

        if (!validateDay(cutDay) || !validateDay(payDay)) {
            showModal('Fechas Inválidas', 'El día de corte y pago debe ser un número entre 1 y 31.', 'warning');
            return;
        }

        if (expiryDate.length > 0 && expiryDate.length < 5) {
            showModal('Fecha Incompleta', 'La fecha de vencimiento debe tener el formato MM/YY.', 'warning');
            return;
        }

        try {
            const limitValue = parseCurrencyInput(creditLimit);

            await createCard(
                name,
                bank,
                limitValue,
                parseInt(cutDay),
                parseInt(payDay),
                parseFloat(interestRate),
                lastFourDigits,
                expiryDate,
                cardType
            );
            showModal('¡Tarjeta Creada!', 'Tu nueva tarjeta ha sido agregada exitosamente.', 'success', () => {
                setModalVisible(false);
                onBack();
            });
        } catch (error) {
            console.error(error);
            showModal('Error', 'No se pudo guardar la tarjeta. Intenta nuevamente.', 'error');
        }
    };



    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Nueva Tarjeta</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

                {/* Franchise Selector */}
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Franquicia</Text>
                <CardTypeSelector selectedType={cardType} onSelect={setCardType} />

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Nombre de la Tarjeta</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="Ej. Visa Gold"
                        placeholderTextColor={colors.textMuted}
                        value={name}
                        onChangeText={setName}
                        returnKeyType="next"
                        onSubmitEditing={() => bankRef.current?.focus()}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Banco</Text>
                    <TextInput
                        ref={bankRef}
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="Ej. Bancolombia"
                        placeholderTextColor={colors.textMuted}
                        value={bank}
                        onChangeText={setBank}
                        returnKeyType="next"
                        onSubmitEditing={() => last4Ref.current?.focus()}
                    />
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Últimos 4 Dígitos</Text>
                        <TextInput
                            ref={last4Ref}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="1234"
                            placeholderTextColor={colors.textMuted}
                            value={lastFourDigits}
                            onChangeText={(text) => {
                                setLastFourDigits(text);
                                if (text.length === 4) expiryRef.current?.focus();
                            }}
                            keyboardType="numeric"
                            maxLength={4}
                            returnKeyType="next"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Vencimiento</Text>
                        <TextInput
                            ref={expiryRef}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="MM/YY"
                            placeholderTextColor={colors.textMuted}
                            value={expiryDate}
                            onChangeText={handleExpiryDateChange}
                            maxLength={5}
                            keyboardType="numeric"
                            returnKeyType="next"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Cupo Total</Text>
                    <TextInput
                        ref={quotaRef}
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="$ 0"
                        placeholderTextColor={colors.textMuted}
                        value={creditLimit}
                        onChangeText={handleCurrencyChange}
                        keyboardType="numeric"
                        returnKeyType="next"
                        onSubmitEditing={() => cutRef.current?.focus()}
                    />
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día de Corte</Text>
                        <TextInput
                            ref={cutRef}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                            value={cutDay}
                            onChangeText={(text) => handleDayChange(text, setCutDay, payRef)}
                            keyboardType="numeric"
                            maxLength={2}
                            returnKeyType="next"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Límite Pago</Text>
                        <TextInput
                            ref={payRef}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                            value={payDay}
                            onChangeText={(text) => handleDayChange(text, setPayDay, interestRef)}
                            keyboardType="numeric"
                            maxLength={2}
                            returnKeyType="next"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Tasa Efectiva Anual (% E.A.)</Text>
                    <TextInput
                        ref={interestRef}
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        value={interestRate}
                        onChangeText={setInterestRate}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={handleSave}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                    onPress={handleSave}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[colors.primary, tokens.primaryDark]}
                        style={styles.gradientButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.saveButtonText}>Guardar Tarjeta</Text>
                        <Ionicons name="card-outline" size={24} color="white" style={{ marginLeft: 10 }} />
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
            <CustomModal
                visible={modalVisible}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={() => setModalVisible(false)}
                onConfirm={modalConfig.onConfirm}
                confirmText={modalConfig.confirmText}
            />
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
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
        paddingBottom: spacing.xxl
    },
    sectionLabel: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: spacing.md,
        marginTop: spacing.sm
    },
    inputGroup: {
        marginBottom: spacing.md
    },
    label: {
        ...typography.label,
        marginBottom: spacing.xs,
        fontWeight: '600'
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        height: 50
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.md
    },
    halfInput: {
        flex: 1,
    },
    saveButton: {
        borderRadius: borderRadius.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
        ...shadows.md,
        overflow: 'hidden'
    },
    gradientButton: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row'
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
