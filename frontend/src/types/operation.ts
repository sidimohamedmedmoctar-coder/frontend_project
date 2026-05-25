export type OperationType = 'DEBIT' | 'CREDIT';

export interface AccountOperation {
  id: number;
  operationDate: string;
  amount: number;
  type: OperationType;
  description: string;
}

export interface AccountHistory {
  accountId: string;
  balance: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  accountOperationDTOS: AccountOperation[];
}

export interface DebitRequest {
  accountId: string;
  amount: number;
  description: string;
}

export interface CreditRequest {
  accountId: string;
  amount: number;
  description: string;
}

export interface TransferRequest {
  accountSource: string;
  accountDestination: string;
  amount: number;
  description: string;
}
