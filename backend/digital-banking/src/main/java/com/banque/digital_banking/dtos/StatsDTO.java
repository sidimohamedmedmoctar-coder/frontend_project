package com.banque.digital_banking.dtos;

public record StatsDTO(
        long totalCustomers,
        long totalAccounts,
        long totalOperations,
        double totalBalance
) {}
