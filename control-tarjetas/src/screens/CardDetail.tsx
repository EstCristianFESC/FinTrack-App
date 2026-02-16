import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardSummary, getTransactionsByCard, markPeriodAsPaid, unmarkPeriodAsPaid, getPeriodStatus, getAvailablePeriods, getTransactionsByPeriod } from '../database/database';
import TransactionItem from '../components/TransactionItem';
import { useTheme } from '../context/ThemeContext';
import { colors as tokens, spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatters';

interface CardDetailProps {
    cardId: number;
    onBack: () => void;
    onNavigate: (screen: string, params?: any) => void;
}

export default function CardDetail({ cardId, onBack, onNavigate }: CardDetailProps) {
    const { colors, theme } = useTheme();
    const [summary, setSummary] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [periodStatus, setPeriodStatus] = useState<any>({ isPaid: false });

    // Period Filter State
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
    const [showPeriodSelector, setShowPeriodSelector] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const sum = await getCardSummary(cardId);
            setSummary(sum);

            const availablePeriods = await getAvailablePeriods(cardId);
            setPeriods(availablePeriods);

            let currentPeriod = selectedPeriod;

            // If no period selected, try to find the "Current" one or default to the most recent
            if (!currentPeriod && availablePeriods.length > 0) {
                // Default to the one marked isCurrent, or the first one (newest)
                currentPeriod = availablePeriods.find(p => p.isCurrent) || availablePeriods[0];
                setSelectedPeriod(currentPeriod);
            }

            let txs;
            if (currentPeriod) {
                txs = await getTransactionsByPeriod(cardId, currentPeriod.startDate, currentPeriod.endDate);
            } else {
                // Fallback to all if no periods (e.g. new card)
                txs = await getTransactionsByCard(cardId);
            }

            setTransactions(txs);

            if (sum) {
                const status = await getPeriodStatus(cardId, sum.nextCutOffDate.toISOString());
                setPeriodStatus(status);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Reload when period changes (but not on initial load to avoid double fetch if handled above)
    // Actually, distinct useEffect for cardId vs selectedPeriod is tricky if they depend on each other.
    // Let's keep one main loadData and call it.

    useEffect(() => {
        loadData();
    }, [cardId]);

    // When selectedPeriod changes, we just refetch transactions to be snappy
    const handlePeriodChange = async (period: any) => {
        setSelectedPeriod(period);
        setShowPeriodSelector(false);
        setLoading(true);
        try {
            const txs = await getTransactionsByPeriod(cardId, period.startDate, period.endDate);
            setTransactions(txs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    };

    const handlePayCutOff = () => {
        if (!summary || summary.paymentForIssue <= 0) return;
        onNavigate('PaymentSummary', {
            cardId,
            cutOffDate: summary.nextCutOffDate.toISOString()
        });
    };

    const handleRevertPayment = async () => {
        Alert.alert(
            'Deshacer Pago',
            '¿Deseas revertir el pago de este corte? Los movimientos volverán a estar pendientes.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Deshacer',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await unmarkPeriodAsPaid(cardId, summary.nextCutOffDate);
                            Alert.alert('Pago Revertido', 'El estado de cuenta ha sido restaurado.');
                            loadData();
                        } catch (e) {
                            Alert.alert('Error', 'No se pudo revertir el pago');
                        }
                    }
                }
            ]
        );
    };

    if (loading && !summary) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Detalle</Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={() => onNavigate('EditCard', { cardId })}
                    >
                        <Ionicons name="settings-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => onNavigate('AddTransaction', { cardId })}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {summary && (
                <LinearGradient
                    colors={theme === 'dark' ? ['#133154', '#0A2540'] : ['#FFFFFF', '#F3F4F6']}
                    style={[styles.summaryCard, { borderColor: colors.border }]}
                >
                    <View style={styles.row}>
                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>
                                PAGO PRÓXIMO <Text style={{ fontWeight: '400' }}>({formatDate(new Date(summary.nextPayDate))})</Text>
                            </Text>
                            <Text style={[styles.bigValue, { color: summary.paymentForIssue > 0 ? tokens.error : colors.text }]}>
                                {formatCurrency(summary.paymentForIssue)}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                {summary.paymentForIssue > 0 && (
                                    <TouchableOpacity onPress={handlePayCutOff} style={[styles.payButton, { backgroundColor: colors.success }]}>
                                        <Text style={[styles.payButtonText, { color: '#003300' }]}>Pagar Corte</Text>
                                    </TouchableOpacity>
                                )}

                                {periodStatus.isPaid && (
                                    <TouchableOpacity onPress={handleRevertPayment} style={[styles.payButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error }]}>
                                        <Text style={[styles.payButtonText, { color: colors.error }]}>Deshacer Pago</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.row}>
                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>DEUDA TOTAL</Text>
                            <Text style={[styles.value, { color: colors.text }]}>{formatCurrency(summary.totalDebt)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>DISPONIBLE</Text>
                            <Text style={[styles.value, { color: colors.success }]}>
                                {formatCurrency(summary.availableCredit)}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            )}

            <View style={styles.historyHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Movimientos</Text>

                {periods.length > 0 && (
                    <TouchableOpacity
                        style={[styles.periodSelector, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={() => setShowPeriodSelector(true)}
                    >
                        <Text style={[styles.periodText, { color: colors.primary }]}>
                            {selectedPeriod ? selectedPeriod.label : 'Periodo'} ▼
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TransactionItem
                        transaction={item}
                        onPress={() => onNavigate('EditTransaction', { transactionId: item.id, cardId })}
                    />
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ marginTop: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 40, marginBottom: 10 }}>🧾</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 16 }}>
                            Sin movimientos en este periodo.
                        </Text>
                    </View>
                }
            />

            {/* Period Selector Modal */}
            <Modal
                visible={showPeriodSelector}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPeriodSelector(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPeriodSelector(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Periodo</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {periods.map((period, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.periodOption,
                                        { borderBottomColor: colors.border },
                                        selectedPeriod?.value === period.value && { backgroundColor: colors.primary + '10' }
                                    ]}
                                    onPress={() => handlePeriodChange(period)}
                                >
                                    <Text style={[
                                        styles.periodOptionText,
                                        { color: colors.text },
                                        selectedPeriod?.value === period.value && { color: colors.primary, fontWeight: '700' }
                                    ]}>
                                        {period.label} {period.isCurrent ? ' (Actual)' : ''}
                                    </Text>
                                    {selectedPeriod?.value === period.value && (
                                        <Text style={{ color: colors.primary }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.border }]}
                            onPress={() => setShowPeriodSelector(false)}
                        >
                            <Text style={[styles.closeButtonText, { color: colors.text }]}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        ...shadows.sm,
    },
    backText: {
        fontSize: 24,
        marginTop: -4
    },
    title: {
        ...typography.h3,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        ...shadows.sm,
    },
    iconButtonText: {
        fontSize: 16
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        ...shadows.sm,
    },
    addButton: { // Legacy ref
        padding: 0
    },
    addButtonText: { // Legacy ref
        fontSize: 0
    },
    summaryCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        borderWidth: 1,
        ...shadows.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    label: {
        ...typography.label,
        marginBottom: 4,
    },
    bigValue: {
        ...typography.h1,
        fontSize: 36,
    },
    value: {
        ...typography.h3,
    },
    divider: {
        height: 1,
        marginVertical: spacing.md,
        opacity: 0.5
    },
    payButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: borderRadius.full,
    },
    payButtonText: {
        fontSize: 12,
        fontWeight: '700',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md
    },
    sectionTitle: {
        ...typography.h3,
    },
    periodSelector: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        ...shadows.sm,
    },
    periodText: {
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        paddingBottom: spacing.xl
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '85%',
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        ...shadows.lg,
    },
    modalTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
        textAlign: 'center'
    },
    periodOption: {
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    periodOptionText: {
        fontSize: 16
    },
    closeButton: {
        marginTop: spacing.md,
        padding: 12,
        borderRadius: borderRadius.md,
        alignItems: 'center'
    },
    closeButtonText: {
        fontWeight: '600'
    }
});
