package com.banque.digital_banking.web;

import com.banque.digital_banking.dtos.*;
import com.banque.digital_banking.exceptions.BankAccountNotFoundException;
import com.banque.digital_banking.exceptions.BalanceNotSufficientException;
import com.banque.digital_banking.exceptions.CustomerNotFoundException;
import com.banque.digital_banking.services.BankAccountService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/accounts")
@AllArgsConstructor
@Slf4j
public class BankAccountRestAPI {

    private final BankAccountService bankAccountService;

    @GetMapping("/{accountId}")
    public BankAccountDTO getBankAccount(@PathVariable String accountId)
            throws BankAccountNotFoundException {
        return bankAccountService.getBankAccount(accountId);
    }

    @GetMapping
    public List<BankAccountDTO> listAccounts() {
        return bankAccountService.bankAccountList();
    }

    @GetMapping("/customer/{customerId}")
    public List<BankAccountDTO> getCustomerAccounts(@PathVariable Long customerId) {
        return bankAccountService.getCustomerAccounts(customerId);
    }

    @PostMapping("/current")
    public CurrentBankAccountDTO createCurrentAccount(@RequestBody CreateCurrentAccountRequest req)
            throws CustomerNotFoundException {
        return bankAccountService.saveCurrentBankAccount(
                req.getInitialBalance(), req.getOverDraft(), req.getCustomerId());
    }

    // ── Request bodies ────────────────────────────────────────────────────────

    @Data static class CreateCurrentAccountRequest {
        private Long   customerId;
        private double initialBalance;
        private double overDraft;
    }

    /** Recherche un compte par son RIB — utilisé pour virement et bénéficiaire */
    @GetMapping("/by-rib/{rib}")
    public BankAccountDTO getByRib(@PathVariable String rib)
            throws BankAccountNotFoundException {
        return bankAccountService.findByRib(rib);
    }

    @GetMapping("/{accountId}/operations")
    public List<AccountOperationDTO> getHistory(@PathVariable String accountId) {
        return bankAccountService.accountHistory(accountId);
    }

    @GetMapping("/{accountId}/pageOperations")
    public AccountHistoryDTO getAccountHistory(
            @PathVariable String accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size)
            throws BankAccountNotFoundException {
        return bankAccountService.getAccountHistory(accountId, page, size);
    }

    @PostMapping("/debit")
    public DebitDTO debit(@RequestBody DebitDTO debitDTO)
            throws BankAccountNotFoundException, BalanceNotSufficientException {
        bankAccountService.debit(debitDTO.getAccountId(),
                debitDTO.getAmount(), debitDTO.getDescription());
        return debitDTO;
    }

    @PostMapping("/credit")
    public CreditDTO credit(@RequestBody CreditDTO creditDTO)
            throws BankAccountNotFoundException {
        bankAccountService.credit(creditDTO.getAccountId(),
                creditDTO.getAmount(), creditDTO.getDescription());
        return creditDTO;
    }

    @PostMapping("/transfer")
    public void transfer(@RequestBody TransferRequestDTO transferRequestDTO)
            throws BankAccountNotFoundException, BalanceNotSufficientException {
        bankAccountService.transfer(
                transferRequestDTO.getAccountSource(),
                transferRequestDTO.getAccountDestination(),
                transferRequestDTO.getAmount(),
                transferRequestDTO.getDescription());
    }
}
