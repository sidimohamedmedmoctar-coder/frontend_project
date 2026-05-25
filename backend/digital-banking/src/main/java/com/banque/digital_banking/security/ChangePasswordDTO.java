package com.banque.digital_banking.security;

/** Corps de la requête de changement de mot de passe. */
public record ChangePasswordDTO(String oldPassword, String newPassword) {}
