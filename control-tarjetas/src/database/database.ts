

import * as SQLite from 'expo-sqlite';
import { auth } from '../firebase/firebaseConfig';
import { getDb } from './dbCore';
import {
    saveCardToFirestore,
    savePurchaseToFirestore,
    saveInstallmentsBatchToFirestore,
    savePersonToFirestore,
    deleteCardFromFirestore,
    deletePurchaseFromFirestore
} from '../firebase/sync';
import { FirestoreCard, FirestorePurchase, FirestoreInstallment } from '../types';


export { initDatabase, getDb } from './dbCore';

// Other functions continue below...
export async function createInstallmentPurchase(
    cardId: number,
    personId: number | null,
    totalAmount: number,
    totalInstallments: number,
    notes: string,
    dateIso?: string // Optional date override
) {
    const db = getDb();
    const today = dateIso ? new Date(dateIso) : new Date();

    // Obtener datos de la tarjeta para calcular fechas y tasas
    const card = await db.getFirstAsync<{ cut_day: number; pay_day: number; interest_rate_ea: number }>(
        'SELECT cut_day, pay_day, interest_rate_ea FROM cards WHERE id = ?',
        [cardId]
    );

    if (!card) throw new Error('Tarjeta no encontrada');

    // Convert to numbers to ensure safety
    const cutDay = Number(card.cut_day);
    const payDay = Number(card.pay_day);
    const ea = Number(card.interest_rate_ea);

    // Calcular Tasa Efectiva Mensual (TEM) desde EA
    // Fórmula: TEM = (1 + EA)^(1/12) - 1
    const eaDecimal = ea / 100;
    const tem = Math.pow(1 + eaDecimal, 1 / 12) - 1;

    // Calcular proyección total con intereses (estimada para guardar en purchase)
    // Usaremos Amortización a Capital Constante (Capital fijo, interés sobre saldo)
    let totalWithInterest = 0;
    let tempBalance = totalAmount;
    const capitalPerInstallment = totalAmount / totalInstallments;

    for (let i = 0; i < totalInstallments; i++) {

        const interest = totalInstallments === 1 ? 0 : tempBalance * tem;
        totalWithInterest += (capitalPerInstallment + interest);
        tempBalance -= capitalPerInstallment;
    }

    const purchaseResult = await db.runAsync(
        `INSERT INTO purchases
        (card_id, person_id, amount, total_with_interest, date, notes, is_installments, installments_total, interest_rate_ea)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
            cardId,
            personId,
            totalAmount,
            totalWithInterest,
            today.toISOString(),
            notes,
            totalInstallments,
            ea
        ]
    );

    const purchaseId = purchaseResult.lastInsertRowId;

    // Calcular Fechas
    // Usar 'getSafeDate' para manejar meses con menos días
    // lógica: Si corte es 31, y estamos en Febrero, getSafeDate(2025, 1, 31) -> 28 Feb

    // 1. Cut Off Relative to Purchase Date
    // If purchase day > cut day, first cut off is NEXT month.
    let targetCutOffMonth = today.getMonth();
    let targetCutOffYear = today.getFullYear();

    if (today.getDate() > cutDay) {
        targetCutOffMonth++;
    }

    // Adjust for year overflow is handled by Date constructor, but getSafeDate expects valid month index?
    // JS Date handles month=12 as Jan of next year automatically, 
    // but our getSafeDate uses new Date(year, month, day), so it supports overflow.

    // Fecha de corte "Base" (para calcular desde ahí)
    // No necesitamos la fecha exacta de corte para *las cuotas*, sino la fecha de PAGO.
    // Pero la fecha de pago depende de la fecha de corte.

    // Calculate First Pay Date
    // Rule: Pay Date corresponds to the Cut Date calculated above.
    const cutOff = getSafeDate(targetCutOffYear, targetCutOffMonth, cutDay);

    let targetPayMonth = cutOff.getMonth();
    let targetPayYear = cutOff.getFullYear();

    if (payDay < cutDay) {
        // If Pay Day is < Cut Day (e.g. Cut 30th, Pay 5th), it means Pay comes AFTER Cut in the calendar.
        // So we add 1 month to the Pay Month relative to the Cut Month.
        targetPayMonth++;
    }

    const firstPayDate = getSafeDate(targetPayYear, targetPayMonth, payDay);

    console.log(`Purchase Date: ${today.toISOString()}`);
    console.log(`First Pay Date Calculated: ${firstPayDate.toISOString()}`);

    // Generar Cuotas
    let currentBalance = totalAmount;

    for (let i = 0; i < totalInstallments; i++) {
        // Interés sobre saldo (si es 1 cuota, 0 interés)
        const interestAmount = totalInstallments === 1 ? 0 : currentBalance * tem;
        const totalInstallmentAmount = capitalPerInstallment + interestAmount;

        // Due Date: First Pay Date + i months
        // Important: Use getSafeDate ensuring we stick to the intended Pay Day.
        // If Pay Day is 31st, Feb should be 28th, but March should be 31st again.
        // So we increment MONTH from the BASE pay date logic, but keep the DAY fixed (card.pay_day).

        // Calculate target month/year for THIS installment
        // Start from firstPayDate (i=0)
        // Actually, logic is: PayDate(Month + i).

        const installmentDate = getSafeDate(
            firstPayDate.getFullYear(),
            firstPayDate.getMonth() + i,
            card.pay_day // Always try to hit the original Pay Day
        );

        await db.runAsync(
            `INSERT INTO installments
            (purchase_id, installment_number, amount, capital, interest, due_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                purchaseId,
                i + 1,
                totalInstallmentAmount,
                capitalPerInstallment,
                interestAmount,
                installmentDate.toISOString()
            ]
        );

        currentBalance -= capitalPerInstallment;
    }

    // Sync to Firestore
    if (auth.currentUser) {
        const newPurchase: FirestorePurchase = {
            id: purchaseId,
            card_id: cardId,
            person_id: personId,
            amount: totalAmount,
            total_with_interest: totalWithInterest,
            date: today.toISOString(),
            notes: notes,
            is_installments: 1,
            installments_total: totalInstallments,
            interest_rate_ea: card.interest_rate_ea,
            updated_at: new Date().toISOString()
        };
        savePurchaseToFirestore(auth.currentUser.uid, newPurchase);

        // Fetch generated installments to sync
        const installments = await db.getAllAsync<FirestoreInstallment>(
            'SELECT * FROM installments WHERE purchase_id = ?',
            [purchaseId]
        );
        // Map to ensure types match perfectly if needed, but SQLite return should match interface mostly
        // Adjust dates to string if they come back as something else (usually string in expo-sqlite)
        const firestoreInstallments = installments.map(i => ({
            ...i,
            updated_at: new Date().toISOString()
        }));
        saveInstallmentsBatchToFirestore(auth.currentUser.uid, firestoreInstallments);
    }
}


