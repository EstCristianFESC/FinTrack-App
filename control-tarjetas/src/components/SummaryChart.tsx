import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/formatters';
import { spacing, typography } from '../theme/designTokens';

const { width } = Dimensions.get('window');

interface SummaryChartProps {
    cards: any[];
}

export default function SummaryChart({ cards }: SummaryChartProps) {
    const { colors, theme } = useTheme();

    // 1. Calculate Data for Chart
    const totalDebt = cards.reduce((sum, card) => sum + (card.totalDebt || 0), 0);
    const totalQuota = cards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
    const availableQuota = Math.max(0, totalQuota - totalDebt);

    // Calculate Indebtedness Percentage
    const indebtedness = totalQuota > 0 ? (totalDebt / totalQuota) * 100 : 0;
    const isCritical = indebtedness > 50; // Alert if used > 50%

    // If no quota (no cards or 0 limit), show empty state
    if (totalQuota === 0) {
        return (
            <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={{ alignItems: 'center', padding: 20 }}>
                    <Text style={{ ...typography.body, color: colors.textMuted }}>Sin Cupo 🤷‍♂️</Text>
                    <Text style={{ ...typography.small, color: colors.textMuted }}>Agrega tarjetas con cupo</Text>
                </View>
            </View>
        );
    }

    // Chart Data: Used vs Available
    const chartData = [
        {
            value: totalDebt,
            color: isCritical ? colors.error : colors.primary, // Red if high debt
            text: '',
            label: 'Utilizado'
        },
        {
            value: availableQuota,
            color: colors.border, // Light grey for available
            text: '',
            label: 'Disponible'
        }
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.chartRow}>
                {/* Donut Chart */}
                <View style={{ alignItems: 'center' }}>
                    <PieChart
                        data={chartData}
                        donut
                        radius={70}
                        innerRadius={50}
                        innerCircleColor={colors.cardBg}
                        centerLabelComponent={() => {
                            return (
                                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ ...typography.label, fontSize: 9, color: colors.textMuted }}>ENDEUDAMIENTO</Text>
                                    <Text style={{ ...typography.h1, fontSize: 20, color: isCritical ? colors.error : colors.success }}>
                                        {indebtedness.toFixed(1)}%
                                    </Text>
                                </View>
                            );
                        }}
                    />
                </View>

                {/* KPI Legend */}
                <View style={styles.legendContainer}>
                    <View style={styles.kpiItem}>
                        <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Cupo Total</Text>
                        <Text style={[styles.kpiValue, { color: colors.text }]}>{formatCurrency(totalQuota)}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.kpiItem}>
                        <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Utilizado</Text>
                        <Text style={[styles.kpiValue, { color: isCritical ? colors.error : colors.primary }]}>
                            {formatCurrency(totalDebt)}
                        </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.kpiItem}>
                        <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Disponible</Text>
                        <Text style={[styles.kpiValue, { color: colors.success }]}>
                            {formatCurrency(availableQuota)}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: spacing.md,
        borderWidth: 1,
        marginBottom: spacing.lg,
        overflow: 'hidden'
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    legendContainer: {
        flex: 1,
        marginLeft: spacing.lg,
        justifyContent: 'center',
        gap: 8
    },
    kpiItem: {
        marginBottom: 4
    },
    kpiLabel: {
        ...typography.label,
        fontSize: 10,
        marginBottom: 2
    },
    kpiValue: {
        ...typography.bodyBold,
        fontSize: 16
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 4
    }
});
