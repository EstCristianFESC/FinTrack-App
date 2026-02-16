import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { colors as tokens, borderRadius, spacing, shadows } from '../theme/designTokens';
import { formatCurrency } from '../utils/formatters';

const { width } = Dimensions.get('window');
// Standard credit card aspect ratio is 1.586
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = 200;

interface CreditCardProps {
    card: {
        name: string;
        bank?: string;
        credit_limit: number;
        availableCredit: number;
        cut_day: number;
        pay_day: number;
        last_four_digits?: string;
        expiry_date?: string;
        card_type?: string;
    };
    onPress?: () => void;
}

export default function CreditCard({ card }: CreditCardProps) {
    const { colors } = useTheme();

    const getLogo = () => {
        const type = (card.card_type || 'visa').toLowerCase();

        if (type.includes('mastercard') || type.includes('mc')) {
            return (
                <View style={styles.mcContainer}>
                    <View style={[styles.mcCircle, { backgroundColor: '#EB001B' }]} />
                    <View style={[styles.mcCircle, { backgroundColor: '#F79E1B', right: 0 }]} />
                </View>
            );
        }

        if (type.includes('amex') || type.includes('american')) {
            return (
                <View style={styles.amexContainer}>
                    <Text style={styles.amexText}>AMERICAN EXPRESS</Text>
                </View>
            );
        }

        if (type.includes('diners')) {
            return (
                <View style={{ alignItems: 'flex-start' }}>
                    <Text style={[styles.visaText, { fontSize: 14 }]}>Diners Club</Text>
                    <Text style={[styles.visaText, { fontSize: 8 }]}>INTERNATIONAL</Text>
                </View>
            );
        }

        // Default Visa
        return <Text style={styles.visaText}>VISA</Text>;
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1c1c1e', '#2c2c2e', '#3a3a3c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.topRow}>
                    <Text style={styles.bankName}>{card.bank || 'Banco'}</Text>
                    {getLogo()}
                </View>

                <View style={styles.chipContainer}>
                    <View style={styles.chip} />
                    <Text style={styles.contactless}>)))</Text>
                </View>

                <View style={styles.numberContainer}>
                    <Text style={styles.cardNumber}>
                        •••• •••• •••• <Text style={{ color: '#fff' }}>{card.last_four_digits || '0000'}</Text>
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <View>
                        <Text style={styles.label}>TITULAR</Text>
                        <Text style={styles.holderName} numberOfLines={1}>{card.name.toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>DISPONIBLE</Text>
                        <Text style={styles.availableAmount}>{formatCurrency(card.availableCredit)}</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        height: CARD_HEIGHT,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bankName: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        opacity: 0.9,
    },
    visaText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 24,
        fontStyle: 'italic',
    },
    mcContainer: {
        width: 44,
        height: 30,
        position: 'relative',
    },
    mcCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        position: 'absolute',
        opacity: 0.8,
    },
    amexContainer: {
        backgroundColor: '#2E77BC',
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 4,
    },
    amexText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Diners Style
    dinersContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    dinersText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '300',
        letterSpacing: 1
    },
    chipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    chip: {
        width: 40,
        height: 30,
        backgroundColor: '#FFD700', // Gold
        borderRadius: 6,
        marginRight: 10,
        opacity: 0.8,
    },
    contactless: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 18,
        transform: [{ rotate: '90deg' }],
    },
    numberContainer: {
        marginTop: 10,
    },
    cardNumber: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 20,
        letterSpacing: 2,
        fontWeight: '500', // Added font weight
        // fontFamily: 'monospace', // Removed to avoid potential loading issues if font not linked, system mono is usually auto
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 2,
        letterSpacing: 1,
    },
    holderName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
        maxWidth: 150,
    },
    availableAmount: {
        color: '#4ade80',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
