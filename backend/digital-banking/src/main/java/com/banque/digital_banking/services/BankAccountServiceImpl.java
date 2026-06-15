package com.banque.digital_banking.services;

import com.banque.digital_banking.dtos.*;
import com.banque.digital_banking.entities.*;
import com.banque.digital_banking.enums.AccountStatus;
import com.banque.digital_banking.enums.OperationType;
import com.banque.digital_banking.exceptions.BankAccountNotFoundException;
import com.banque.digital_banking.exceptions.BalanceNotSufficientException;
import com.banque.digital_banking.exceptions.CustomerNotFoundException;
import com.banque.digital_banking.mappers.BankAccountMapperImpl;
import com.banque.digital_banking.repositories.AccountOperationRepository;
import com.banque.digital_banking.repositories.BankAccountRepository;
import com.banque.digital_banking.repositories.CustomerRepository;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
@AllArgsConstructor
@Slf4j
public class BankAccountServiceImpl implements BankAccountService {

    private final CustomerRepository customerRepository;
    private final BankAccountRepository bankAccountRepository;
    private final AccountOperationRepository accountOperationRepository;
    private final BankAccountMapperImpl mapper;

    // ── Customers ────────────────────────────────────────────────────────────

    @Override
    public CustomerDTO saveCustomer(CustomerDTO customerDTO) {
        log.info("Saving customer : {}", customerDTO.getName());
        Customer customer = mapper.fromCustomerDTO(customerDTO);
        Customer saved = customerRepository.save(customer);
        return mapper.fromCustomer(saved);
    }

    @Override
    public List<CustomerDTO> listCustomers() {
        return customerRepository.findAll()
                .stream()
                .map(mapper::fromCustomer)
                .collect(Collectors.toList());
    }