export async function getCardSummary(cardId: number) {
    if (!cardId) return null;
    const db = getDb();

    const card = await db.getFirstAsync<{
        credit_limit: number,
        cut_day: number,
        pay_day: number,
        interest_rate_ea: number,
        card_type: string
    }>(
        `SELECT credit_limit, cut_day, pay_day, interest_rate_ea, card_type FROM cards WHERE id = ?`,
        [cardId]
    );

    if (!card) return null;

    // Calcular fechas del próximo corte y pago
    const cutDay = Number(card.cut_day);
    const payDay = Number(card.pay_day);

    const today = new Date();
    // Use getSafeDate to handle cases where today's day > target month's days (e.g. 30th Jan -> 28th Feb)
    let nextCutOffDate = getSafeDate(today.getFullYear(), today.getMonth(), cutDay);

    // If today is past the cut off day, move to next month
    if (today > nextCutOffDate) {
        nextCutOffDate = getSafeDate(today.getFullYear(), today.getMonth() + 1, cutDay);
    }

    let nextPayDate = getSafeDate(nextCutOffDate.getFullYear(), nextCutOffDate.getMonth(), payDay);
    if (payDay < cutDay) {
        nextPayDate = getSafeDate(nextCutOffDate.getFullYear(), nextCutOffDate.getMonth() + 1, payDay);
    }

    // 1. Deuda Total de Capital (Lo que ocupa cupo)
    const totalCapitalDebt = await db.getFirstAsync<{ total: number }>(
        `
        SELECT IFNULL(SUM(capital), 0) as total
        FROM installments
        WHERE paid = 0
        AND purchase_id IN (
            SELECT id FROM purchases WHERE card_id = ?
        )
        `,
        [cardId]
    );

    // 2. Pago para el corte
    // Suma TOTAL (Capital + Interés) de cuotas vencidas o que vencen en este ciclo
    // IMPORTANTE: Asegurar que nextPayDate sea válido
    const payDateIso = isNaN(nextPayDate.getTime()) ? new Date().toISOString() : nextPayDate.toISOString();

    const paymentForIssue = await db.getFirstAsync<{ total: number }>(
        `
        SELECT IFNULL(SUM(amount), 0) as total
        FROM installments
        WHERE paid = 0
        AND date(due_date) <= date(?)
        AND purchase_id IN (
            SELECT id FROM purchases WHERE card_id = ?
        )
        `,
        [payDateIso, cardId]
    );

    const used = totalCapitalDebt?.total || 0;
    const limit = card.credit_limit;

    return {
        creditLimit: limit,
        usedCredit: used,
        availableCredit: limit - used,
        totalDebt: used, // Deuda de capital (cupo usado)
        paymentForIssue: paymentForIssue?.total || 0,
        nextPayDate: nextPayDate,
        nextCutOffDate: nextCutOffDate,
        eaRate: card.interest_rate_ea,
        card_type: card.card_type,
        pay_day: card.pay_day,
        cut_day: card.cut_day
    };
}

