import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActionSheetIOS, Platform, Image } from 'react-native';
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

import CardPickerModal from '../components/CardPickerModal';
import SummaryChart from '../components/SummaryChart';
import SummaryDetailModal from '../components/SummaryDetailModal';
import { registerForPushNotificationsAsync, schedulePaymentReminders } from '../services/notificationService';

interface DashboardProps {
    onNavigate: (screen: string, params?: any) => void;
    onLogout: () => void;
}

export default function Dashboard({ onNavigate, onLogout }: DashboardProps) {
    const { colors, theme } = useTheme();
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('Usuario');
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [cardPickerVisible, setCardPickerVisible] = useState(false);

    // Summary Detail Modal State
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'next_payment' | 'total_debt'>('next_payment');

    useEffect(() => {
        registerForPushNotificationsAsync();
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Helper to schedule reminders based on loaded cards
    const updateReminders = (cardsData: any[]) => {
        cardsData.forEach(card => {
            // Only schedule if there is something to pay and date is valid
            if ((card.paymentForIssue || 0) > 0 && card.nextCutOffDate) {
                // Determine target Pay Date
                // We reuse logic from getCardSummary or just use the nextPayDate if available
                if (card.nextPayDate) {
                    schedulePaymentReminders(card.name, new Date(card.nextPayDate), card.id);
                }
            }
        });
    };

    const loadData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const profile = await getUserProfile(user.uid);
                if (profile) {
                    if (profile.display_name) setUserName(profile.display_name);
                    if (profile.photo_url) setUserPhoto(profile.photo_url);
                } else {
                    setUserName(user.displayName || user.email?.split('@')[0] || 'Usuario');
                    setUserPhoto(user.photoURL);
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
            updateReminders(enrichedCards);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalToPay = Math.round(cards.reduce((sum, card) => sum + (card.paymentForIssue || 0), 0));
    const totalDebt = Math.round(cards.reduce((sum, card) => sum + (card.totalDebt || 0), 0));

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
                        style={[styles.actionButton, { backgroundColor: colors.cardBg, borderColor: colors.border, overflow: 'hidden' }]}
                        onPress={() => onNavigate('Settings')}
                    >
                        {userPhoto ? (
                            <Image source={{ uri: userPhoto }} style={styles.profileImage} />
                        ) : (
                            <Ionicons name="person-circle-outline" size={24} color={colors.text} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                        onPress={() => onNavigate('AddCard')}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary Block - Interactive */}
            {cards.length > 0 && (
                <View style={styles.summaryContainer}>
                    {/* Visual Analytics Chart */}
                    <SummaryChart cards={cards} />

                    {/* Interactive Totals Row */}
                    <View style={styles.summaryRow}>
                        <TouchableOpacity
                            style={[styles.summaryItemBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                            onPress={() => {
                                setModalType('next_payment');
                                setDetailModalVisible(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>PRÓXIMO PAGO</Text>
                            <Text style={[styles.summaryValue, { color: colors.error }]}>
                                {formatCurrency(totalToPay)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Text style={{ fontSize: 10, color: colors.primary, marginRight: 4 }}>Ver detalle</Text>
                                <Ionicons name="arrow-forward" size={10} color={colors.primary} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.summaryItemBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                            onPress={() => {
                                setModalType('total_debt');
                                setDetailModalVisible(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>DEUDA GLOBAL</Text>
                            <Text style={[styles.summaryValue, { color: colors.text }]}>
                                {formatCurrency(totalDebt)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <Text style={{ fontSize: 10, color: colors.primary, marginRight: 4 }}>Ver detalle</Text>
                                <Ionicons name="arrow-forward" size={10} color={colors.primary} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Detail Modal */}
            <SummaryDetailModal
                visible={detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                type={modalType}
                cards={cards}
            />

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

            {/* Floating Action Button (FAB) */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
                onPress={() => {
                    // 1. If no cards, go directly to AddCard
                    if (cards.length === 0) {
                        onNavigate('AddCard');
                        return;
                    }

                    // 2. If has cards, initiate selection
                    if (Platform.OS === 'ios') {
                        const options = [
                            'Cancelar',
                            ...cards.map(c => `${c.name} (${c.bank})`),
                            'Nueva Tarjeta 💳'
                        ];
                        const cancelButtonIndex = 0;

                        ActionSheetIOS.showActionSheetWithOptions(
                            {
                                options,
                                cancelButtonIndex,
                                title: 'Selecciona una Tarjeta',
                                message: '¿Con qué tarjeta hiciste el gasto?',
                                userInterfaceStyle: theme === 'dark' ? 'dark' : 'light'
                            },
                            buttonIndex => {
                                if (buttonIndex === 0) return; // Cancel

                                if (buttonIndex === options.length - 1) {
                                    onNavigate('AddCard');
                                } else {
                                    // Map button index to card (subtract 1 for cancel button)
                                    const selectedCard = cards[buttonIndex - 1];
                                    if (selectedCard) {
                                        onNavigate('AddTransaction', { cardId: selectedCard.id });
                                    }
                                }
                            },
                        );
                    } else {
                        // Android: Show custom modal
                        setCardPickerVisible(true);
                    }
                }}
                activeOpacity={0.8}
            >
                <Ionicons name="wallet" size={30} color="white" />
            </TouchableOpacity>

            <CardPickerModal
                visible={cardPickerVisible}
                cards={cards}
                onClose={() => setCardPickerVisible(false)}
                onSelectCard={(cardId) => onNavigate('AddTransaction', { cardId })}
                onAddNewCard={() => onNavigate('AddCard')}
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
        paddingTop: spacing.lg,
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        gap: 12
    },
    summaryItemBox: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        ...shadows.sm,
        alignItems: 'center',
        justifyContent: 'center'
    },
    summaryLabel: {
        ...typography.label,
        fontSize: 10,
        marginBottom: 4,
    },
    summaryValue: {
        ...typography.h3,
        fontSize: 18,
        fontWeight: 'bold'
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    cardWrapper: {
        marginBottom: spacing.md,
        ...shadows.md,
        borderRadius: 16,
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
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        zIndex: 100,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    }
});
