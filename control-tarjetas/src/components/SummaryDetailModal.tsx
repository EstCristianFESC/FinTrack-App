import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { spacing, shadows, typography, borderRadius } from '../theme/designTokens';
import { formatCurrency } from '../utils/formatters';
import { getPaymentSummaryDetails, getDb } from '../database/database';

const { width, height } = Dimensions.get('window');

interface SummaryDetailModalProps {
    visible: boolean;
    onClose: () => void;
    type: 'next_payment' | 'total_debt';
    cards: any[];
}

export default function SummaryDetailModal({ visible, onClose, type, cards }: SummaryDetailModalProps) {
    const { colors, theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any[]>([]);
    const [personBreakdown, setPersonBreakdown] = useState<any[]>([]);

    useEffect(() => {
        if (visible) {
            loadDetails();
        }
    }, [visible, type, cards]);

    const loadDetails = async () => {
        setLoading(true);
        try {
            if (type === 'next_payment') {
                // For "Next Payment", we need to aggregate who owes what for the UPCOMING cuts.
                // We iterate over relevant cards (those with paymentForIssue > 0)
                const relevantCards = cards.filter(c => (c.paymentForIssue || 0) > 0);

                let allPeopleMap: any = {};

                for (const card of relevantCards) {
                    if (card.nextCutOffDate) {
                        try {
                            const summary = await getPaymentSummaryDetails(card.id, new Date(card.nextCutOffDate).toISOString());

                            // Merge into people map (Combine OneShot + Installments)
                            const allItems = [...(summary.oneShot || []), ...(summary.installments || [])];

                            allItems.forEach((p: any) => {
                                if (!allPeopleMap[p.personName]) {
                                    allPeopleMap[p.personName] = { name: p.personName, total: 0, items: [] };
                                }
                                allPeopleMap[p.personName].total += p.total;
                                // Add card info to items
                                p.items.forEach((item: any) => {
                                    allPeopleMap[p.personName].items.push({ ...item, cardName: card.name, bank: card.bank });
                                });
                            });
                        } catch (e) {
                            console.error("Error fetching detail for card", card.id, e);
                        }
                    }
                }

                setPersonBreakdown(Object.values(allPeopleMap).sort((a: any, b: any) => b.total - a.total));

            } else {
                // For "Total Debt", we calculate capital pending per person
                // This logic needs a new DB query or we can approximate/fetch all unpaid installments
                // For simplicity/speed in this iteration, let's execute a custom query here
                const db = getDb();

                // Fetch ALL unpaid capital grouped by person
                const result = await db.getAllAsync<{ person_name: string, total_capital: number }>(`
                    SELECT 
                        IFNULL(pe.name, 'Yo') as person_name,
                        SUM(i.capital) as total_capital
                    FROM installments i
                    JOIN purchases p ON i.purchase_id = p.id
                    LEFT JOIN people pe ON p.person_id = pe.id
                    WHERE i.paid = 0
                    GROUP BY pe.name
                    ORDER BY total_capital DESC
                `);

                setPersonBreakdown(result.map(r => ({ name: r.person_name, total: r.total_capital, items: [] })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = personBreakdown.reduce((sum, p) => sum + p.total, 0);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
                <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>

                    {/* Handle Bar */}
                    <View style={{ alignItems: 'center', paddingTop: 10 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                    </View>

                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.label, { color: colors.textMuted }]}>
                                {type === 'next_payment' ? 'PRÓXIMO PAGO' : 'DEUDA TOTAL'}
                            </Text>
                            <Text style={[styles.bigTotal, { color: colors.text }]}>
                                {formatCurrency(totalAmount)}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close-circle" size={30} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                        Desglose por Persona
                    </Text>

                    {loading ? (
                        <View style={{ padding: 40 }}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                            {personBreakdown.length === 0 ? (
                                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textMuted }}>
                                    No hay datos para mostrar.
                                </Text>
                            ) : (
                                personBreakdown.map((person, index) => (
                                    <View key={index} style={[styles.personRow, { borderBottomColor: colors.border }]}>
                                        <View style={styles.personInfo}>
                                            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                                                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                                                    {person.name[0].toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text style={[styles.personName, { color: colors.text }]}>
                                                {person.name}
                                            </Text>
                                        </View>
                                        <Text style={[styles.personTotal, { color: colors.text }]}>
                                            {formatCurrency(person.total)}
                                        </Text>
                                    </View>
                                ))
                            )}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        height: '60%',
        ...shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.label,
        fontSize: 12,
        marginBottom: 4,
    },
    bigTotal: {
        ...typography.h1,
        fontSize: 32,
    },
    closeBtn: {
        padding: 4,
    },
    sectionHeader: {
        ...typography.bodyBold,
        marginBottom: spacing.md,
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    scroll: {
        flex: 1,
    },
    personRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    personInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    personName: {
        ...typography.bodyBold,
        fontSize: 16,
    },
    personTotal: {
        ...typography.amount,
        fontSize: 16,
        fontWeight: 'bold',
    }
});
