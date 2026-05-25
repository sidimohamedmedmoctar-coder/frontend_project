package com.banque.digital_banking.security;

/** Corps de la requête de création d'utilisateur. */
public record CreateUserDTO(String username, String password, String email) {}
