package com.banque.digital_banking.dtos;

import com.banque.digital_banking.enums.AccountStatus;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
public class CurrentBankAccountDTO extends BankAccountDTO {
    private String id;
    private String rib;
    private double balance;
    private LocalDateTime createdAt;
    private AccountStatus status;
    private CustomerDTO customerDTO;
    private double overDraft;
}
