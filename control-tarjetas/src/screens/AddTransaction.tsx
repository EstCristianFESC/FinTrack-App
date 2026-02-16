import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { createInstallmentPurchase, getPeople, addPerson } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/designTokens';

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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const peopleData = await getPeople();
        setPeople(peopleData);

        const db = await import('../database/database').then(m => m.getDb());
        const cardData = await db.getFirstAsync('SELECT * FROM cards WHERE id = ?', [cardId]);
        setCard(cardData);
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
        await addPerson(newPersonName);
        setNewPersonName('');
        setShowNewPerson(false);
        loadPeople();
    };

    const handleSave = async () => {
        if (!amount || !installments) {
            Alert.alert('Error', 'Ingresa el monto y cuotas');
            return;
        }

        try {
            await createInstallmentPurchase(
                cardId,
                selectedPersonId,
                parseFloat(amount),
                parseInt(installments),
                notes
            );
            Alert.alert('Éxito', 'Movimiento agregado');
            onBack();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo guardar');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg }]}>
                    <Text style={[styles.backText, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Nuevo Gasto</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    <Text style={styles.label}>Monto de la compra</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.currencyPrefix}>$</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0"
                            placeholderTextColor="#64748b"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            autoFocus
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Ej: Almuerzo, Netflix, Uber..."
                        placeholderTextColor="#64748b"
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                        <Text style={styles.label}>Cuotas</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1"
                            placeholderTextColor="#64748b"
                            value={installments}
                            onChangeText={setInstallments}
                            keyboardType="numeric"
                            textAlign="center"
                        />
                    </View>

                    {parseInt(installments) > 1 && card && (
                        <View style={[styles.infoCard, { flex: 2 }]}>
                            <Text style={styles.infoLabel}>Tasa Mensual</Text>
                            <Text style={styles.infoValue}>{getMonthlyRate()}%</Text>
                            <Text style={styles.infoSub}>E.A. {card.interest_rate_ea}%</Text>
                        </View>
                    )}
                </View>

                <Text style={[styles.label, { marginTop: 10 }]}>¿Quién hizo el gasto?</Text>
                <View style={styles.peopleContainer}>
                    <TouchableOpacity
                        style={[styles.personChip, selectedPersonId === null && styles.selectedChip]}
                        onPress={() => setSelectedPersonId(null)}
                    >
                        <Text style={[styles.personText, selectedPersonId === null && styles.selectedText]}>Yo</Text>
                    </TouchableOpacity>
                    {people.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.personChip, selectedPersonId === p.id && styles.selectedChip]}
                            onPress={() => setSelectedPersonId(p.id)}
                        >
                            <Text style={[styles.personText, selectedPersonId === p.id && styles.selectedText]}>{p.name}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                        style={styles.addPersonBtn}
                        onPress={() => setShowNewPerson(!showNewPerson)}
                    >
                        <Text style={styles.addPersonText}>+</Text>
                    </TouchableOpacity>
                </View>

                {showNewPerson && (
                    <View style={styles.newPersonRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                            placeholder="Nombre nueva persona"
                            placeholderTextColor="#64748b"
                            value={newPersonName}
                            onChangeText={setNewPersonName}
                        />
                        <TouchableOpacity style={styles.smallBtn} onPress={handleAddPerson}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>OK</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#3b82f6', '#2563eb']}
                        style={styles.saveGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.saveButtonText}>Guardar Gasto</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
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
        padding: 8,
        borderRadius: 12,
        marginRight: 16
    },
    backText: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    form: {
        paddingBottom: 40
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        alignItems: 'center'
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10
    },
    currencyPrefix: {
        fontSize: 32,
        color: '#94a3b8',
        fontWeight: 'bold',
        marginRight: 4
    },
    amountInput: {
        fontSize: 40,
        color: '#f8fafc',
        fontWeight: 'bold',
        minWidth: 100,
        textAlign: 'center'
    },
    inputGroup: {
        marginBottom: 20
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5
    },
    input: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        padding: 16,
        color: '#f8fafc',
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10
    },
    infoCard: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        marginTop: 27 // align with input
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
        marginBottom: 24
    },
    personChip: {
        backgroundColor: '#1e293b',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    selectedChip: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6'
    },
    personText: {
        color: '#94a3b8',
        fontWeight: '600'
    },
    selectedText: {
        color: 'white'
    },
    addPersonBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed'
    },
    addPersonText: {
        color: '#3b82f6',
        fontSize: 20,
        fontWeight: 'bold'
    },
    newPersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24
    },
    smallBtn: {
        backgroundColor: '#3b82f6',
        padding: 16,
        borderRadius: 12
    },
    saveButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: "#3b82f6",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
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
    }
});
