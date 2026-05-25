package com.banque.digital_banking.repositories;

import com.banque.digital_banking.entities.AccountOperation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AccountOperationRepository extends JpaRepository<AccountOperation, Long> {

    List<AccountOperation> findByBankAccountId(String accountId);

    Page<AccountOperation> findByBankAccountIdOrderByOperationDateDesc(String accountId, Pageable pageable);

    /** Supprime toutes les opérations liées aux comptes d'un client (bulk JPQL, sans charger les entités). */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM AccountOperation o WHERE o.bankAccount.id IN " +
           "(SELECT b.id FROM BankAccount b WHERE b.customer.id = :customerId)")
    void deleteByCustomerId(@Param("customerId") Long customerId);

    /**
     * Returns rows of [month(int), type(OperationType), sum(double)]
     * for all operations in the given year.
     */
    @Query("""
            SELECT MONTH(o.operationDate), o.type, SUM(o.amount)
            FROM AccountOperation o
            WHERE YEAR(o.operationDate) = :year
            GROUP BY MONTH(o.operationDate), o.type
            ORDER BY MONTH(o.operationDate)
            """)
    List<Object[]> findMonthlyStatsByYear(@Param("year") int year);

    /**
     * Top N customers ranked by sum of their accounts' balances.
     */
    @Query("""
            SELECT c.id, c.name, SUM(b.balance)
            FROM Customer c
            JOIN c.bankAccounts b
            GROUP BY c.id, c.name
            ORDER BY SUM(b.balance) DESC
            """)
    List<Object[]> findTopCustomersByBalance(Pageable pageable);
}
