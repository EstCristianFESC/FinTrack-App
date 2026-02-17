// Delete functions with authentication
import { getDb } from './database';
import { authenticateUser } from '../utils/authenticateUser';
import { Alert } from 'react-native';

export async function deleteTransaction(transactionId: number): Promise<boolean> {
    const authenticated = await authenticateUser();

    if (!authenticated) {
        Alert.alert('Cancelado', 'Autenticación fallida');
        return false;
    }

    try {
        const db = getDb();
        await db.runAsync('DELETE FROM purchases WHERE id = ?', [transactionId]);
        return true;
    } catch (error) {
        console.error('Error deleting transaction:', error);
        Alert.alert('Error', 'No se pudo eliminar la transacción');
        return false;
    }
}

export async function deleteCard(cardId: number): Promise<boolean> {
    const authenticated = await authenticateUser();

    if (!authenticated) {
        Alert.alert('Cancelado', 'Autenticación fallida');
        return false;
    }

    try {
        const db = getDb();
        // Delete related data first
        // Installments are linked to purchases, not directly to cards
        await db.runAsync('DELETE FROM installments WHERE purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)', [cardId]);
        await db.runAsync('DELETE FROM purchases WHERE card_id = ?', [cardId]);
        await db.runAsync('DELETE FROM cards WHERE id = ?', [cardId]);
        return true;
    } catch (error) {
        console.error('Error deleting card:', error);
        Alert.alert('Error', 'No se pudo eliminar la tarjeta');
        return false;
    }
}

export async function deleteInstallment(installmentId: number): Promise<boolean> {
    const authenticated = await authenticateUser();

    if (!authenticated) {
        Alert.alert('Cancelado', 'Autenticación fallida');
        return false;
    }

    try {
        const db = getDb();
        await db.runAsync('DELETE FROM installments WHERE id = ?', [installmentId]);
        return true;
    } catch (error) {
        console.error('Error deleting installment:', error);
        Alert.alert('Error', 'No se pudo eliminar la cuota');
        return false;
    }
}
