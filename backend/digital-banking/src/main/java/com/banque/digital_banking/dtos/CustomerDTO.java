package com.banque.digital_banking.dtos;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class CustomerDTO {
    private Long id;
    private String name;
    private String email;

    // ── Audit ────────────────────────────────────────────────────────────────
    private String        createdBy;
    private LocalDateTime createdAt;
    private String        updatedBy;
    private LocalDateTime updatedAt;
}
