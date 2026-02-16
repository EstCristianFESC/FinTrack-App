import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getDb, getPeople, addPerson, getSafeDate, deletePurchase } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';

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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const peopleData = await getPeople();
        setPeople(peopleData);

        const db = getDb();
        const tx = await db.getFirstAsync<any>('SELECT * FROM purchases WHERE id = ?', [transactionId]);
        if (tx) {
            setAmount(tx.amount.toString());
            setNotes(tx.notes);
            setInstallments(tx.installments_total.toString());
            setDate(tx.date); // Keep full ISO string if needed for re-calc
            setSelectedPersonId(tx.person_id);
        }
        setLoading(false);
    };

    const handleAddPerson = async () => {
        if (!newPersonName) return;
        await addPerson(newPersonName);
        setNewPersonName('');
        setShowNewPerson(false);
        const peopleData = await getPeople();
        setPeople(peopleData);
    };

    const handleDelete = () => {
        Alert.alert(
            'Eliminar Gasto',
            '¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePurchase(transactionId);
                            Alert.alert('Éxito', 'Gasto eliminado');
                            onBack();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar el gasto');
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        try {
            // Need card details for EA
            const db = getDb();
            const card = await db.getFirstAsync<any>('SELECT * FROM cards WHERE id = ?', [cardId]);

            // ... calculations identical to createInstallmentPurchase ...
            const eaDecimal = card.interest_rate_ea / 100;
            const tem = Math.pow(1 + eaDecimal, 1 / 12) - 1;

            const totalAmount = parseFloat(amount);
            const totalInstallments = parseInt(installments);

            // Amortization
            let totalWithInterest = 0;
            let tempBalance = totalAmount;
            const capitalPerInstallment = totalAmount / totalInstallments;

            for (let i = 0; i < totalInstallments; i++) {
                const interest = totalInstallments === 1 ? 0 : tempBalance * tem;
                totalWithInterest += (capitalPerInstallment + interest);
                tempBalance -= capitalPerInstallment;
            }

            // Update Purchase
            await db.runAsync(`
                UPDATE purchases 
                SET amount = ?, total_with_interest = ?, notes = ?, installments_total = ?, interest_rate_ea = ?, person_id = ?
                WHERE id = ?
             `, [totalAmount, totalWithInterest, notes, totalInstallments, card.interest_rate_ea, selectedPersonId, transactionId]);

            // Delete old installments
            await db.runAsync('DELETE FROM installments WHERE purchase_id = ?', [transactionId]);

            // Generate new installments
            let today = new Date(date); // Use existing date

            // 1. Cut Off Relative to Purchase Date
            let targetCutOffMonth = today.getMonth();
            let targetCutOffYear = today.getFullYear();

            if (today.getDate() > card.cut_day) {
                targetCutOffMonth++;
            }

            const cutOff = getSafeDate(targetCutOffYear, targetCutOffMonth, card.cut_day);

            let targetPayMonth = cutOff.getMonth();
            let targetPayYear = cutOff.getFullYear();

            if (card.pay_day < card.cut_day) {
                targetPayMonth++;
            }

            const firstPayDate = getSafeDate(targetPayYear, targetPayMonth, card.pay_day);

            let currentBalance = totalAmount;
            for (let i = 0; i < totalInstallments; i++) {
                const interestAmount = totalInstallments === 1 ? 0 : currentBalance * tem;
                const totalInstallmentAmount = capitalPerInstallment + interestAmount;

                const installmentDate = getSafeDate(
                    firstPayDate.getFullYear(),
                    firstPayDate.getMonth() + i,
                    card.pay_day
                );

                await db.runAsync(
                    `INSERT INTO installments
                    (purchase_id, installment_number, amount, capital, interest, due_date)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                    [transactionId, i + 1, totalInstallmentAmount, capitalPerInstallment, interestAmount, installmentDate.toISOString()]
                );
                currentBalance -= capitalPerInstallment;
            }

            Alert.alert('Éxito', 'Gasto actualizado');
            onBack();

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo actualizar');
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Editar Gasto</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Monto</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.label, { color: colors.textMuted }]}>Cuotas</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                    value={installments}
                    onChangeText={setInstallments}
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                />

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
                        <Text style={[styles.addPersonText, { color: colors.primary }]}>+</Text>
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
        marginBottom: spacing.xl,
        // marginTop: spacing.xxl,
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
    addPersonText: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    newPersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg
    },
    smallBtn: {
        padding: 16,
        borderRadius: borderRadius.md
    }
});
