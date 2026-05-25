package com.banque.digital_banking.repositories;

import com.banque.digital_banking.entities.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends JpaRepository<BankAccount, String> {

    List<BankAccount> findByCustomerId(Long customerId);

    Optional<BankAccount> findByRib(String rib);

    /** Supprime tous les comptes d'un client (bulk JPQL, sans charger les entités). */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM BankAccount b WHERE b.customer.id = :customerId")
    void deleteByCustomerId(@Param("customerId") Long customerId);

    @Query("SELECT COALESCE(SUM(b.balance), 0) FROM BankAccount b")
    double sumAllBalances();

    @Query("SELECT COUNT(b) FROM CurrentAccount b")
    long countCurrentAccounts();

    @Query("SELECT COUNT(b) FROM SavingAccount b")
    long countSavingAccounts();
}
