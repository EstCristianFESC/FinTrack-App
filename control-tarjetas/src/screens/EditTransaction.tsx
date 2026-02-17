import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { getDb, getPeople, addPerson, getSafeDate, deletePurchase, getCardSummary } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import { formatCurrency, formatNumberInput, parseCurrencyInput } from '../utils/formatters';

interface EditTransactionProps {
    transactionId: number;
    cardId: number;
    onBack: () => void;
}

export default function EditTransaction({ transactionId, cardId, onBack }: EditTransactionProps) {
    const { colors } = useTheme();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);

    const [installments, setInstallments] = useState('');
    const [date, setDate] = useState('');

    const [people, setPeople] = useState<any[]>([]);
    const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
    const [newPersonName, setNewPersonName] = useState('');
    const [showNewPerson, setShowNewPerson] = useState(false);

    // Balance check
    const [availableCredit, setAvailableCredit] = useState(0);
    const [originalAmount, setOriginalAmount] = useState(0);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as 'success' | 'error' | 'info' | 'warning' | 'confirmation',
        confirmText: 'Aceptar',
        cancelText: 'Cancelar',
        onConfirm: () => { }
    });


    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const peopleData = await getPeople();
        setPeople(peopleData);

        const db = getDb();
        const tx = await db.getFirstAsync<any>('SELECT * FROM purchases WHERE id = ?', [transactionId]);

        const summary = await getCardSummary(cardId);
        if (summary) setAvailableCredit(summary.availableCredit);

        if (tx) {
            setAmount(formatNumberInput(tx.amount.toString()));
            setOriginalAmount(tx.amount); // Keep reference to calculate delta
            setNotes(tx.notes);
            setInstallments(tx.installments_total.toString());
            setDate(tx.date); // Keep full ISO string if needed for re-calc
            setSelectedPersonId(tx.person_id);
        }
        setLoading(false);
    };

    const handleAddPerson = async () => {
        if (!newPersonName) return;
        try {
            const newId = await addPerson(newPersonName);
            setNewPersonName('');
            setShowNewPerson(false);

            const peopleData = await getPeople();
            setPeople(peopleData);
            if (newId) {
                setSelectedPersonId(newId as number);
            }
        } catch (e) {
            console.error(e);
        }
    };

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
            'Eliminar Gasto',
            '¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.',
            'confirmation',
            async () => {
                try {
                    setModalVisible(false); // Close modal first
                    await deletePurchase(transactionId);
                    // Show success? Or just go back.
                    // A simple toast might be better, or just go back.
                    // But let's verify.
                    onBack();
                } catch (error) {
                    showModal('Error', 'No se pudo eliminar el gasto', 'error');
                }
            },
            'Eliminar',
            'Cancelar'
        );
    };

    const adjustInstallments = (delta: number) => {
        let current = parseInt(installments) || 1;
        current += delta;
        if (current < 1) current = 1;
        setInstallments(current.toString());
    };

    const handleSave = async () => {
        const numericAmount = parseCurrencyInput(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            showModal('Monto Inválido', 'El monto debe ser numérico y mayor a 0', 'error');
            return;
        }

        // Logic: Available Credit = CurrentAvailable + OriginalAmountOfThisTransaction
        // If I increase amount, it consumes more.
        const effectiveAvailable = availableCredit + originalAmount;
        if (numericAmount > effectiveAvailable) {
            showModal('Cupo Insuficiente', `El nuevo monto excede el cupo disponible (Max: ${formatCurrency(effectiveAvailable)})`, 'error');
            return;
        }

        showModal(
            'Confirmar Cambios',
            '¿Guardar los cambios? Se recalcularán las cuotas futuras basadas en la fecha original del gasto.',
            'confirmation',
            async () => {
                await processUpdate();
                setModalVisible(false);
            },
            'Guardar'
        );
    };

    const processUpdate = async () => {
        try {
            // Use centralized update function with Sync
            const { updatePurchaseWithInstallments } = await import('../database/database');

            const totalAmount = parseCurrencyInput(amount);
            const totalInstallments = parseInt(installments);

            await updatePurchaseWithInstallments(
                transactionId,
                cardId,
                selectedPersonId,
                totalAmount,
                totalInstallments,
                notes,
                date // Original date
            );

            onBack();

        } catch (error) {
            console.error(error);
            showModal('Error', 'No se pudo actualizar', 'error');
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                <Text style={[styles.title, { color: colors.text }]}>Editar Gasto</Text>
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
                        Original: {formatCurrency(originalAmount)}
                    </Text>
                </View>

                <View style={{ marginBottom: spacing.md }}>
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
                            onChangeText={(text) => setInstallments(text.replace(/[^0-9]/g, ''))}
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

                <Text style={[styles.label, { color: colors.textMuted }]}>Descripción</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>¿Quién hizo el gasto?</Text>
                <View style={styles.peopleContainer}>
                    <TouchableOpacity
                        style={[styles.personChip, selectedPersonId === null && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => setSelectedPersonId(null)}
                    >
                        <Text style={[styles.personText, { color: selectedPersonId === null ? 'white' : colors.textMuted }]}>Yo</Text>
                    </TouchableOpacity>
                    {people.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.personChip,
                                { borderColor: colors.border },
                                selectedPersonId === p.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setSelectedPersonId(p.id)}
                        >
                            <Text style={[styles.personText, { color: selectedPersonId === p.id ? 'white' : colors.textMuted }]}>{p.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={[styles.addPersonBtn, { borderColor: colors.primary }]}
                        onPress={() => setShowNewPerson(!showNewPerson)}
                    >
                        <Ionicons name="add" size={20} color={colors.primary} />
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

                <View style={[styles.warningCard, { backgroundColor: colors.cardBg, borderColor: colors.warning }]}>
                    <Text style={[styles.warningText, { color: colors.warning }]}>
                        ⚠️ Al guardar, se recalculará el plan de pagos (intereses y fechas) basado en la fecha original del gasto y la tasa actual de la tarjeta.
                    </Text>
                </View>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: colors.error }]}
                    onPress={handleDelete}
                >
                    <Text style={[styles.deleteButtonText, { color: colors.error }]}>Eliminar Gasto</Text>
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
        marginBottom: spacing.xl,
        // marginTop: spacing.xxl,
        paddingVertical: spacing.md
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
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
    },
    input: {
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: 16,
        marginBottom: spacing.md,
        borderWidth: 1,
    },
    warningCard: {
        // backgroundColor: 'rgba(251, 191, 36, 0.1)', // Removed hardcoded
        borderWidth: 1,
        // borderColor: 'rgba(251, 191, 36, 0.3)', // Removed hardcoded
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.lg
    },
    warningText: {
        // color: '#fcd34d', // Removed hardcoded
        fontSize: 13,
        lineHeight: 20
    },
    saveButton: {
        padding: 18,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginTop: spacing.sm,
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
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent'
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    peopleContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: spacing.lg,
        gap: spacing.xs
    },
    personChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        backgroundColor: 'transparent' // Default transparent
    },
    personText: {
        fontWeight: '600'
    },
    addPersonBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed'
    },
    newPersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg
    },
    smallBtn: {
        padding: 16,
        borderRadius: borderRadius.md
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
