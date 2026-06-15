package com.banque.digital_banking.dtos;

import com.banque.digital_banking.enums.AccountStatus;
import lombok.Data;

import java.util.List;

@Data
public class AccountHistoryDTO {
    private String accountId;
    private double balance;
    private AccountStatus status;
    private int currentPage;
    private int totalPages;
    private int pageSize;
    private List<AccountOperationDTO> accountOperationDTOS;
}
