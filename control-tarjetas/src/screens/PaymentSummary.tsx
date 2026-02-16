import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getPaymentSummaryDetails, markPeriodAsPaid } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/designTokens';

interface PaymentSummaryProps {
    cardId: number;
    cutOffDate: string;
    onBack: () => void;
    onPaymentSuccess: () => void;
}

export default function PaymentSummary({ cardId, cutOffDate, onBack, onPaymentSuccess }: PaymentSummaryProps) {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            const result = await getPaymentSummaryDetails(cardId, cutOffDate);
            setData(result);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo cargar el resumen');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        Alert.alert(
            'Confirmar Pago',
            `¿Marcar como pagado el total de ${formatCurrency(data.totalToPay)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            await markPeriodAsPaid(cardId, cutOffDate);
                            Alert.alert('Éxito', 'Pago registrado correctamente');
                            onPaymentSuccess();
                        } catch (error) {
                            Alert.alert('Error', 'Falló el registro del pago');
                        }
                    }
                }
            ]
        );
    };

    const formatCurrency = (amount: number) => {
        return '$' + Math.round(amount).toLocaleString('es-CO');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (!data) return null;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Text style={[styles.backText, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Resumen de Pago</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Total Card */}
                <LinearGradient
                    colors={[colors.cardBg, colors.inputBg]}
                    style={[styles.totalCard, { borderColor: colors.border }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={[styles.label, { color: colors.textMuted }]}>TOTAL A PAGAR</Text>
                    <Text style={[styles.bigValue, { color: colors.text }]}>{formatCurrency(data.totalToPay)}</Text>
                    <Text style={[styles.dateLabel, { color: colors.warning }]}>Fecha Límite: {formatDate(data.payDate)}</Text>
                </LinearGradient>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Desglose por Persona</Text>

                {data.byPerson.map((person: any, index: number) => (
                    <View key={index} style={[styles.personCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <View style={styles.personHeader}>
                            <Text style={[styles.personName, { color: colors.text }]}>{person.personName}</Text>
                            <Text style={[styles.personTotal, { color: colors.primary }]}>{formatCurrency(person.total)}</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {person.items.map((item: any, idx: number) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemNotes, { color: colors.text }]}>{item.purchase_notes || 'Compra'}</Text>
                                    <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                                        {formatDate(item.purchase_date)} • Cuota {item.installment_number}/{item.installments_total}
                                    </Text>
                                </View>
                                <Text style={[styles.itemAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.payButton} onPress={handleConfirmPayment}>
                    <LinearGradient
                        colors={['#22c55e', '#16a34a']}
                        style={styles.payGradient}
                    >
                        <Text style={styles.payButtonText}>Registrar Pago</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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
        marginBottom: 24,
        // marginTop: spacing.xxl
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        marginRight: 16,
        borderWidth: 1,
    },
    backText: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    totalCard: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 1
    },
    bigValue: {
        fontSize: 40,
        fontWeight: 'bold',
        marginBottom: 8
    },
    dateLabel: {
        fontSize: 14,
        fontWeight: '500'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16
    },
    personCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    personHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    personName: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    personTotal: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    divider: {
        height: 1,
        marginBottom: 12
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    itemNotes: {
        fontSize: 14,
        fontWeight: '500'
    },
    itemDate: {
        fontSize: 12,
        marginTop: 2
    },
    itemAmount: {
        fontSize: 14,
        fontWeight: '600'
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20
    },
    payButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: "#22c55e",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8
    },
    payGradient: {
        paddingVertical: 18,
        alignItems: 'center'
    },
    payButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
