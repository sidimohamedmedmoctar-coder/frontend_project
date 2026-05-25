import type {
  BankAccount,
  AccountHistory,
  DebitRequest,
  CreditRequest,
  TransferRequest,
} from '@/types';
import apiClient from './axios';

export interface CreateCurrentAccountRequest {
  customerId:     number;
  initialBalance: number;
  overDraft:      number;
}

export interface CreateSavingAccountRequest {
  customerId:     number;
  initialBalance: number;
  interestRate:   number;
}

export async function getAccounts(): Promise<BankAccount[]> {
  const response = await apiClient.get<BankAccount[]>('/accounts');
  return response.data;
}

export async function getAccount(id: string): Promise<BankAccount> {
  const response = await apiClient.get<BankAccount>(`/accounts/${id}`);
  return response.data;
}

export async function getAccountHistory(
  id: string,
  page: number,
  size: number,
): Promise<AccountHistory> {
  const response = await apiClient.get<AccountHistory>(
    `/accounts/${id}/pageOperations`,
    { params: { page, size } },
  );
  return response.data;
}

export async function debit(req: DebitRequest): Promise<DebitRequest> {
  const response = await apiClient.post<DebitRequest>('/accounts/debit', req);
  return response.data;
}

export async function credit(req: CreditRequest): Promise<CreditRequest> {
  const response = await apiClient.post<CreditRequest>('/accounts/credit', req);
  return response.data;
}

export async function transfer(req: TransferRequest): Promise<void> {
  await apiClient.post('/accounts/transfer', req);
}

/** Comptes d'un client spécifique — GET /accounts/customer/{customerId} */
export async function getCustomerAccounts(customerId: number): Promise<BankAccount[]> {
  const response = await apiClient.get<BankAccount[]>(`/accounts/customer/${customerId}`);
  return response.data;
}

/** Créer un compte courant — POST /accounts/current */
export async function createCurrentAccount(req: CreateCurrentAccountRequest): Promise<BankAccount> {
  const response = await apiClient.post<BankAccount>('/accounts/current', req);
  return response.data;
}

/** Créer un compte épargne — POST /accounts/saving */
export async function createSavingAccount(req: CreateSavingAccountRequest): Promise<BankAccount> {
  const response = await apiClient.post<BankAccount>('/accounts/saving', req);
  return response.data;
}

// ── Type retourné par GET /accounts/{accountId}/operations ────────────────────

export interface AccountOperationDTO {
  id:            number;
  operationDate: string;   // ISO date string depuis le backend
  amount:        number;
  type:          'DEBIT' | 'CREDIT';
  description:   string;
  accountId?:    string;   // ajouté côté frontend pour savoir de quel compte vient l'opération
}

/** Toutes les opérations d'un compte — GET /accounts/{accountId}/operations */
export async function getAccountOperations(accountId: string): Promise<AccountOperationDTO[]> {
  const response = await apiClient.get<AccountOperationDTO[]>(`/accounts/${accountId}/operations`);
  return response.data.map((op) => ({ ...op, accountId }));
}

/**
 * Cherche un compte par son RIB — GET /accounts/by-rib/{rib}
 * Retourne le compte s'il existe, null s'il n'existe pas (404).
 */
export async function getAccountByRib(rib: string): Promise<BankAccount | null> {
  try {
    const response = await apiClient.get<BankAccount>(`/accounts/by-rib/${rib.trim()}`);
    return response.data;
  } catch {
    return null;
  }
}
