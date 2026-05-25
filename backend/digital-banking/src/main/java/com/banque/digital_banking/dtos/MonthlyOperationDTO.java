package com.banque.digital_banking.dtos;

public record MonthlyOperationDTO(
        int month,
        double debit,
        double credit
) {}
