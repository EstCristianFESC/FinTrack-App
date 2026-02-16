import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors as tokens, spacing, borderRadius, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatters';

interface TransactionItemProps {
    transaction: any;
    onPress: () => void;
}

export default function TransactionItem({ transaction, onPress }: TransactionItemProps) {
    const { colors } = useTheme();

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    };

    // Ionicons mapping based on notes/name
    const getIconName = (): keyof typeof Ionicons.glyphMap => {
        const text = (transaction.notes || '').toLowerCase();
        if (text.includes('uber') || text.includes('transporte') || text.includes('gasolina') || text.includes('bus')) return 'car-outline';
        if (text.includes('comida') || text.includes('rappi') || text.includes('restaurante') || text.includes('almuerzo')) return 'fast-food-outline';
        if (text.includes('suscripcion') || text.includes('netflix') || text.includes('spotify') || text.includes('youtube')) return 'play-circle-outline';
        if (text.includes('supermercado') || text.includes('d1') || text.includes('exito') || text.includes('mercado')) return 'cart-outline';
        if (text.includes('salud') || text.includes('medico') || text.includes('farmacia')) return 'medical-outline';
        if (text.includes('ropa') || text.includes('zara') || text.includes('hm')) return 'shirt-outline';
        if (text.includes('viaje') || text.includes('vuelo') || text.includes('hotel')) return 'airplane-outline';
        if (text.includes('servicios') || text.includes('luz') || text.includes('agua') || text.includes('internet')) return 'flash-outline';
        return 'card-outline'; // Default
    };

    return (
        <TouchableOpacity
            style={[styles.container, { borderBottomColor: colors.border }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.left}>
                <View style={[styles.iconContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <Ionicons name={getIconName()} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.notes, { color: colors.text }]} numberOfLines={1}>
                        {transaction.notes || 'Compra'}
                    </Text>

                    <View style={styles.metaRow}>
                        <Text style={[styles.date, { color: colors.textMuted }]}>
                            {formatDate(transaction.date)}
                        </Text>
                        {transaction.person_name && (
                            <Text style={[styles.person, { color: colors.textSecondary }]}>
                                {' • '}{transaction.person_name}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.right}>
                <Text style={[styles.amount, { color: colors.text }]}>
                    {formatCurrency(transaction.amount)}
                </Text>
                {transaction.installments_total > 1 && (
                    <Text style={[styles.installments, { color: colors.warning }]}>
                        {transaction.installments_current}/{transaction.installments_total}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: spacing.md
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        borderWidth: 1,
    },
    notes: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
        letterSpacing: 0.2
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    person: {
        fontSize: 12,
        fontWeight: '500'
    },
    date: {
        fontSize: 12,
        fontWeight: '500'
    },
    right: {
        alignItems: 'flex-end',
        minWidth: 80
    },
    amount: {
        ...typography.amount,
        fontSize: 16,
    },
    installments: {
        fontSize: 11,
        marginTop: 2,
        fontWeight: '600',
        opacity: 0.9
    }
});
