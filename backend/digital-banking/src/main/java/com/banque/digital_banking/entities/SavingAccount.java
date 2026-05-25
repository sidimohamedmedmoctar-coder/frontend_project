package com.banque.digital_banking.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("SA")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class SavingAccount extends BankAccount {

    private double interestRate;
}