    @Override
    public CustomerDTO getCustomer(Long id) throws CustomerNotFoundException {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(
                        "Customer not found with id : " + id));
        return mapper.fromCustomer(customer);
    }

    @Override
    public CustomerDTO updateCustomer(CustomerDTO customerDTO) throws CustomerNotFoundException {
        log.info("Updating customer : {}", customerDTO.getName());
        // Charger l'entité existante pour préserver bankAccounts (orphanRemoval=true)
        // — évite la suppression en cascade des comptes bancaires du client
        Customer existing = customerRepository.findById(customerDTO.getId())
                .orElseThrow(() -> new CustomerNotFoundException(
                        "Customer not found with id : " + customerDTO.getId()));
        existing.setName(customerDTO.getName());
        existing.setEmail(customerDTO.getEmail());
        Customer saved = customerRepository.save(existing);
        return mapper.fromCustomer(saved);
    }

    @Override
    public void deleteCustomer(Long id) throws CustomerNotFoundException {
        if (!customerRepository.existsById(id)) {
            throw new CustomerNotFoundException("Customer not found with id : " + id);
        }

        // Suppression via JPQL bulk-delete (une seule requête SQL par étape,
        // sans charger d'entités dans le cache L1 Hibernate).
        // Ordre obligatoire pour respecter les contraintes FK :
        //   1. AccountOperations → 2. BankAccounts → 3. Customer
        accountOperationRepository.deleteByCustomerId(id);
        bankAccountRepository.deleteByCustomerId(id);
        customerRepository.deleteById(id);

        log.info("Client supprimé : id={}", id);
    }

    @Override
    public List<CustomerDTO> searchCustomers(String keyword) {
        return customerRepository.findByNameContains(keyword)
                .stream()
                .map(mapper::fromCustomer)
                .collect(Collectors.toList());
    }

    // ── Bank Accounts ────────────────────────────────────────────────────────

    /** Génère un RIB marocain unique : 3 (banque) + 3 (ville) + 16 (compte) + 2 (clé) = 24 chiffres */
    private String generateUniqueRib() {
        SecureRandom rand = new SecureRandom();
        String rib;
        do {
            long accountPart = (rand.nextLong() & Long.MAX_VALUE) % 10_000_000_000_000_000L;
            int  key         = (int)((accountPart % 97) + 1);
            rib = String.format("011100%016d%02d", accountPart, key);
        } while (bankAccountRepository.findByRib(rib).isPresent());
        return rib;
    }

    @Override
    public CurrentBankAccountDTO saveCurrentBankAccount(double initialBalance,
                                                         double overDraft,
                                                         Long customerId)
            throws CustomerNotFoundException {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(
                        "Customer not found with id : " + customerId));
        CurrentAccount account = new CurrentAccount();
        account.setId(UUID.randomUUID().toString());
        account.setRib(generateUniqueRib());
        account.setBalance(initialBalance);
        account.setCurrency("MAD");
        account.setStatus(AccountStatus.ACTIVATED);
        account.setCustomer(customer);
        account.setOverDraft(overDraft);
        CurrentAccount saved = (CurrentAccount) bankAccountRepository.save(account);
        return mapper.fromCurrentBankAccount(saved);
    }

    @Override
    public BankAccountDTO findByRib(String rib) throws BankAccountNotFoundException {
        BankAccount account = bankAccountRepository.findByRib(rib)
                .orElseThrow(() -> new BankAccountNotFoundException(
                        "Aucun compte trouvé pour le RIB : " + rib));
        if (account instanceof CurrentAccount ca) return mapper.fromCurrentBankAccount(ca);
        return mapper.fromSavingBankAccount((SavingAccount) account);
    }

    @Override
    public List<BankAccountDTO> getCustomerAccounts(Long customerId) {
        return bankAccountRepository.findByCustomerId(customerId)
                .stream()
                .map(account -> {
                    if (account instanceof CurrentAccount ca) {
                        return (BankAccountDTO) mapper.fromCurrentBankAccount(ca);
                    } else {
                        return (BankAccountDTO) mapper.fromSavingBankAccount((SavingAccount) account);
                    }
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<BankAccountDTO> bankAccountList() {
        return bankAccountRepository.findAll()
                .stream()
                .map(account -> {
                    if (account instanceof CurrentAccount ca) {
                        return (BankAccountDTO) mapper.fromCurrentBankAccount(ca);
                    } else {
                        return (BankAccountDTO) mapper.fromSavingBankAccount((SavingAccount) account);
                    }
                })
                .collect(Collectors.toList());
    }

    @Override
    public BankAccountDTO getBankAccount(String accountId)
            throws BankAccountNotFoundException {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BankAccountNotFoundException(
                        "BankAccount not found with id : " + accountId));
        if (account instanceof CurrentAccount ca) {
            return mapper.fromCurrentBankAccount(ca);
        } else {
            return mapper.fromSavingBankAccount((SavingAccount) account);
        }
    }

    // ── Operations ───────────────────────────────────────────────────────────

    @Override
    public void debit(String accountId, double amount, String description)
            throws BankAccountNotFoundException, BalanceNotSufficientException {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BankAccountNotFoundException(
                        "BankAccount not found with id : " + accountId));
        if (account.getBalance() < amount) {
            throw new BalanceNotSufficientException("Balance not sufficient");
        }
        AccountOperation operation = new AccountOperation();
        operation.setOperationDate(new Date());
        operation.setAmount(amount);
        operation.setType(OperationType.DEBIT);
        operation.setDescription(description);
        operation.setBankAccount(account);
        accountOperationRepository.save(operation);
        account.setBalance(account.getBalance() - amount);
        bankAccountRepository.save(account);
    }

    @Override
    public void credit(String accountId, double amount, String description)
            throws BankAccountNotFoundException {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BankAccountNotFoundException(
                        "BankAccount not found with id : " + accountId));
        AccountOperation operation = new AccountOperation();
        operation.setOperationDate(new Date());
        operation.setAmount(amount);
        operation.setType(OperationType.CREDIT);
        operation.setDescription(description);
        operation.setBankAccount(account);
        accountOperationRepository.save(operation);
        account.setBalance(account.getBalance() + amount);
        bankAccountRepository.save(account);
    }

    @Override
    public void transfer(String accountIdSource, String accountIdDestination,
                         double amount, String description)
            throws BankAccountNotFoundException, BalanceNotSufficientException {
        debit(accountIdSource, amount, description);
        credit(accountIdDestination, amount, description);
    }

    // ── History ──────────────────────────────────────────────────────────────

    @Override
    public List<AccountOperationDTO> accountHistory(String accountId) {
        return accountOperationRepository.findByBankAccountId(accountId)
                .stream()
                .map(mapper::fromAccountOperation)
                .collect(Collectors.toList());
    }

    @Override
    public AccountHistoryDTO getAccountHistory(String accountId, int page, int size)
            throws BankAccountNotFoundException {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BankAccountNotFoundException(
                        "BankAccount not found with id : " + accountId));
        Page<AccountOperation> accountOperations =
                accountOperationRepository.findByBankAccountIdOrderByOperationDateDesc(
                        accountId, PageRequest.of(page, size));
        AccountHistoryDTO dto = new AccountHistoryDTO();
        dto.setAccountId(accountId);
        dto.setBalance(account.getBalance());
        dto.setStatus(account.getStatus());
        dto.setCurrentPage(page);
        dto.setPageSize(size);
        dto.setTotalPages(accountOperations.getTotalPages());
        dto.setAccountOperationDTOS(
                accountOperations.getContent()
                        .stream()
                        .map(mapper::fromAccountOperation)
                        .collect(Collectors.toList())
        );
        return dto;
    }
}
