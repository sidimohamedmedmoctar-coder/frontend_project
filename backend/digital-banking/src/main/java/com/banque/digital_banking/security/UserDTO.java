package com.banque.digital_banking.security;

import java.util.List;

/** Projection publique d'AppUser (sans le mot de passe). */
public record UserDTO(Long id, String username, String email, List<String> roles) {}