export async function markPeriodAsPaid(cardId: number, cutOffDate: string) {
    const db = getDb();

    // Calcular fecha de pago límite para ese corte
    const card = await db.getFirstAsync<{ pay_day: number, cut_day: number }>(
        'SELECT pay_day, cut_day FROM cards WHERE id = ?', [cardId]
    );
    if (!card) return;

    const payDay = Number(card.pay_day);
    const cutDay = Number(card.cut_day);

    const cutOff = new Date(cutOffDate);
    // Use getSafeDate to ensure we don't overflow (e.g. Feb 30 -> Mar 2)
    let payDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth(), payDay);

    if (payDay < cutDay) {
        // If PayDay < CutDay, it's next month
        payDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth() + 1, payDay);
    }

    const result = await db.runAsync(
        `UPDATE installments
         SET paid = 1
         WHERE paid = 0
         AND date(due_date) = date(?) -- Strict match for this period
         AND purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)`,
        [payDate.toISOString(), cardId]
    );

    // Sync Changes
    if (auth.currentUser) {
        // Fetch the modified installments to sync them
        const modifiedInstallments = await db.getAllAsync<FirestoreInstallment>(
            `SELECT * 
             FROM installments 
             WHERE paid = 1 
             AND date(due_date) = date(?)
             AND purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)`,
            [payDate.toISOString(), cardId]
        );
        const firestoreInstallments = modifiedInstallments.map(i => ({
            ...i,
            updated_at: new Date().toISOString()
        }));
        saveInstallmentsBatchToFirestore(auth.currentUser.uid, firestoreInstallments);
    }
}

