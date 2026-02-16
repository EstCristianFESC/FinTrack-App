// Card type icons and utilities
export type CardType = 'visa' | 'mastercard' | 'amex' | 'diners';

export const CARD_TYPES: { value: CardType; label: string; icon: string }[] = [
    { value: 'visa', label: 'Visa', icon: '💳' },
    { value: 'mastercard', label: 'Mastercard', icon: '💳' },
    { value: 'amex', label: 'American Express', icon: '💳' },
    { value: 'diners', label: 'Diners Club', icon: '💳' },
];

export function getCardIcon(cardType: CardType): string {
    const card = CARD_TYPES.find(c => c.value === cardType);
    return card?.icon || '💳';
}

export function getCardLabel(cardType: CardType): string {
    const card = CARD_TYPES.find(c => c.value === cardType);
    return card?.label || 'Tarjeta';
}

// Card colors based on type
export function getCardGradient(cardType: CardType): string[] {
    switch (cardType) {
        case 'visa':
            return ['#1A1F71', '#2E3192'];
        case 'mastercard':
            return ['#EB001B', '#F79E1B'];
        case 'amex':
            return ['#006FCF', '#0099CC'];
        case 'diners':
            return ['#0079BE', '#00A3E0'];
        default:
            return ['#8B5CF6', '#EC4899'];
    }
}
