/**
 * Format a number as Colombian Pesos currency.
 * Rounds to the nearest integer and uses dots for thousands.
 * e.g. 50000 -> $50.000
 */
export const formatCurrency = (amount: number): string => {
    // Round to avoid decimals which are rarely used in daily COP transactions
    const rounded = Math.round(amount);
    return '$ ' + rounded.toLocaleString('es-CO');
};

/**
 * Formats a numeric input string with thousands separators.
 * Removes non-numeric characters first.
 * e.g. "10000" -> "10.000"
 */
export const formatNumberInput = (text: string): string => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) return '';
    return parseInt(cleaned).toLocaleString('es-CO');
};

/**
 * Parses a formatted numeric string back to a number.
 * e.g. "10.000" -> 10000
 */
export const parseCurrencyInput = (text: string): number => {
    const cleaned = text.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned) : 0;
};