export async function unmarkPeriodAsPaid(cardId: number, cutOffDate: string) {
    const db = getDb();

    // Logic to revert payment for the specific cut off.
    // We target installments due on or before the pay date of this cut off
    // BUT to avoid unmarking history, we should ideally restrict it.
    // However, since app state is simple, we will unmark everything <= payDate 
    // that matches the card. This restores the "Pending" state.
    // User can mark again if needed.

    // Calculate Pay Date
    const card = await db.getFirstAsync<{ pay_day: number, cut_day: number }>(
        'SELECT pay_day, cut_day FROM cards WHERE id = ?', [cardId]
    );
    if (!card) return;

    const payDay = Number(card.pay_day);
    const cutDay = Number(card.cut_day);

    const cutOff = new Date(cutOffDate);
    let payDate = new Date(cutOff.getFullYear(), cutOff.getMonth(), payDay);
    if (payDay < cutDay) {
        payDate.setMonth(payDate.getMonth() + 1);
    }

    // We also need to avoid unmarking very old payments if the user has a long history.
    // Heuristic: Unmark only if paid = 1.
    // To be safe: Unmark only items within last 45 days? 
    // Let's keep it simple as per user request: "Deshacer".

    // We targeting strictly the specific Pay Date items to avoid reverting previous legitimate payments.
    // This assumes installments are generated exactly on pay_day.

    await db.runAsync(
        `UPDATE installments
         SET paid = 0
         WHERE paid = 1
         AND date(due_date) = date(?) -- Strict match for this period
         AND purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)`,
        [payDate.toISOString(), cardId]
    );

    // Sync Changes
    if (auth.currentUser) {
        // Fetch the modified installments (now paid=0)
        // We use the same filter logic
        const modifiedInstallments = await db.getAllAsync<FirestoreInstallment>(
            `SELECT *
             FROM installments
             WHERE paid = 0
             AND date(due_date) = date(?)
             AND purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)`,
            [payDate.toISOString(), cardId]
        );
        const firestoreInstallments = modifiedInstallments.map(i => ({
            ...i,
            updated_at: new Date().toISOString()
        }));
        saveInstallmentsBatchToFirestore(auth.currentUser.uid, firestoreInstallments);
    }
}


export async function getPeriodStatus(cardId: number, cutOffDate: string) {
    const db = getDb();
    const card = await db.getFirstAsync<{ pay_day: number, cut_day: number }>(
        'SELECT pay_day, cut_day FROM cards WHERE id = ?', [cardId]
    );
    if (!card) return { isPaid: false, totalPaid: 0 };

    const cutOff = new Date(cutOffDate);
    let payDate = new Date(cutOff.getFullYear(), cutOff.getMonth(), card.pay_day);
    if (card.pay_day < card.cut_day) {
        payDate.setMonth(payDate.getMonth() + 1);
    }

    // Check if there are ANY paid installments in this recent period
    // and NO pending installments for the same period?
    // Actually, "Deshacer" should appeal if there was a payment recently.

    // Let's count how many items are paid vs total for this period.
    const result = await db.getFirstAsync<{ paid_count: number, total_amount: number }>(
        `SELECT COUNT(*) as paid_count, SUM(amount) as total_amount
         FROM installments
         WHERE paid = 1
         AND date(due_date) = date(?)
         AND purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)`,
        [payDate.toISOString(), cardId]
    );

    return {
        isPaid: (result?.paid_count || 0) > 0,
        amount: result?.total_amount || 0
    };
}

export async function getPeople() {
    const db = getDb();
    return await db.getAllAsync('SELECT * FROM people');
}


export async function addPerson(name: string) {
    const db = getDb();
    const result = await db.runAsync('INSERT INTO people (name) VALUES (?)', [name]);
    const newId = result.lastInsertRowId;

    // Sync
    if (auth.currentUser) {
        savePersonToFirestore(auth.currentUser.uid, {
            id: newId,
            name,
            updated_at: new Date().toISOString()
        });
    }

    return newId;
}


export async function getTransactionsByCard(cardId: number) {
    const db = getDb();
    return await db.getAllAsync(`
        SELECT p.*, pe.name as person_name 
        FROM purchases p 
        LEFT JOIN people pe ON p.person_id = pe.id
        WHERE p.card_id = ? 
        ORDER BY p.date DESC
    `, [cardId]);
}

