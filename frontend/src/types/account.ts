import type { Customer } from './customer';

export type AccountStatus = 'CREATED' | 'ACTIVATED' | 'SUSPENDED';
export type AccountType   = 'CurrentAccount' | 'SavingAccount';

export interface BankAccount {
  type: AccountType;
  id: string;
  rib?: string;
  balance: number;
  createdAt: string;
  status: AccountStatus;
  currency?: string;
  customerDTO?: Customer;
  overDraft?: number;
  interestRate?: number;
}
