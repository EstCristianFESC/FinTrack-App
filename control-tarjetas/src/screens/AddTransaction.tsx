import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { createInstallmentPurchase, getPeople, addPerson, getCardSummary } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import DatePickerModal from '../components/DatePickerModal';
import { formatCurrency, formatNumberInput, parseCurrencyInput } from '../utils/formatters';

interface AddTransactionProps {
    cardId: number;
    onBack: () => void;
}

export default function AddTransaction({ cardId, onBack }: AddTransactionProps) {
    const { colors } = useTheme();
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState('1');
    const [notes, setNotes] = useState('');
    const [people, setPeople] = useState<any[]>([]);
    const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
    const [newPersonName, setNewPersonName] = useState('');
    const [showNewPerson, setShowNewPerson] = useState(false);
    const [interestRate, setInterestRate] = useState('0'); // Default 0 for 1 installment
    const [card, setCard] = useState<any>(null);
    const [availableCredit, setAvailableCredit] = useState(0);

    // Date
    const [date, setDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info' | 'warning' | 'confirmation',
        onConfirm: () => { }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const peopleData = await getPeople();
        setPeople(peopleData);

        const db = await import('../database/database').then(m => m.getDb());
        const cardData = await db.getFirstAsync('SELECT * FROM cards WHERE id = ?', [cardId]);
        setCard(cardData);

        const summary = await getCardSummary(cardId);
        if (summary) {
            setAvailableCredit(summary.availableCredit);
        }
    };

    const getMonthlyRate = () => {
        if (!card?.interest_rate_ea) return 0;
        const ea = card.interest_rate_ea / 100;
        const tem = Math.pow(1 + ea, 1 / 12) - 1;
        return (tem * 100).toFixed(2);
    };


    const loadPeople = async () => {
        const data = await getPeople();
        setPeople(data);
    };

    const handleAddPerson = async () => {
        if (!newPersonName) return;
        try {
            const newId = await addPerson(newPersonName);
            setNewPersonName('');
            setShowNewPerson(false);

            // Reload and select
            const updatedPeople = await getPeople();
            setPeople(updatedPeople);
            // Verify ID is returned correctly from database.ts update logic
            if (newId) {
                setSelectedPersonId(newId as number);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning', onConfirm?: () => void) => {
        setModalConfig({
            title,
            message,
            type,
            onConfirm: onConfirm || (() => setModalVisible(false))
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!amount || !installments) {
            showModal('Datos Incompletos', 'Por favor ingresa el monto y el número de cuotas.', 'warning');
            return;
        }

        const numericAmount = parseCurrencyInput(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            showModal('Monto Inválido', 'El monto debe ser mayor a 0.', 'error');
            return;
        }

        if (numericAmount > availableCredit) {
            showModal('Cupo Insuficiente', `El monto (${formatCurrency(numericAmount)}) excede tu cupo disponible (${formatCurrency(availableCredit)}).`, 'error');
            return;
        }

        try {
            // Check if date is today or backdated
            const isBackdated = date.toDateString() !== new Date().toDateString();

            // If backdated, we need to pass the custom date
            // But wait, createInstallmentPurchase handles 'today' by default.
            // We need to modify createInstallmentPurchase to accept an optional date
            // OR use update logic? No, create should support it.
            // Let's modify createInstallmentPurchase in database.ts first? 
            // The user implies they want to set date on creation too.
            // For now let's pass it but verify if database.ts supports it. 
            // Checking database.ts... createInstallmentPurchase takes (cardId, personId, totalAmount, totalInstallments, notes)
            // It uses 'today = new Date()' inside.

            // I need to update createInstallmentPurchase signature in database.ts OR
            // just use it and then immediately update it? That's messy.
            // Better to update the signature.
            // I'll make a separate tool call to update database.ts signature.
            // For this file, I'll pass the date assuming I'll fix database.ts next.

            const customDateIso = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                12, 0, 0
            ).toISOString();

            await createInstallmentPurchase(
                cardId,
                selectedPersonId,
                numericAmount,
                parseInt(installments),
                notes,
                customDateIso // Adding this argument
            );

            showModal('¡Gasto Guardado!', 'El movimiento se registró exitosamente.', 'success', () => {
                setModalVisible(false);
                onBack();
            });
        } catch (error) {
            console.error(error);
            showModal('Error', 'No se pudo guardar el gasto. Intenta nuevamente.', 'error');
        }
    };

    const adjustInstallments = (delta: number) => {
        let current = parseInt(installments) || 1;
        current += delta;
        if (current < 1) current = 1;
        if (current > 36) current = 36; // Logical cap
        setInstallments(current.toString());
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Nuevo Gasto</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Monto de la compra</Text>
                    <View style={styles.inputContainer}>
                        <Text style={[styles.currencyPrefix, { color: colors.textMuted }]}>$</Text>
                        <TextInput
                            style={[styles.amountInput, { color: colors.text }]}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            value={amount}
                            onChangeText={(text) => setAmount(formatNumberInput(text))}
                            keyboardType="numeric"
                            autoFocus
                        />
                    </View>
                    <Text style={{ color: colors.textMuted, marginTop: 5, fontSize: 12 }}>
                        Disponible: {formatCurrency(availableCredit)}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, padding: 15, marginBottom: spacing.md, alignItems: 'stretch' }]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <Text style={[styles.label, { color: colors.textMuted }]}>Fecha de Compra</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                            {date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                        <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    </View>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Descripción</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                        placeholder="Ej: Almuerzo, Netflix, Uber..."
                        placeholderTextColor={colors.textMuted}
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>Cuotas</Text>
                        <View style={[styles.counterContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <TouchableOpacity
                                onPress={() => adjustInstallments(-1)}
                                style={[styles.counterButton, { borderRightColor: colors.border }]}
                            >
                                <Ionicons name="remove" size={20} color={colors.primary} />
                            </TouchableOpacity>

                            <TextInput
                                style={[styles.counterInput, { color: colors.text }]}
                                value={installments}
                                onChangeText={(text) => {
                                    // Allow empty for typing, but validate on blur typically
                                    setInstallments(text.replace(/[^0-9]/g, ''));
                                }}
                                keyboardType="numeric"
                                textAlign="center"
                            />

                            <TouchableOpacity
                                onPress={() => adjustInstallments(1)}
                                style={[styles.counterButton, { borderLeftColor: colors.border }]}
                            >
                                <Ionicons name="add" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {parseInt(installments) > 1 && card && (
                        <View style={[styles.infoCard, { flex: 1 }]}>
                            <Text style={styles.infoLabel}>Tasa Mensual</Text>
                            <Text style={styles.infoValue}>{getMonthlyRate()}%</Text>
                            <Text style={styles.infoSub}>E.A. {card.interest_rate_ea}%</Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.label, { marginTop: 10, color: colors.textMuted }]}>¿Quién hizo el gasto?</Text>
                <View style={styles.peopleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.personChip,
                            { borderColor: colors.border, backgroundColor: 'transparent' },
                            selectedPersonId === null && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setSelectedPersonId(null)}
                    >
                        <Text style={[
                            styles.personText,
                            { color: selectedPersonId === null ? 'white' : colors.textMuted }
                        ]}>Yo</Text>
                    </TouchableOpacity>
                    {people.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.personChip,
                                { borderColor: colors.border, backgroundColor: 'transparent' },
                                selectedPersonId === p.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setSelectedPersonId(p.id)}
                        >
                            <Text style={[
                                styles.personText,
                                { color: selectedPersonId === p.id ? 'white' : colors.textMuted }
                            ]}>{p.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.addPersonBtn, { borderColor: colors.primary }]}
                        onPress={() => setShowNewPerson(!showNewPerson)}
                    >
                        <Ionicons name="add" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {showNewPerson && (
                    <View style={styles.newPersonRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                            placeholder="Nombre nueva persona"
                            placeholderTextColor={colors.textMuted}
                            value={newPersonName}
                            onChangeText={setNewPersonName}
                        />
                        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={handleAddPerson}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
                    <LinearGradient
                        colors={[colors.primary, colors.accent]}
                        style={styles.saveGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.saveButtonText}>Guardar Gasto</Text>
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
                confirmText="Aceptar"
            />
            <DatePickerModal
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelect={(d) => {
                    setDate(d);
                    setShowDatePicker(false);
                }}
                initialDate={date}
                title="Fecha del Gasto"
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        // marginTop: spacing.xxl
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    form: {
        paddingBottom: 40
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10
    },
    currencyPrefix: {
        fontSize: 32,
        fontWeight: 'bold',
        marginRight: 4
    },
    amountInput: {
        fontSize: 40,
        fontWeight: 'bold',
        minWidth: 100,
        textAlign: 'center'
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20
    },
    infoCard: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56, // Match counter height
        marginTop: 27 // Align with label
    },
    infoLabel: {
        color: '#93c5fd',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2
    },
    infoValue: {
        color: '#60a5fa',
        fontSize: 16,
        fontWeight: 'bold'
    },
    infoSub: {
        color: '#64748b',
        fontSize: 10
    },
    peopleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 24,
        gap: 8
    },
    personChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    personText: {
        fontWeight: '600'
    },
    addPersonBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed'
    },
    newPersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24
    },
    smallBtn: {
        padding: 16,
        borderRadius: 12
    },
    saveButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 10,
        ...shadows.md
    },
    saveGradient: {
        padding: 20,
        alignItems: 'center'
    },
    saveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        height: 56, // Match standard input height
        overflow: 'hidden'
    },
    counterButton: {
        width: 48,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)'
    },
    counterInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        height: '100%'
    }
});
