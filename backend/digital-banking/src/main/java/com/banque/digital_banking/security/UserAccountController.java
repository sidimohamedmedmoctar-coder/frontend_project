package com.banque.digital_banking.security;

import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Endpoints liés au compte de l'utilisateur connecté.
 */
@RestController
@RequestMapping("/account")
@AllArgsConstructor
@PreAuthorize("isAuthenticated()")
public class UserAccountController {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder   passwordEncoder;

    // ── Profil courant ───────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        AppUser user = appUserRepository.findByUsername(authentication.getName());
        if (user == null) {
            // Compte supprimé — le filtre UserExistenceFilter devrait déjà bloquer,
            // mais cette garde supplémentaire évite un NullPointerException.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Compte supprimé ou introuvable."));
        }
        return ResponseEntity.ok(toDTO(user));
    }

    // ── Changement de mot de passe ───────────────────────────────────────────

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication authentication,
                                            @RequestBody ChangePasswordDTO dto) {
        AppUser user = appUserRepository.findByUsername(authentication.getName());

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Utilisateur introuvable."));
        }

        if (!passwordEncoder.matches(dto.oldPassword(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Ancien mot de passe incorrect."));
        }

        user.setPassword(passwordEncoder.encode(dto.newPassword()));
        appUserRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Mot de passe modifié avec succès."));
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private UserDTO toDTO(AppUser user) {
        return new UserDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRoles().stream()
                        .map(AppRole::getRoleName)
                        .collect(Collectors.toList())
        );
    }
}
