package com.banque.digital_banking.mappers;

import com.banque.digital_banking.dtos.*;
import com.banque.digital_banking.entities.*;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

@Component
public class BankAccountMapperImpl {

    // ── Customer ────────────────────────────────────────────────────────────

    public CustomerDTO fromCustomer(Customer c) {
        CustomerDTO dto = new CustomerDTO();
        BeanUtils.copyProperties(c, dto);
        return dto;
    }

    public Customer fromCustomerDTO(CustomerDTO dto) {
        Customer c = new Customer();
        BeanUtils.copyProperties(dto, c);
        return c;
    }

    // ── SavingAccount ────────────────────────────────────────────────────────

    public SavingBankAccountDTO fromSavingBankAccount(SavingAccount sa) {
        SavingBankAccountDTO dto = new SavingBankAccountDTO();
        BeanUtils.copyProperties(sa, dto);
        dto.setCustomerDTO(fromCustomer(sa.getCustomer()));
        dto.setType("SA");
        return dto;
    }

    public SavingAccount fromSavingBankAccountDTO(SavingBankAccountDTO dto) {
        SavingAccount sa = new SavingAccount();
        BeanUtils.copyProperties(dto, sa);
        sa.setCustomer(fromCustomerDTO(dto.getCustomerDTO()));
        return sa;
    }

    // ── CurrentAccount ───────────────────────────────────────────────────────

    public CurrentBankAccountDTO fromCurrentBankAccount(CurrentAccount ca) {
        CurrentBankAccountDTO dto = new CurrentBankAccountDTO();
        BeanUtils.copyProperties(ca, dto);
        dto.setCustomerDTO(fromCustomer(ca.getCustomer()));
        dto.setType("CA");
        return dto;
    }

    public CurrentAccount fromCurrentBankAccountDTO(CurrentBankAccountDTO dto) {
        CurrentAccount ca = new CurrentAccount();
        BeanUtils.copyProperties(dto, ca);
        ca.setCustomer(fromCustomerDTO(dto.getCustomerDTO()));
        return ca;
    }

    // ── AccountOperation ─────────────────────────────────────────────────────

    public AccountOperationDTO fromAccountOperation(AccountOperation op) {
        AccountOperationDTO dto = new AccountOperationDTO();
        BeanUtils.copyProperties(op, dto);
        return dto;
    }
}
