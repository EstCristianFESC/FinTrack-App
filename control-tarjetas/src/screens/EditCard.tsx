import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getDb, deleteCard } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { CARD_TYPES, CardType } from '../utils/cardTypes';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';

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
                setCreditLimit(card.credit_limit.toString());
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
            const db = getDb();
            await db.runAsync(
                `UPDATE cards 
                 SET name = ?, bank = ?, card_type = ?, credit_limit = ?, cut_day = ?, pay_day = ?, interest_rate_ea = ?, last_four_digits = ?, expiry_date = ?
                 WHERE id = ?`,
                [name, bank, cardType, parseFloat(creditLimit), parseInt(cutDay), parseInt(payDay), parseFloat(interestRate), lastFourDigits, expiryDate, cardId]
            );
            Alert.alert('Éxito', 'Tarjeta actualizada');
            onNavigate('CardDetail', { cardId }); // Force navigation state refresh
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo actualizar');
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Tarjeta',
            '¿Estás seguro de que quieres eliminar esta tarjeta? Se borrarán TODAS las compras e historial asociados. Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteCard(cardId);
                            Alert.alert('Éxito', 'Tarjeta eliminada');
                            onNavigate('Dashboard'); // Go back to root
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'No se pudo eliminar la tarjeta');
                            setLoading(false);
                        }
                    }
                }
            ]
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Editar Tarjeta</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Nombre de la Tarjeta</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej: Visa Oro"
                    placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Banco</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={bank}
                    onChangeText={setBank}
                    placeholder="Ej: BBVA"
                    placeholderTextColor={colors.textMuted}
                />


                {/* Card Type Selector */}
                <Text style={[styles.label, { color: colors.textMuted, marginTop: spacing.md }]}>Tipo de Tarjeta</Text>
                <View style={[styles.cardTypeContainer, { marginBottom: 60 }]}>

                    {CARD_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.value}
                            style={[
                                styles.cardTypeButton,
                                {
                                    backgroundColor: cardType === type.value ? colors.primary : colors.cardBg,
                                    borderColor: cardType === type.value ? colors.primary : colors.border,
                                    width: '48%', // Ensure 2 columns
                                    paddingVertical: spacing.md,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }
                            ]}
                            onPress={() => setCardType(type.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.cardTypeLabel,
                                { color: cardType === type.value ? 'white' : colors.text, textAlign: 'center' }
                            ]}>
                                {type.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.row, { marginTop: spacing.md }]}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Últimos 4 Dígitos</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={lastFourDigits}
                            onChangeText={setLastFourDigits}
                            keyboardType="numeric"
                            maxLength={4}
                            placeholder="1234"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Vencimiento</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={expiryDate}
                            onChangeText={handleExpiryDateChange}
                            maxLength={5}
                            placeholder="MM/YY"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Cupo Total</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                />

                <View style={styles.row}>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Corte</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={cutDay}
                            onChangeText={setCutDay}
                            keyboardType="numeric"
                            maxLength={2}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                    <View style={styles.halfInput}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Día Pago</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border, textAlign: 'center' }]}
                            value={payDay}
                            onChangeText={setPayDay}
                            keyboardType="numeric"
                            maxLength={2}
                            placeholder="DD"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Tasa Efectiva Anual (% E.A.)</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.error }]}
                    onPress={handleDelete}
                >
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>Eliminar Tarjeta</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
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
        marginBottom: spacing.lg,
        // marginTop: spacing.lg,
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
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        marginBottom: spacing.md,
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md
    },
    halfInput: {
        flex: 1
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
    },
    deleteButton: {
        marginTop: spacing.lg,
        padding: 16,
        borderRadius: borderRadius.lg, // Match saveButton radius
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent'
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    cardTypeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.sm,
        marginBottom: spacing.md,
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
});
