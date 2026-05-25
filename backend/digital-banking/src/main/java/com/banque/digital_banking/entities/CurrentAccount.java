package com.banque.digital_banking.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@DiscriminatorValue("CA")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CurrentAccount extends BankAccount {

    private double overDraft;
}
