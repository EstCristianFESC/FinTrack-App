/**
 * Format a number as Colombian Pesos currency.
 * Rounds to the nearest integer and uses dots for thousands.
 * e.g. 50000 -> $50.000
 */
export const formatCurrency = (amount: number): string => {
    // Round to avoid decimals which are rarely used in daily COP transactions
    const rounded = Math.round(amount);
    return '$' + rounded.toLocaleString('es-CO');
};
