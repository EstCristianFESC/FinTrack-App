import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { getCards, getCardSummary } from '../database/database';
import CreditCard from '../components/CreditCard';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase/firebaseConfig';
import { formatCurrency } from '../utils/formatters';
import { getUserProfile } from '../database/userProfile';

interface DashboardProps {
    onNavigate: (screen: string, params?: any) => void;
    onLogout: () => void;
}

export default function Dashboard({ onNavigate, onLogout }: DashboardProps) {
    const { colors, theme } = useTheme();
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('Usuario');

    const loadData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile && profile.display_name) {
                    setUserName(profile.display_name);
                } else {
                    setUserName(user.displayName || user.email?.split('@')[0] || 'Usuario');
                }
            }

            const loadedCards = await getCards();

            // Enrich cards with summary data (paymentForIssue, totalDebt, etc.)
            const enrichedCards = await Promise.all(
                loadedCards.map(async (card: any) => {
                    const summary = await getCardSummary(card.id);
                    const merged = { ...card, ...(summary || {}) };
                    return merged;
                })
            );

            setCards(enrichedCards);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);


    const totalToPay = Math.round(cards.reduce((sum, card) => sum + (card.paymentForIssue || 0), 0));
    const totalDebt = Math.round(cards.reduce((sum, card) => sum + (card.totalDebt || 0), 0));

    // Calculate nearest payment date
    let nearestPayDate: Date | null = null;
    const cardsWithPayment = cards.filter(c => (c.paymentForIssue || 0) > 0);

    if (cardsWithPayment.length > 0) {
        // Find the earliest date
        nearestPayDate = cardsWithPayment.reduce((minDate, card) => {
            const cardDate = new Date(card.nextPayDate); // Ensure it's a Date object
            return !minDate || cardDate < minDate ? cardDate : minDate;
        }, null as Date | null);
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Area */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: colors.textMuted }]}>Bienvenido a FinTrack,</Text>
                    <Text style={[styles.title, { color: colors.text }]}>{userName}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                        onPress={() => onNavigate('Settings')}
                    >
                        <Ionicons name="person-circle-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => onNavigate('AddCard')}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary Block */}
            {cards.length > 0 && (
                <View style={styles.summaryContainer}>
                    <LinearGradient
                        colors={theme === 'dark' ? ['#133154', '#0A2540'] : ['#FFFFFF', '#F3F4F6']}
                        style={[styles.summaryCard, { borderColor: colors.border }]}
                    >
                        <View style={styles.summaryRow}>
                            <View style={styles.summaryItem}>
                                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>PROXIMO PAGO</Text>
                                <View>
                                    <Text style={[styles.summaryValue, { color: colors.error }]}>
                                        {formatCurrency(totalToPay)}
                                    </Text>
                                    {nearestPayDate && totalToPay > 0 && (
                                        <Text style={{ ...typography.small, color: colors.textMuted, marginTop: 4 }}>
                                            Vence: {nearestPayDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                            <View style={styles.summaryItemRight}>
                                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>PAGO TOTAL</Text>
                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                    {formatCurrency(totalDebt)}
                                </Text>
                            </View>
                        </View>

                    </LinearGradient>
                </View>
            )}

            {/* Cards List */}
            <FlatList
                data={cards}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => onNavigate('CardDetail', { cardId: item.id })}
                        style={styles.cardWrapper}
                    >
                        <CreditCard card={item} />
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadData} tintColor={colors.primary} />
                }
                ListHeaderComponent={
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Mis Tarjetas</Text>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No tienes tarjetas registradas.</Text>
                        <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Agrega una para comenzar.</Text>
                    </View>
                }
            />
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
        paddingTop: spacing.lg, // Reduced from spacing.xxl + 10
        paddingBottom: spacing.lg,
    },
    greeting: {
        ...typography.small,
        marginBottom: 2,
    },
    title: {
        ...typography.h2,
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
    summaryContainer: {
        marginBottom: spacing.xl,
    },
    summaryCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        ...shadows.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryItem: {
        flex: 1,
    },
    summaryItemRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    summaryLabel: {
        ...typography.label,
        marginBottom: spacing.xs,
    },
    summaryValue: {
        ...typography.h2,
        fontSize: 22,
    },
    summaryDivider: {
        width: 1,
        height: 40,
        marginHorizontal: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    cardWrapper: {
        marginBottom: spacing.md,
        ...shadows.md, // Add shadow to the interaction wrapper of the card
        borderRadius: 16, // Match card radius
    },
    list: {
        paddingBottom: spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: spacing.xxl,
    },
    emptyText: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    emptySubtext: {
        ...typography.body,
        textAlign: 'center',
    },
});
