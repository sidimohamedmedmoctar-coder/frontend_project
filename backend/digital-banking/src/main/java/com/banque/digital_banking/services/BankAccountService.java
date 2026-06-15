package com.banque.digital_banking.services;

import com.banque.digital_banking.dtos.*;
import com.banque.digital_banking.exceptions.BankAccountNotFoundException;
import com.banque.digital_banking.exceptions.BalanceNotSufficientException;
import com.banque.digital_banking.exceptions.CustomerNotFoundException;

import java.util.List;

public interface BankAccountService {

    // ── Customers ────────────────────────────────────────────────────────────

    CustomerDTO saveCustomer(CustomerDTO customerDTO);

    List<CustomerDTO> listCustomers();

    CustomerDTO getCustomer(Long id) throws CustomerNotFoundException;

    CustomerDTO updateCustomer(CustomerDTO customerDTO) throws CustomerNotFoundException;

    void deleteCustomer(Long id) throws CustomerNotFoundException;

    List<CustomerDTO> searchCustomers(String keyword);

    // ── Bank Accounts ────────────────────────────────────────────────────────

    CurrentBankAccountDTO saveCurrentBankAccount(double initialBalance,
                                                  double overDraft,
                                                  Long customerId)
            throws CustomerNotFoundException;

    List<BankAccountDTO> bankAccountList();

    List<BankAccountDTO> getCustomerAccounts(Long customerId);

    BankAccountDTO getBankAccount(String accountId)
            throws BankAccountNotFoundException;

    BankAccountDTO findByRib(String rib)
            throws BankAccountNotFoundException;

    // ── Operations ───────────────────────────────────────────────────────────

    void debit(String accountId, double amount, String description)
            throws BankAccountNotFoundException, BalanceNotSufficientException;

    void credit(String accountId, double amount, String description)
            throws BankAccountNotFoundException;

    void transfer(String accountIdSource, String accountIdDestination,
                  double amount, String description)
            throws BankAccountNotFoundException, BalanceNotSufficientException;

    List<AccountOperationDTO> accountHistory(String accountId);

    AccountHistoryDTO getAccountHistory(String accountId, int page, int size)
            throws BankAccountNotFoundException;
}
