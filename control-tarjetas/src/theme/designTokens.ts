// Design Tokens - Deep Blue Premium Fintech Theme

export const colors = {
    // Primary Brand
    primary: '#0A2540',      // Deep Midnight Blue (Stripe-like)
    primaryLight: '#1d4ed8', // Bright Blue for interactions
    primaryDark: '#051b30',  // Darker Midnight

    // Accent
    accent: '#635BFF',       // Electric Purple/Blue
    accentLight: '#00D4FF',  // Cyan for gradients

    // Backgrounds
    background: '#F6F9FC',   // Very light blue-grey
    backgroundDark: '#0A2540', // Deep Blue background for dark mode
    cardBg: '#FFFFFF',
    cardBgDark: '#133154',   // Slightly lighter blue for cards

    // Text
    text: '#0A2540',         // Dark Blue (instead of pure black)
    textDark: '#FFFFFF',     // White
    textSecondary: '#425466', // Slate Grey
    textSecondaryDark: '#8898aa', // Light Blue-Grey
    textMuted: '#697386',    // Muted Blue-Grey
    textMutedDark: '#6b7c93', // Muted for dark mode

    // Status
    success: '#3ECF8E',      // Mint Green
    error: '#ED5F74',        // Soft Red
    warning: '#F7D154',      // Gold
    info: '#555ABF',         // Indigo

    // Borders
    border: '#E3E8EE',       // Light Grey Blue
    borderDark: '#2a4365',   // Dark Blue Border

    // Gradients
    gradientDark: ['#0A2540', '#133154'],
    gradientPrimary: ['#0A2540', '#303f9f'],
    gradientAccent: ['#635BFF', '#00D4FF'],
    gradientGold: ['#FFD700', '#FDB931'], // For premium cards
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 20, // More rounded for cards
    xl: 28,
    full: 9999,
};

export const shadows = {
    sm: {
        shadowColor: '#0A2540',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#32325d',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 10,
        elevation: 4,
    },
    lg: {
        shadowColor: '#32325d',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 10,
    },
    hover: {
        shadowColor: '#32325d',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.20,
        shadowRadius: 20,
        elevation: 8,
    }
};

export const typography = {
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        letterSpacing: -0.8,
        color: colors.text,
    },
    h2: {
        fontSize: 24,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
        color: colors.text,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
        letterSpacing: -0.2,
    },
    body: {
        fontSize: 16,
        fontWeight: '400' as const,
        lineHeight: 24,
        color: colors.textSecondary,
    },
    bodyBold: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: colors.text,
    },
    label: {
        fontSize: 11,
        fontWeight: '700' as const,
        letterSpacing: 1.2,
        textTransform: 'uppercase' as const,
        color: colors.textMuted,
    },
    small: {
        fontSize: 12,
        fontWeight: '500' as const,
        color: colors.textSecondary,
    },
    amount: {
        fontFamily: 'monospace', // Or a tabular num font if available
        fontWeight: '700' as const,
    }
};
