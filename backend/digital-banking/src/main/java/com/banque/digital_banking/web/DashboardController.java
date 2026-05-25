package com.banque.digital_banking.web;

import com.banque.digital_banking.dtos.MonthlyOperationDTO;
import com.banque.digital_banking.dtos.StatsDTO;
import com.banque.digital_banking.dtos.TopCustomerDTO;
import com.banque.digital_banking.enums.OperationType;
import com.banque.digital_banking.repositories.AccountOperationRepository;
import com.banque.digital_banking.repositories.BankAccountRepository;
import com.banque.digital_banking.repositories.CustomerRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dashboard")
@PreAuthorize("isAuthenticated()")
public class DashboardController {

    private final CustomerRepository         customerRepo;
    private final BankAccountRepository      accountRepo;
    private final AccountOperationRepository operationRepo;

    public DashboardController(CustomerRepository customerRepo,
                               BankAccountRepository accountRepo,
                               AccountOperationRepository operationRepo) {
        this.customerRepo  = customerRepo;
        this.accountRepo   = accountRepo;
        this.operationRepo = operationRepo;
    }

    // ── GET /dashboard/stats ─────────────────────────────────────────────────
    @GetMapping("/stats")
    public StatsDTO getStats() {
        long   totalCustomers  = customerRepo.count();
        long   totalAccounts   = accountRepo.count();
        long   totalOperations = operationRepo.count();
        double totalBalance    = accountRepo.sumAllBalances();
        return new StatsDTO(totalCustomers, totalAccounts, totalOperations, totalBalance);
    }

    // ── GET /dashboard/accounts-by-type ─────────────────────────────────────
    @GetMapping("/accounts-by-type")
    public Map<String, Long> getAccountsByType() {
        Map<String, Long> result = new HashMap<>();
        result.put("CURRENT", accountRepo.countCurrentAccounts());
        result.put("SAVING",  accountRepo.countSavingAccounts());
        return result;
    }

    // ── GET /dashboard/operations-per-month?year=YYYY ────────────────────────
    @GetMapping("/operations-per-month")
    public List<MonthlyOperationDTO> getOperationsPerMonth(
            @RequestParam(defaultValue = "0") int year) {

        if (year == 0) {
            year = LocalDate.now().getYear();
        }

        // Raw rows: [month(Integer), type(OperationType), sum(Double)]
        List<Object[]> rows = operationRepo.findMonthlyStatsByYear(year);

        // Build a map month -> {debit, credit}
        double[] debits  = new double[13]; // index 1..12
        double[] credits = new double[13];

        for (Object[] row : rows) {
            int           month  = ((Number) row[0]).intValue();
            OperationType type   = (OperationType) row[1];
            double        amount = ((Number) row[2]).doubleValue();

            if (type == OperationType.DEBIT)  debits[month]  = amount;
            else                               credits[month] = amount;
        }

        List<MonthlyOperationDTO> result = new ArrayList<>(12);
        for (int m = 1; m <= 12; m++) {
            result.add(new MonthlyOperationDTO(m, debits[m], credits[m]));
        }
        return result;
    }

    // ── GET /dashboard/top-customers ─────────────────────────────────────────
    @GetMapping("/top-customers")
    public List<TopCustomerDTO> getTopCustomers() {
        List<Object[]> rows = operationRepo.findTopCustomersByBalance(PageRequest.of(0, 5));
        List<TopCustomerDTO> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long   id      = ((Number) row[0]).longValue();
            String name    = (String) row[1];
            double balance = ((Number) row[2]).doubleValue();
            result.add(new TopCustomerDTO(id, name, balance));
        }
        return result;
    }
}
