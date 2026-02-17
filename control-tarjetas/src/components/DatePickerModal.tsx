import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../theme/designTokens';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    initialDate?: Date;
    title?: string;
}

export default function DatePickerModal({ visible, onClose, onSelect, initialDate, title = 'Seleccionar Fecha' }: DatePickerModalProps) {
    const { colors } = useTheme();
    // Ensure initialDate is valid, otherwise use today
    const validInitialDate = initialDate && !isNaN(initialDate.getTime()) ? initialDate : new Date();

    const [selectedDate, setSelectedDate] = useState(validInitialDate);
    const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
    const [displayDate, setDisplayDate] = useState(validInitialDate); // For navigation without selecting

    useEffect(() => {
        if (visible) {
            const dateToUse = initialDate && !isNaN(initialDate.getTime()) ? initialDate : new Date();
            setSelectedDate(dateToUse);
            setDisplayDate(dateToUse);
            setViewMode('day');
        }
    }, [visible, initialDate]);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const generateYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        // Show range: current - 10 to current + 2
        for (let i = currentYear - 10; i <= currentYear + 2; i++) {
            years.push(i);
        }
        return years;
    };

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay(); // 0 = Sunday
    };

    const handleDaySelect = (day: number) => {
        const newDate = new Date(displayDate);
        newDate.setDate(day);
        setSelectedDate(newDate);
        // Don't close immediately, let user confirm
    };

    const handleMonthSelect = (monthIndex: number) => {
        const newDate = new Date(displayDate);
        newDate.setMonth(monthIndex);
        setDisplayDate(newDate);
        setViewMode('day');
    };

    const handleYearSelect = (year: number) => {
        const newDate = new Date(displayDate);
        newDate.setFullYear(year);
        setDisplayDate(newDate);
        setViewMode('month');
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(displayDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setDisplayDate(newDate);
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{title}</Text>
                <TouchableOpacity onPress={() => setViewMode('year')}>
                    <Text style={[styles.yearText, { color: colors.primary }]}>
                        {displayDate.getFullYear()}
                    </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setViewMode('month')}>
                        <Text style={[styles.dateText, { color: colors.text }]}>
                            {months[displayDate.getMonth()]}
                        </Text>
                    </TouchableOpacity>
                    <Text style={[styles.dateText, { color: colors.text }]}> </Text>
                    <Text style={[styles.dateText, { color: colors.text }]}>
                        {selectedDate.getDate()}
                    </Text>
                </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
        </View>
    );

    const renderDays = () => {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month); // 0 Sun, 1 Mon...

        // Adjust grid for empty slots
        const emptySlots = Array.from({ length: firstDay }, (_, i) => i);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
            <View>
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.monthTitle, { color: colors.text }]}>
                        {months[month]} {year}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <View style={styles.weekHeader}>
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <Text key={i} style={[styles.weekText, { color: colors.textMuted }]}>{d}</Text>
                    ))}
                </View>

                <View style={styles.gridContainer}>
                    {emptySlots.map(i => <View key={`empty-${i}`} style={styles.gridItem} />)}
                    {days.map(day => {
                        const isSelected = selectedDate.getDate() === day &&
                            selectedDate.getMonth() === month &&
                            selectedDate.getFullYear() === year;
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.gridItem,
                                    isSelected && { backgroundColor: colors.primary, borderRadius: 20 }
                                ]}
                                onPress={() => handleDaySelect(day)}
                            >
                                <Text style={[
                                    styles.gridText,
                                    { color: colors.text },
                                    isSelected && { color: 'white', fontWeight: 'bold' }
                                ]}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderMonths = () => (
        <ScrollView style={{ maxHeight: 300 }}>
            <View style={styles.listContainer}>
                {months.map((m, index) => (
                    <TouchableOpacity
                        key={m}
                        style={[
                            styles.listItem,
                            displayDate.getMonth() === index && { backgroundColor: colors.cardBg, borderColor: colors.primary, borderWidth: 1 }
                        ]}
                        onPress={() => handleMonthSelect(index)}
                    >
                        <Text style={[
                            styles.listText,
                            { color: colors.text },
                            displayDate.getMonth() === index && { color: colors.primary, fontWeight: 'bold' }
                        ]}>
                            {m}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    const renderYears = () => (
        <ScrollView style={{ maxHeight: 300 }}>
            <View style={styles.listContainer}>
                {generateYears().map(year => (
                    <TouchableOpacity
                        key={year}
                        style={[
                            styles.listItem,
                            displayDate.getFullYear() === year && { backgroundColor: colors.cardBg, borderColor: colors.primary, borderWidth: 1 }
                        ]}
                        onPress={() => handleYearSelect(year)}
                    >
                        <Text style={[
                            styles.listText,
                            { color: colors.text },
                            displayDate.getFullYear() === year && { color: colors.primary, fontWeight: 'bold' }
                        ]}>
                            {year}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: colors.cardBg }]}>
                    {renderHeader()}

                    <View style={styles.content}>
                        {viewMode === 'day' && renderDays()}
                        {viewMode === 'month' && renderMonths()}
                        {viewMode === 'year' && renderYears()}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={{ color: colors.textMuted }}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                            onPress={() => {
                                onSelect(selectedDate);
                                onClose();
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Aceptar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: borderRadius.xl,
        padding: 20,
        ...shadows.lg,
    },
    header: {
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    subtitle: {
        fontSize: 12,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    yearText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2
    },
    dateText: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    content: {
        minHeight: 320,
        marginBottom: 10
    },
    monthNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    navBtn: {
        padding: 5
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: '600'
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 5
    },
    weekText: {
        width: 40,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600'
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    gridItem: {
        width: '14.28%', // 100% / 7
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridText: {
        fontSize: 14
    },
    listContainer: {
        gap: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    listItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: borderRadius.full,
        width: '45%',
        alignItems: 'center'
    },
    listText: {
        fontSize: 16
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
        alignItems: 'center',
        marginTop: 10
    },
    cancelButton: {
        padding: 10
    },
    confirmButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: borderRadius.lg
    },
    closeIcon: {
        padding: 5
    }
});