export async function getTransactionsByPeriod(cardId: number, startDateIso: string, endDateIso: string) {
    if (!startDateIso || !endDateIso) return [];

    const db = getDb();
    // Validate Dates
    const start = new Date(startDateIso);
    const end = new Date(endDateIso);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    // Validate Dates - no longer needed as we pass ISO strings directly to date()
    // const start = new Date(startDateIso);
    // const end = new Date(endDateIso);

    // if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return await db.getAllAsync(`
        SELECT p.*, pe.name as person_name 
        FROM purchases p 
        LEFT JOIN people pe ON p.person_id = pe.id
        WHERE p.card_id = ? 
        AND date(p.date) >= date(?) 
        AND date(p.date) <= date(?)
        ORDER BY p.date DESC
    `, [cardId, startDateIso, endDateIso]);
}

export async function getAvailablePeriods(cardId: number) {
    const db = getDb();

    // 1. Get Card Cut Day
    const card = await db.getFirstAsync<{ cut_day: number }>('SELECT cut_day FROM cards WHERE id = ?', [cardId]);
    if (!card) return [];

    // 2. Get Min/Max Purchase Dates
    const range = await db.getFirstAsync<{ min_date: string, max_date: string }>(
        'SELECT MIN(date) as min_date, MAX(date) as max_date FROM purchases WHERE card_id = ?',
        [cardId]
    );

    if (!range || !range.min_date) return [];

    const minDate = new Date(range.min_date);
    const maxDate = new Date(); // Always include up to today

    // 3. Generate Periods
    // We iterate by Month/Year index to avoid Date overflow (e.g. Jan 30 -> Feb 30 -> Mar 2)

    const periods = [];

    // Start iteration a month before minDate
    let currentYear = minDate.getFullYear();
    let currentMonth = minDate.getMonth() - 1;

    // Handle initial roll-back if month is -1
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }

    // We want to generate periods until we cover the maxDate
    // SafeMax is effectively today or maxDate extended slightly
    const safeMaxTime = maxDate.getTime();

    while (true) {
        // Start of THIS period is the Cut Date of (Year, Month)
        const start = getSafeDate(currentYear, currentMonth, card.cut_day);

        // Break if this period starts in the future (relative to maxDate/today)
        if (start.getTime() > safeMaxTime) break;

        // End of THIS period is the Cut Date of (Year, Month + 1)
        // Check for year rollover
        let nextMonthIndex = currentMonth + 1;
        let nextYearIndex = currentYear;
        if (nextMonthIndex > 11) {
            nextMonthIndex = 0;
            nextYearIndex++;
        }

        const end = getSafeDate(nextYearIndex, nextMonthIndex, card.cut_day);

        // Label logic: "16 Ene - 15 Feb"
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const startDay = start.getDate();
        const startMonth = months[start.getMonth()];
        const endDay = end.getDate();
        const endMonth = months[end.getMonth()];

        const label = `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

        // Only add if end date is relevant (>= minDate)
        if (end >= minDate) {
            periods.push({
                label: label,
                value: end.toISOString().slice(0, 7),
                startDate: start.toISOString(),
                endDate: end.toISOString(),
                isCurrent: new Date() > start && new Date() <= end
            });
        }

        // Advance
        currentMonth = nextMonthIndex;
        currentYear = nextYearIndex;
    }

    // Reverse to show newest first
    return periods.reverse();
}

export async function getCards() {
    const db = getDb();
    const user = auth.currentUser;
    if (!user || !user.uid) return [];

    return await db.getAllAsync('SELECT * FROM cards WHERE user_id = ?', [user.uid]);
}

