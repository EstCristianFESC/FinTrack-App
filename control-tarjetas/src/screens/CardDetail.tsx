import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardSummary, getTransactionsByCard, markPeriodAsPaid, unmarkPeriodAsPaid, getPeriodStatus, getAvailablePeriods, getTransactionsByPeriod, getStatementItems, getSafeDate } from '../database/database';
import TransactionItem from '../components/TransactionItem';
import { useTheme } from '../context/ThemeContext';
import { colors as tokens, spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatters';
import CustomModal from '../components/CustomModal';

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
                // Use new Statement Logic
                txs = await getStatementItems(cardId, currentPeriod.endDate);
            } else {
                // Fallback to all purchases if no periods (e.g. newly created card)
                txs = await getTransactionsByCard(cardId);
            }

            setTransactions(txs);

            if (sum && currentPeriod) {
                // Check status based on the selected period's cutoff
                const status = await getPeriodStatus(cardId, currentPeriod.endDate);
                setPeriodStatus(status);
            } else if (sum) {
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
            // Use new Statement Logic
            const txs = await getStatementItems(cardId, period.endDate);
            setTransactions(txs);

            // Update period status too
            const status = await getPeriodStatus(cardId, period.endDate);
            setPeriodStatus(status);

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
        // Use selected period date if available, otherwise current summary date
        const cutOffToPay = selectedPeriod ? selectedPeriod.endDate : (summary ? summary.nextCutOffDate : null);

        if (!cutOffToPay) return;

        onNavigate('PaymentSummary', {
            cardId,
            cutOffDate: typeof cutOffToPay === 'string' ? cutOffToPay : cutOffToPay.toISOString()
        });
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

    const handleRevertPayment = async () => {
        showModal(
            'Deshacer Pago',
            '¿Deseas revertir el pago de este corte? Los movimientos volverán a estar pendientes.',
            'confirmation',
            async () => {
                try {
                    await unmarkPeriodAsPaid(cardId, summary.nextCutOffDate);
                    setModalVisible(false);
                    // showModal('Pago Revertido', 'El estado de cuenta ha sido restaurado.', 'success'); // Optional, or just reload
                    loadData();
                } catch (e) {
                    setModalVisible(false);
                    showModal('Error', 'No se pudo revertir el pago', 'error');
                }
            },
            'Deshacer',
            'Cancelar'
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
                    {/* Calculate dynamic values for the Selected Period */}
                    {(() => {
                        // 1. Determine Date to Display
                        let displayPayDate = new Date(summary.nextPayDate); // Default to current

                        if (selectedPeriod) {
                            const cutOff = new Date(selectedPeriod.endDate);
                            const payDay = summary.pay_day;
                            const cutDay = summary.cut_day;

                            // Calculate Pay Date relative to this Cut-Off
                            // Same logic as database.ts
                            let calculatedPayDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth(), payDay);
                            if (payDay < cutDay) {
                                // If pay day is before cut day, it's next month relative to cut off MONTH
                                // usage of getSafeDate handles month overflow
                                calculatedPayDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth() + 1, payDay);
                            }
                            displayPayDate = calculatedPayDate;
                        }

                        // 2. Determine Amount
                        // If we are in "Statement Mode" (transactions contains statement items),
                        // The total to pay is the sum of these items.
                        const totalForPeriod = transactions.reduce((sum, item) => sum + item.amount, 0);

                        return (
                            <View style={styles.row}>
                                <View>
                                    <Text style={[styles.label, { color: colors.textMuted }]}>
                                        TOTAL A PAGAR <Text style={{ fontWeight: '400' }}>({selectedPeriod ? selectedPeriod.label : 'Actual'})</Text>
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                                        <Text style={[styles.bigValue, { color: !periodStatus.isPaid && totalForPeriod > 0 ? tokens.error : colors.text }]}>
                                            {formatCurrency(totalForPeriod)}
                                        </Text>
                                    </View>
                                    <Text style={[styles.label, { color: colors.warning, fontSize: 13, marginTop: -4, marginBottom: 8 }]}>
                                        Fecha Límite: {formatDate(displayPayDate)}
                                    </Text>

                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                        {!periodStatus.isPaid && totalForPeriod > 0 && (
                                            <TouchableOpacity onPress={handlePayCutOff} style={[styles.payButton, { backgroundColor: colors.success }]}>
                                                <Text style={[styles.payButtonText, { color: '#003300' }]}>Pagar Corte</Text>
                                            </TouchableOpacity>
                                        )}

                                        {periodStatus.isPaid && (
                                            <TouchableOpacity onPress={handleRevertPayment} style={[styles.payButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error }]}>
                                                <Text style={[styles.payButtonText, { color: colors.error }]}>Deshacer Pago</Text>
                                            </TouchableOpacity>
                                        )}

                                        {periodStatus.isPaid && (
                                            <View style={[styles.payButton, { backgroundColor: colors.success + '20', borderWidth: 0 }]}>
                                                <Text style={[styles.payButtonText, { color: colors.success }]}>Pagado ✓</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })()}

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.row}>
                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>DEUDA TOTAL CARD</Text>
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
        </View >
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
