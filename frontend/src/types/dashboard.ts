export interface DashboardStats {
  totalCustomers: number;
  totalAccounts: number;
  totalOperations: number;
  totalBalance: number;
}

export interface AccountsByType {
  CURRENT: number;
  SAVING: number;
}

export interface MonthlyOperation {
  month: number;
  debit: number;
  credit: number;
}

export interface TopCustomer {
  customerName: string;
  totalBalance: number;
}
