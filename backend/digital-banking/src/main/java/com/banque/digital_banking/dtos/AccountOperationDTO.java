package com.banque.digital_banking.dtos;

import com.banque.digital_banking.enums.OperationType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Date;

@Data
public class AccountOperationDTO {
    private Long id;
    private Date operationDate;
    private double amount;
    private OperationType type;
    private String description;

    // ── Audit ────────────────────────────────────────────────────────────────
    private String        createdBy;
    private LocalDateTime createdAt;
}
