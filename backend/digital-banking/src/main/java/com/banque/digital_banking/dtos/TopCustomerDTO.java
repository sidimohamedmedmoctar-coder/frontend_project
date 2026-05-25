package com.banque.digital_banking.dtos;

public record TopCustomerDTO(
        Long customerId,
        String customerName,
        double totalBalance
) {}
