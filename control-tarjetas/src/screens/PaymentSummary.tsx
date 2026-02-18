import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList, SectionList } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getPaymentSummaryDetails, markPeriodAsPaid } from '../database/database';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/designTokens';

import CustomModal from '../components/CustomModal';

interface PaymentSummaryProps {
    cardId: number;
    cutOffDate: string;
    onBack: () => void;
    onPaymentSuccess: () => void;
    readonly?: boolean;
}

export default function PaymentSummary({ cardId, cutOffDate, onBack, onPaymentSuccess, readonly = false }: PaymentSummaryProps) {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

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

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            const result = await getPaymentSummaryDetails(cardId, cutOffDate, readonly);
            setData(result);
        } catch (error) {
            console.error(error);
            // Alert.alert('Error', 'No se pudo cargar el resumen');
            // Can't show modal easily in load if not rendered yet, keep simple for error or handle cleaner
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        setModalConfig({
            title: 'Confirmar Pago',
            message: `¿Marcar como pagado el total de ${formatCurrency(data.totalToPay)}?`,
            type: 'confirmation',
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            onConfirm: async () => {
                try {
                    await markPeriodAsPaid(cardId, cutOffDate);
                    setModalVisible(false);
                    // Show success success modal? Or just callback.
                    // Let's show specific success modal before navigating?
                    // Nah, let's just proceed to success callback which navigates.
                    // But user might want to see "Success".
                    onPaymentSuccess();
                } catch (error) {
                    setModalVisible(false);
                    // Show error modal if needed
                }
            }
        });
        setModalVisible(true);
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
                <Text style={[styles.title, { color: colors.text }]}>{readonly ? 'Detalle del Pago' : 'Resumen de Pago'}</Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Total Card */}
                <LinearGradient
                    colors={[colors.cardBg, colors.inputBg]}
                    style={[styles.totalCard, { borderColor: colors.border, padding: 20 }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={{ alignItems: 'center', marginBottom: 15 }}>
                        <Text style={[styles.label, { color: colors.textMuted }]}>TOTAL A PAGAR</Text>
                        <Text style={[styles.bigValue, { color: colors.text, fontSize: 36 }]}>{formatCurrency(data.totalToPay)}</Text>
                        <Text style={[styles.dateLabel, { color: colors.warning }]}>Fecha Límite: {formatDate(data.payDate)}</Text>
                    </View>

                    {/* Mini Resumen por Persona */}
                    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10, width: '100%' }}>
                        {(() => {
                            // Calcular consolidado
                            const summary: any = {};

                            // Procesar Contado
                            (data.oneShot || []).forEach((p: any) => {
                                if (!summary[p.personName]) summary[p.personName] = { oneShot: 0, deferred: 0 };
                                summary[p.personName].oneShot += p.total;
                            });

                            // Procesar Diferido
                            (data.installments || []).forEach((p: any) => {
                                if (!summary[p.personName]) summary[p.personName] = { oneShot: 0, deferred: 0 };
                                summary[p.personName].deferred += p.total;
                            });

                            return Object.keys(summary).map((name, idx) => {
                                const s = summary[name];
                                const totalPerson = s.oneShot + s.deferred;
                                return (
                                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{name}</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>{formatCurrency(totalPerson)}</Text>
                                            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                                                (1C: {formatCurrency(s.oneShot)} | Dif: {formatCurrency(s.deferred)})
                                            </Text>
                                        </View>
                                    </View>
                                );
                            });
                        })()}
                    </View>
                </LinearGradient>

                {/* Section: Compras del Corte (1 Cuota) */}
                {data.oneShot && data.oneShot.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10, paddingHorizontal: 16 }]}>Gastos del Corte (1 Cuota)</Text>
                        {data.oneShot.map((person: any, index: number) => (
                            <View key={`os-${index}`} style={{ marginBottom: 16 }}>
                                <View style={[styles.personHeader, { backgroundColor: colors.background, paddingTop: 10, paddingHorizontal: 16 }]}>
                                    <Text style={[styles.personName, { color: colors.text }]}>{person.personName}</Text>
                                    <Text style={[styles.personTotal, { color: colors.primary }]}>{formatCurrency(person.total)}</Text>
                                </View>
                                {person.items.map((item: any, idx: number) => (
                                    <View key={`os-item-${idx}`} style={[styles.itemRow, { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingHorizontal: 16 }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.itemNotes, { color: colors.text }]}>{item.purchase_notes || 'Compra'}</Text>
                                            <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(item.purchase_date)}</Text>
                                        </View>
                                        <Text style={[styles.itemAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                {/* Section: Cuotas Diferidas (> 1 Cuota) */}
                {data.installments && data.installments.length > 0 && (
                    <View style={{ marginTop: 20 }}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10, paddingHorizontal: 16 }]}>Cuotas Diferidas</Text>
                        {data.installments.map((person: any, index: number) => (
                            <View key={`inst-${index}`} style={{ marginBottom: 16 }}>
                                <View style={[styles.personHeader, { backgroundColor: colors.background, paddingTop: 10, paddingHorizontal: 16 }]}>
                                    <Text style={[styles.personName, { color: colors.text }]}>{person.personName}</Text>
                                    <Text style={[styles.personTotal, { color: colors.primary }]}>{formatCurrency(person.total)}</Text>
                                </View>
                                {person.items.map((item: any, idx: number) => (
                                    <View key={`inst-item-${idx}`} style={[styles.itemRow, { paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingHorizontal: 16 }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.itemNotes, { color: colors.text }]}>
                                                {item.purchase_notes || 'Compra'}
                                                {` (Cuota ${item.installment_number}/${item.installments_total})`}
                                            </Text>
                                            <Text style={[styles.itemDate, { color: colors.textMuted }]}>{formatDate(item.purchase_date)}</Text>
                                        </View>
                                        <Text style={[styles.itemAmount, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {!readonly && (
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
            )}

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
