package com.banque.digital_banking;

import com.banque.digital_banking.entities.AccountOperation;
import com.banque.digital_banking.entities.CurrentAccount;
import com.banque.digital_banking.enums.AccountStatus;
import com.banque.digital_banking.enums.OperationType;
import com.banque.digital_banking.exceptions.BalanceNotSufficientException;
import com.banque.digital_banking.exceptions.BankAccountNotFoundException;
import com.banque.digital_banking.mappers.BankAccountMapperImpl;
import com.banque.digital_banking.repositories.AccountOperationRepository;
import com.banque.digital_banking.repositories.BankAccountRepository;
import com.banque.digital_banking.repositories.CustomerRepository;
import com.banque.digital_banking.services.BankAccountServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Pure Mockito test — no Spring context loaded, very fast.
 * All four repository / mapper collaborators are mocked;
 * BankAccountServiceImpl is exercised directly.
 */
@ExtendWith(MockitoExtension.class)
class BankAccountServiceImplTest {

    // ── Collaborators (mocked) ────────────────────────────────────────────────
    @Mock private CustomerRepository         customerRepository;
    @Mock private BankAccountRepository      bankAccountRepository;
    @Mock private AccountOperationRepository accountOperationRepository;
    @Mock private BankAccountMapperImpl      mapper;

    // ── Subject under test ────────────────────────────────────────────────────
    @InjectMocks
    private BankAccountServiceImpl service;

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Builds a persisted-looking CurrentAccount ready for debit/credit tests. */
    private CurrentAccount buildAccount(String id, double balance) {
        CurrentAccount account = new CurrentAccount();
        account.setId(id);
        account.setBalance(balance);
        account.setCurrency("MAD");
        account.setStatus(AccountStatus.ACTIVATED);
        account.setOverDraft(0);
        return account;
    }

    // ── debit ─────────────────────────────────────────────────────────────────

    @Test
    void testDebitSuccess() throws BankAccountNotFoundException, BalanceNotSufficientException {
        // Arrange
        CurrentAccount account = buildAccount("ACC-1", 1_000.0);
        when(bankAccountRepository.findById("ACC-1")).thenReturn(Optional.of(account));

        // Act
        service.debit("ACC-1", 300.0, "Loyer");

        // Assert — balance decremented in-place
        assertThat(account.getBalance()).isEqualTo(700.0);

        // The operation entity saved must be a DEBIT with the right amount
        ArgumentCaptor<AccountOperation> opCaptor = ArgumentCaptor.forClass(AccountOperation.class);
        verify(accountOperationRepository).save(opCaptor.capture());
        AccountOperation saved = opCaptor.getValue();
        assertThat(saved.getType()).isEqualTo(OperationType.DEBIT);
        assertThat(saved.getAmount()).isEqualTo(300.0);
        assertThat(saved.getDescription()).isEqualTo("Loyer");
        assertThat(saved.getBankAccount()).isSameAs(account);

        // The account entity must be persisted after balance update
        verify(bankAccountRepository).save(account);
    }

    @Test
    void testDebitFailsWhenBalanceInsufficient() {
        // Arrange — balance too low to cover the requested amount
        CurrentAccount account = buildAccount("ACC-1", 100.0);
        when(bankAccountRepository.findById("ACC-1")).thenReturn(Optional.of(account));

        // Act & Assert — service must throw BalanceNotSufficientException
        assertThrows(
                BalanceNotSufficientException.class,
                () -> service.debit("ACC-1", 500.0, "Payment")
        );

        // Side-effect check — no operation should have been persisted
        verify(accountOperationRepository, never()).save(any());
        verify(bankAccountRepository, never()).save(any());
    }

    @Test
    void testDebitFailsWhenAccountNotFound() {
        // Arrange
        when(bankAccountRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(
                BankAccountNotFoundException.class,
                () -> service.debit("UNKNOWN", 100.0, "Test")
        );
    }

    // ── credit ────────────────────────────────────────────────────────────────

    @Test
    void testCredit() throws BankAccountNotFoundException {
        // Arrange
        CurrentAccount account = buildAccount("ACC-1", 500.0);
        when(bankAccountRepository.findById("ACC-1")).thenReturn(Optional.of(account));

        // Act
        service.credit("ACC-1", 200.0, "Salaire");

        // Assert — balance incremented
        assertThat(account.getBalance()).isEqualTo(700.0);

        // Operation must be a CREDIT
        ArgumentCaptor<AccountOperation> opCaptor = ArgumentCaptor.forClass(AccountOperation.class);
        verify(accountOperationRepository).save(opCaptor.capture());
        AccountOperation saved = opCaptor.getValue();
        assertThat(saved.getType()).isEqualTo(OperationType.CREDIT);
        assertThat(saved.getAmount()).isEqualTo(200.0);
        assertThat(saved.getDescription()).isEqualTo("Salaire");

        verify(bankAccountRepository).save(account);
    }

    @Test
    void testCreditFailsWhenAccountNotFound() {
        when(bankAccountRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        assertThrows(
                BankAccountNotFoundException.class,
                () -> service.credit("UNKNOWN", 100.0, "Test")
        );
    }

    // ── transfer ──────────────────────────────────────────────────────────────

    @Test
    void testTransfer() throws BankAccountNotFoundException, BalanceNotSufficientException {
        // Arrange — two distinct accounts
        CurrentAccount source = buildAccount("ACC-SRC", 1_000.0);
        CurrentAccount dest   = buildAccount("ACC-DST",   200.0);

        // transfer() calls debit() then credit() — each calls findById once
        when(bankAccountRepository.findById("ACC-SRC")).thenReturn(Optional.of(source));
        when(bankAccountRepository.findById("ACC-DST")).thenReturn(Optional.of(dest));

        // Act
        service.transfer("ACC-SRC", "ACC-DST", 300.0, "Virement");

        // Assert — source debited, dest credited
        assertThat(source.getBalance()).isEqualTo(700.0);
        assertThat(dest.getBalance()).isEqualTo(500.0);

        // Two operations persisted (one DEBIT + one CREDIT)
        ArgumentCaptor<AccountOperation> opCaptor = ArgumentCaptor.forClass(AccountOperation.class);
        verify(accountOperationRepository, times(2)).save(opCaptor.capture());
        assertThat(opCaptor.getAllValues())
                .extracting(AccountOperation::getType)
                .containsExactlyInAnyOrder(OperationType.DEBIT, OperationType.CREDIT);

        // Both accounts persisted
        verify(bankAccountRepository).save(source);
        verify(bankAccountRepository).save(dest);
    }

    @Test
    void testTransferFailsWhenSourceBalanceInsufficient() {
        CurrentAccount source = buildAccount("ACC-SRC", 50.0);
        when(bankAccountRepository.findById("ACC-SRC")).thenReturn(Optional.of(source));

        assertThrows(
                BalanceNotSufficientException.class,
                () -> service.transfer("ACC-SRC", "ACC-DST", 300.0, "Virement")
        );

        // credit() must never be reached
        verify(bankAccountRepository, atMostOnce()).findById(any());
    }
}