export async function createCard(
    name: string,
    bank: string,
    creditLimit: number,
    cutDay: number,
    payDay: number,
    interestRateEA: number,
    lastFourDigits: string,
    expiryDate: string,
    cardType: string = 'visa'
) {
    const user = auth.currentUser;
    const userId = user ? user.uid : null;
    const db = getDb();

    if (!userId) throw new Error("Usuario no autenticado");

    const result = await db.runAsync(
        `
        INSERT INTO cards
        (user_id, name, bank, credit_limit, cut_day, pay_day, interest_rate_ea, last_four_digits, expiry_date, card_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            userId,
            name,
            bank,
            creditLimit,
            cutDay,
            payDay,
            interestRateEA,
            lastFourDigits,
            expiryDate,
            cardType
        ]
    );

    // Sync to Firestore
    if (auth.currentUser) {
        const newId = result.lastInsertRowId;

        const newCard: FirestoreCard = {
            id: newId,
            name,
            bank,
            credit_limit: creditLimit,
            cut_day: cutDay,
            pay_day: payDay,
            interest_rate_ea: interestRateEA,
            last_four_digits: lastFourDigits,
            expiry_date: expiryDate,
            card_type: cardType,
            updated_at: new Date().toISOString()
        };
        saveCardToFirestore(auth.currentUser.uid, newCard);
    }
}


// --- Logic Improvements ---

/**
 * Returns a date object ensuring the day exists in that month.
 * e.g. Feb 30 -> Feb 28 (or 29).
 */
export function getSafeDate(year: number, month: number, day: number): Date {
    // 0 = Day of month (1-31)
    // Create date at month + 1, day 0 -> Last day of 'month'
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(day, lastDayOfMonth);

    // Usamos mediodía (12:00) para evitar problemas de timezone al convertir a ISO o cambiar de zona
    // Esto previene que 00:00 se convierta en 23:00 del día anterior por cambios de horario
    return new Date(year, month, safeDay, 12, 0, 0);
}


export async function deletePurchase(purchaseId: number) {
    const db = getDb();
    // Delete installments first
    await db.runAsync('DELETE FROM installments WHERE purchase_id = ?', [purchaseId]);
    await db.runAsync('DELETE FROM purchases WHERE id = ?', [purchaseId]);

    // Sync Delete
    if (auth.currentUser) {
        await deletePurchaseFromFirestore(auth.currentUser.uid, purchaseId);
    }
}


export async function deleteCard(cardId: number) {
    const db = getDb();
    // 1. Delete installments for all purchases on this card
    await db.runAsync(
        'DELETE FROM installments WHERE purchase_id IN (SELECT id FROM purchases WHERE card_id = ?)',
        [cardId]
    );
    // 2. Delete purchases
    await db.runAsync('DELETE FROM purchases WHERE card_id = ?', [cardId]);
    // 3. Delete period_status
    await db.runAsync('DELETE FROM period_status WHERE card_id = ?', [cardId]);
    // 4. Delete card

    // 4. Delete card
    await db.runAsync('DELETE FROM cards WHERE id = ?', [cardId]);

    // Sync Delete
    if (auth.currentUser) {
        await deleteCardFromFirestore(auth.currentUser.uid, cardId);
    }
}


export async function getPaymentSummaryDetails(cardId: number, cutOffDateIso: string, includePaid: boolean = false) {
    const db = getDb();

    // 1. Calculate Pay Date limit based on Cut-Off
    const card = await db.getFirstAsync<{ pay_day: number, cut_day: number }>(
        'SELECT pay_day, cut_day FROM cards WHERE id = ?', [cardId]
    );
    if (!card) throw new Error('Card not found');

    const cutOff = new Date(cutOffDateIso);

    // Logic to find Pay Date relative to Cut Day
    // If we have strict monthly cycles, we can reuse similar logic
    let payDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth(), card.pay_day);
    if (card.pay_day < card.cut_day) {
        // Pay day is next month
        payDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth() + 1, card.pay_day);
    }

    // 2. Fetch Installments
    const details = await db.getAllAsync<{
        person_name: string,
        person_id: number,
        purchase_notes: string,
        purchase_date: string,
        installment_number: number,
        installments_total: number,
        amount: number
    }>(
        `
        SELECT 
            IFNULL(pe.name, 'Yo') as person_name,
            p.person_id,
            p.notes as purchase_notes,
            p.date as purchase_date,
            i.installment_number,
            p.installments_total,
            i.amount
        FROM installments i
        JOIN purchases p ON i.purchase_id = p.id
        LEFT JOIN people pe ON p.person_id = pe.id
        WHERE (i.paid = 0 OR ?)
        AND p.card_id = ?
        AND date(i.due_date) <= date(?)
        ORDER BY pe.name, p.date
        `,
        [includePaid ? 1 : 0, cardId, payDate.toISOString()]
    );

    // 3. Group by Type (OneShot vs Installments) AND Person
    const oneShotGroup: any = {};
    const installmentsGroup: any = {};
    let total = 0;

    details.forEach(item => {
        total += item.amount;
        const key = item.person_name;
        const isOneShot = item.installments_total === 1;

        const targetGroup = isOneShot ? oneShotGroup : installmentsGroup;

        if (!targetGroup[key]) {
            targetGroup[key] = {
                personName: key,
                total: 0,
                items: []
            };
        }
        targetGroup[key].total += item.amount;
        targetGroup[key].items.push(item);
    });

    return {
        totalToPay: total,
        payDate: payDate.toISOString(),
        oneShot: Object.values(oneShotGroup),
        installments: Object.values(installmentsGroup)
    };
}

export async function getStatementItems(cardId: number, cutOffDateIso: string) {
    const db = getDb();
    const card = await db.getFirstAsync<any>('SELECT * FROM cards WHERE id = ?', [cardId]);
    if (!card) return []; // Return empty if card not found

    const cutOff = new Date(cutOffDateIso);
    if (isNaN(cutOff.getTime())) return [];

    // Calculate Pay Date for this Cut-Off
    let payDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth(), card.pay_day);
    if (card.pay_day < card.cut_day) {
        payDate = getSafeDate(cutOff.getFullYear(), cutOff.getMonth() + 1, card.pay_day);
    }

    if (isNaN(payDate.getTime())) return [];

    // Query Installments DUE on this Pay Date
    // We want to show:
    // 1. Installments specifically due on this date.
    return await db.getAllAsync(`
        SELECT 
            i.id,
            p.id as purchase_id,
            p.notes,
            i.due_date as date, 
            i.amount,
            p.amount as original_amount,
            IFNULL(pe.name, 'Yo') as person_name,
            i.installment_number as installments_current,
            p.installments_total,
            i.paid
        FROM installments i
        JOIN purchases p ON i.purchase_id = p.id
        LEFT JOIN people pe ON p.person_id = pe.id
        WHERE p.card_id = ?
        AND date(i.due_date) = date(?)
        ORDER BY i.due_date DESC
    `, [cardId, payDate.toISOString()]);
}

// --- Update Functions (with Sync) ---

export async function updateCard(
    cardId: number,
    name: string,
    bank: string,
    creditLimit: number,
    cutDay: number,
    payDay: number,
    interestRateEA: number,
    lastFourDigits: string,
    expiryDate: string,
    cardType: string
) {
    const db = getDb();
    const user = auth.currentUser;

    await db.runAsync(
        `UPDATE cards 
         SET name = ?, bank = ?, credit_limit = ?, cut_day = ?, pay_day = ?, interest_rate_ea = ?, last_four_digits = ?, expiry_date = ?, card_type = ?
        WHERE id = ? `,
        [name, bank, creditLimit, cutDay, payDay, interestRateEA, lastFourDigits, expiryDate, cardType, cardId]
    );

    // Sync
    if (user) {
        const updatedCard: FirestoreCard = {
            id: cardId,
            name,
            bank,
            credit_limit: creditLimit,
            cut_day: cutDay,
            pay_day: payDay,
            interest_rate_ea: interestRateEA,
            last_four_digits: lastFourDigits,
            expiry_date: expiryDate,
            card_type: cardType,
            updated_at: new Date().toISOString()
        };
        saveCardToFirestore(user.uid, updatedCard);
    }
}

export async function updatePurchaseWithInstallments(
    purchaseId: number,
    cardId: number,
    personId: number | null,
    totalAmount: number,
    totalInstallments: number,
    notes: string,
    originalDateIso: string // Keep original date to maintain history entry point
) {
    const db = getDb();
    const user = auth.currentUser;

    // 1. Get Card for Interest Rate and Cut/Pay days
    const card = await db.getFirstAsync<{
        interest_rate_ea: number,
        cut_day: number,
        pay_day: number
    }>('SELECT interest_rate_ea, cut_day, pay_day FROM cards WHERE id = ?', [cardId]);

    if (!card) throw new Error('Card not found');

    // 2. Recalculate Installments Logic (Same as createInstallmentPurchase)
    const eaDecimal = card.interest_rate_ea / 100;
    const tem = Math.pow(1 + eaDecimal, 1 / 12) - 1;

    let totalWithInterest = 0;
    let tempBalance = totalAmount;
    const capitalPerInstallment = totalAmount / totalInstallments;

    for (let i = 0; i < totalInstallments; i++) {
        const interest = totalInstallments === 1 ? 0 : tempBalance * tem;
        totalWithInterest += (capitalPerInstallment + interest);
        tempBalance -= capitalPerInstallment;
    }

    // 3. Update Purchase Record
    await db.runAsync(`
        UPDATE purchases 
        SET amount = ?, total_with_interest = ?, notes = ?, installments_total = ?, interest_rate_ea = ?, person_id = ?, date = ?
        WHERE id = ?
            `, [totalAmount, totalWithInterest, notes, totalInstallments, card.interest_rate_ea, personId, originalDateIso, purchaseId]);

    // 4. Regenerate Installments
    // Delete old
    await db.runAsync('DELETE FROM installments WHERE purchase_id = ?', [purchaseId]);

    // Calculate Dates
    let dateObj = new Date(originalDateIso);
    let targetCutOffMonth = dateObj.getMonth();
    let targetCutOffYear = dateObj.getFullYear();

    if (dateObj.getDate() > card.cut_day) {
        targetCutOffMonth++;
    }

    const cutOff = getSafeDate(targetCutOffYear, targetCutOffMonth, card.cut_day);
    let targetPayMonth = cutOff.getMonth();
    let targetPayYear = cutOff.getFullYear();

    if (card.pay_day < card.cut_day) {
        targetPayMonth++;
    }

    const firstPayDate = getSafeDate(targetPayYear, targetPayMonth, card.pay_day);
    let currentBalance = totalAmount;

    for (let i = 0; i < totalInstallments; i++) {
        const interestAmount = totalInstallments === 1 ? 0 : currentBalance * tem;
        const totalInstallmentAmount = capitalPerInstallment + interestAmount;

        const installmentDate = getSafeDate(
            firstPayDate.getFullYear(),
            firstPayDate.getMonth() + i,
            card.pay_day
        );

        await db.runAsync(
            `INSERT INTO installments
        (purchase_id, installment_number, amount, capital, interest, due_date)
    VALUES(?, ?, ?, ?, ?, ?)`,
            [purchaseId, i + 1, totalInstallmentAmount, capitalPerInstallment, interestAmount, installmentDate.toISOString()]
        );
        currentBalance -= capitalPerInstallment;
    }

    // 5. Sync to Firestore
    if (user) {
        // Sync Purchase
        const updatedPurchase: FirestorePurchase = {
            id: purchaseId,
            card_id: cardId,
            person_id: personId,
            amount: totalAmount,
            total_with_interest: totalWithInterest,
            date: originalDateIso,
            notes: notes,
            is_installments: 1,
            installments_total: totalInstallments,
            interest_rate_ea: card.interest_rate_ea,
            updated_at: new Date().toISOString()
        };
        savePurchaseToFirestore(user.uid, updatedPurchase);

        // Sync Installments (Fetch newly created ones)
        const newInstallments = await db.getAllAsync<FirestoreInstallment>(
            'SELECT * FROM installments WHERE purchase_id = ?',
            [purchaseId]
        );
        const firestoreInstallments = newInstallments.map(i => ({
            ...i,
            updated_at: new Date().toISOString()
        }));
        saveInstallmentsBatchToFirestore(user.uid, firestoreInstallments);
    }
}

export async function getActiveParticipants(cardId: number, dateIso: string): Promise<number[]> {
    const db = getDb();
    const card = await db.getFirstAsync<{ cut_day: number }>('SELECT cut_day FROM cards WHERE id = ?', [cardId]);
    if (!card) return [];

    const targetDate = new Date(dateIso);

    // Calculate Period Start and End for this specific date
    let startYear = targetDate.getFullYear();
    let startMonth = targetDate.getMonth();

    if (targetDate.getDate() <= card.cut_day) {
        startMonth--; // Go back one month
    }

    const pStartMonth = startMonth;
    const pStartYear = startYear;

    // Period Start: Cut Day of previous month (relative to target period)
    const pStartDate = getSafeDate(pStartYear, pStartMonth, card.cut_day);

    // Period End: Cut Day of current month
    const pEndMonth = pStartMonth + 1;
    const pEndDate = getSafeDate(pStartYear, pEndMonth, card.cut_day);

    // Query
    const result = await db.getAllAsync<{ person_id: number }>(
        `SELECT DISTINCT person_id 
         FROM purchases 
         WHERE card_id = ? 
         AND date > ? 
         AND date <= ?
         AND person_id IS NOT NULL`,
        [cardId, pStartDate.toISOString(), pEndDate.toISOString()]
    );

    return result.map(r => r.person_id);
}
