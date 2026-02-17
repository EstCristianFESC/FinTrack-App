import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getDb, deleteCard } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { CARD_TYPES, CardType } from '../utils/cardTypes';
import { spacing, borderRadius, shadows, typography, colors as tokens } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { formatNumberInput, parseCurrencyInput } from '../utils/formatters';
import CustomModal from '../components/CustomModal';
import CardTypeSelector from '../components/CardTypeSelector';

interface EditCardProps {
    cardId: number;
    onNavigate: (screen: string, params?: any) => void;
    onBack: () => void;
}

export default function EditCard({ cardId, onNavigate, onBack }: EditCardProps) {
    const { colors } = useTheme();
    const [name, setName] = useState('');
    const [bank, setBank] = useState('');
    const [cardType, setCardType] = useState<CardType>('visa');
    const [creditLimit, setCreditLimit] = useState('');
    const [cutDay, setCutDay] = useState('');
    const [payDay, setPayDay] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [lastFourDigits, setLastFourDigits] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [loading, setLoading] = useState(true);

    // Refs
    const bankRef = useRef<TextInput>(null);
    const last4Ref = useRef<TextInput>(null);
    const expiryRef = useRef<TextInput>(null);
    const quotaRef = useRef<TextInput>(null);
    const cutRef = useRef<TextInput>(null);
    const payRef = useRef<TextInput>(null);
    const interestRef = useRef<TextInput>(null);

    useEffect(() => {
        loadCard();
    }, []);

    const loadCard = async () => {
        try {
            const db = getDb();
            const card = await db.getFirstAsync<any>('SELECT * FROM cards WHERE id = ?', [cardId]);

            if (card) {
                setName(card.name);
                setBank(card.bank || '');
                setCardType((card.card_type as CardType) || 'visa');
                setCreditLimit(formatNumberInput(card.credit_limit.toString()));
                setCutDay(card.cut_day.toString());
                setPayDay(card.pay_day.toString());
                setInterestRate(card.interest_rate_ea.toString());
                setLastFourDigits(card.last_four_digits || '');
                setExpiryDate(card.expiry_date || '');
            } else {
                Alert.alert('Error', 'No se encontró la tarjeta');
                onBack(); // Go back if no card
            }
        } catch (error) {
            console.error('EditCard: Error loading data:', error);
            Alert.alert('Error', 'Falló la carga de datos');
        } finally {
            setLoading(false);
        }
    };

    const handleExpiryDateChange = (text: string) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');

        // Validation: Month <= 12
        if (cleaned.length >= 2) {
            const month = parseInt(cleaned.substring(0, 2));
            if (month > 12 || month === 0) {
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

    const handleSave = async () => {
        if (!name || !bank || !creditLimit || !cutDay || !payDay || !interestRate) {
            Alert.alert('Faltan Datos', 'Por favor completa los campos principales');
            return;
        }

        if (!validateDay(cutDay) || !validateDay(payDay)) {
            Alert.alert('Fechas Inválidas', 'El día de corte y pago debe ser entre 1 y 31');
            return;
        }

        if (expiryDate.length > 0 && expiryDate.length < 5) {
            Alert.alert('Fecha Incompleta', 'La fecha de vencimiento debe tener el formato MM/YY');
            return;
        }

        try {
            const limitValue = parseCurrencyInput(creditLimit);

            // Use centralized update function with Sync
            const { updateCard } = await import('../database/database');
            await updateCard(
                cardId,
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
            Alert.alert('¡Actualizada!', 'Los datos de tu tarjeta han sido actualizados.');
            onNavigate('CardDetail', { cardId }); // Force navigation state refresh
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo actualizar');
        }
    };

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info' | 'warning' | 'confirmation',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        onConfirm: () => { }
    });

    const showModal = (
        title: string,
        message: string,
        type: 'success' | 'error' | 'info' | 'warning' | 'confirmation',
        onConfirm?: () => void,
        confirmText: string = 'Aceptar',
        cancelText: string = 'Cancelar'
    ) => {
        setModalConfig({
            title,
            message,
            type,
            onConfirm: onConfirm || (() => setModalVisible(false)),
            confirmText,
            cancelText
        });
        setModalVisible(true);
    };

    const handleDelete = () => {
        showModal(
            'Eliminar Tarjeta',
            '¿Estás seguro de que quieres eliminar esta tarjeta? Se borrarán TODAS las compras e historial asociados. Esta acción no se puede deshacer.',
            'confirmation',
            async () => {
                try {
                    setModalVisible(false);
                    setLoading(true);
                    await deleteCard(cardId);
                    // showModal('Éxito', 'Tarjeta eliminada', 'success', () => onNavigate('Dashboard')); // Can't easily await this modal
                    onNavigate('Dashboard');
                } catch (error) {
                    console.error(error);
                    showModal('Error', 'No se pudo eliminar la tarjeta', 'error');
                    setLoading(false);
                }
            },
            'Eliminar',
            'Cancelar'
        );
    };



    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: spacing.md }}>Cargando datos...</Text>
            </View>
        );
    }

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
                <Text style={[styles.title, { color: colors.text }]}>Editar Tarjeta</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

                {/* Franchise Selector */}
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Franquicia</Text>
                <CardTypeSelector selectedType={cardType} onSelect={setCardType} />

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Nombre de la Tarjeta</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Ej: Visa Oro"
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="next"
                        onSubmitEditing={() => bankRef.current?.focus()}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Banco</Text>
                    <TextInput
                        ref={bankRef}
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        value={bank}
                        onChangeText={setBank}
                        placeholder="Ej: BBVA"
                        placeholderTextColor={colors.textMuted}
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
                            value={lastFourDigits}
                            onChangeText={(text) => {
                                setLastFourDigits(text);
                                if (text.length === 4) expiryRef.current?.focus();
                            }}
                            keyboardType="numeric"
                            maxLength={4}
                            placeholder="1234"
                            placeholderTextColor={colors.textMuted}
                            returnKeyType="next"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Vencimiento</Text>
                        <TextInput
                            ref={expiryRef}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={expiryDate}
                            onChangeText={handleExpiryDateChange}
                            maxLength={5}
                            placeholder="MM/YY"
                            placeholderTextColor={colors.textMuted}
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
                        value={creditLimit}
                        onChangeText={handleCurrencyChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        returnKeyType="next"
                        onSubmitEditing={() => cutRef.current?.focus()}
                    />
                </View>

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Corte</Text>
                        <TextInput
                            ref={cutRef}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={cutDay}
                            onChangeText={(text) => handleDayChange(text, setCutDay, payRef)}
                            keyboardType="numeric"
                            maxLength={2}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                            returnKeyType="next"
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Pago</Text>
                        <TextInput
                            ref={payRef}
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={payDay}
                            onChangeText={(text) => handleDayChange(text, setPayDay, interestRef)}
                            keyboardType="numeric"
                            maxLength={2}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                            returnKeyType="next"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Tasa Efectiva Anual (% E.A.)</Text>
                    <TextInput
                        ref={interestRef}
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        value={interestRate}
                        onChangeText={setInterestRate}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
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
                        <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.error }]}
                    onPress={handleDelete}
                >
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>Eliminar Tarjeta</Text>
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
                cancelText={modalConfig.cancelText}
            />
        </KeyboardAvoidingView>
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
        flex: 1
    },
    saveButton: {
        borderRadius: borderRadius.lg,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.md,
        overflow: 'hidden'
    },
    gradientButton: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        width: '100%'
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    deleteButton: {
        padding: 16,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
        marginBottom: spacing.xl
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
