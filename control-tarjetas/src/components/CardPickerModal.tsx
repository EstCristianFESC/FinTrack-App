import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';

const { width } = Dimensions.get('window');

interface CardPickerModalProps {
    visible: boolean;
    cards: any[];
    onClose: () => void;
    onSelectCard: (cardId: number) => void;
    onAddNewCard: () => void;
}

export default function CardPickerModal({ visible, cards, onClose, onSelectCard, onAddNewCard }: CardPickerModalProps) {
    const { colors, theme } = useTheme();

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Selecciona una Tarjeta</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        ¿Con qué tarjeta hiciste el gasto?
                    </Text>

                    <FlatList
                        data={cards}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.cardItem, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }]}
                                onPress={() => {
                                    onSelectCard(item.id);
                                    onClose();
                                }}
                            >
                                <View style={styles.cardIcon}>
                                    <Ionicons name="card" size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.cardBank, { color: colors.textMuted }]}>
                                        {item.bank} • •••{item.last_four_digits || '****'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    />

                    <TouchableOpacity
                        style={[styles.addNewButton, { borderTopColor: colors.border }]}
                        onPress={() => {
                            onAddNewCard();
                            onClose();
                        }}
                    >
                        <View style={[styles.addIcon, { backgroundColor: colors.accent }]}>
                            <Ionicons name="add" size={20} color="white" />
                        </View>
                        <Text style={[styles.addNewText, { color: colors.accent }]}>Nueva Tarjeta</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        maxHeight: '70%',
        minHeight: 300,
        borderWidth: 1,
        borderBottomWidth: 0,
        ...shadows.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    title: {
        ...typography.h3,
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        ...typography.body,
        marginBottom: spacing.lg,
    },
    list: {
        paddingBottom: spacing.md,
    },
    cardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: borderRadius.md,
        marginBottom: 10,
    },
    cardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardName: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    cardBank: {
        fontSize: 12,
    },
    addNewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: spacing.lg,
        marginTop: spacing.sm,
        borderTopWidth: 1,
    },
    addIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    addNewText: {
        fontWeight: 'bold',
        fontSize: 16,
    }
});
