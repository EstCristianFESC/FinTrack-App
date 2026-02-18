export interface FirestoreCard {
    id: number;
    name: string;
    bank: string;
    credit_limit: number;
    cut_day: number;
    pay_day: number;
    interest_rate_ea: number;
    last_four_digits: string;
    expiry_date: string;
    card_type: string;
    updated_at: string;
    user_id?: string;
}

export interface FirestorePurchase {
    id: number;
    card_id: number;
    person_id: number | null;
    amount: number;
    total_with_interest: number;
    date: string;
    notes: string;
    is_installments: number;
    installments_total: number;
    interest_rate_ea: number;
    updated_at: string;
}

export interface FirestoreInstallment {
    id: number;
    purchase_id: number;
    installment_number: number;
    amount: number;
    capital: number;
    interest: number;
    due_date: string;
    paid: number;
    updated_at: string;
}

export interface FirestorePerson {
    id: number;
    name: string;
    updated_at: string;
}

export interface FirestoreUserProfile {
    id: number;
    firebase_uid: string;
    display_name?: string;
    email?: string;
    phone?: string;
    photo_url?: string;
    created_at?: string;
    updated_at?: string;
}

export interface LocalCardSlice {
    id: number;
    name: string;
    bank: string;
    last_four_digits: string;
}
