import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeColors {
    background: string;
    cardBg: string; // Surface color
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    accent: string;
    accentLight: string; // Added for gradients
    border: string;
    inputBg: string;
    success: string;
    error: string;
    warning: string;
    shadow: string;
    highlight: string;
}

import { colors as tokens, shadows } from '../theme/designTokens';

const lightColors: ThemeColors = {
    background: tokens.background,
    cardBg: tokens.cardBg,
    text: tokens.text,
    textSecondary: tokens.textSecondary,
    textMuted: tokens.textMuted,
    primary: tokens.primary,
    accent: tokens.accent,
    accentLight: tokens.accentLight,
    border: tokens.border,
    inputBg: '#FFFFFF',
    success: tokens.success,
    error: tokens.error,
    warning: tokens.warning,
    shadow: shadows.md.shadowColor,
    highlight: tokens.primaryLight,
};

const darkColors: ThemeColors = {
    background: tokens.backgroundDark,
    cardBg: tokens.cardBgDark,
    text: tokens.textDark,
    textSecondary: tokens.textSecondaryDark,
    textMuted: tokens.textMutedDark,
    primary: tokens.accent, // In dark mode, the accent (Bright Blue/Purple) pops better as primary
    accent: tokens.accentLight,
    accentLight: tokens.primaryLight, // Use Bright Blue as lighter accent
    border: tokens.borderDark,
    inputBg: tokens.cardBgDark,
    success: tokens.success,
    error: tokens.error,
    warning: tokens.warning,
    shadow: '#000000',
    highlight: tokens.accent,
};

interface ThemeContextType {
    theme: Theme;
    colors: ThemeColors;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {

    const systemScheme = useColorScheme();
    const [themeState, setThemeState] = useState<Theme>('light'); // Default to light as requested


    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setThemeState(savedTheme);
            } else if (systemScheme) {
                // setThemeState(systemScheme);
                // Keep default dark as requested "Excellent" UI often implies dark mode initially
            }
        } catch (e) {
            console.error('Error loading theme', e);
        }
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        AsyncStorage.setItem('user_theme', newTheme).catch(e => console.error(e));
    };

    const toggleTheme = () => {
        setTheme(themeState === 'dark' ? 'light' : 'dark');
    };

    const colors = themeState === 'dark' ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ theme: themeState, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
