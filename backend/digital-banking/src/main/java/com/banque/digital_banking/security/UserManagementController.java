package com.banque.digital_banking.security;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Administration des utilisateurs — réservé aux ADMIN.
 *
 * L'autorité Spring Security pour le rôle ADMIN est "SCOPE_ADMIN"
 * car oauth2ResourceServer préfixe les entrées du claim "scope" avec "SCOPE_".
 */
@RestController
@RequestMapping("/admin/users")
@AllArgsConstructor
@Slf4j
@PreAuthorize("hasAuthority('SCOPE_ADMIN')")
public class UserManagementController {

    private final AppUserRepository  appUserRepository;
    private final AppRoleRepository  appRoleRepository;
    private final PasswordEncoder    passwordEncoder;

    // ── Liste ────────────────────────────────────────────────────────────────

    @GetMapping
    public List<UserDTO> users() {
        return appUserRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ── Création ─────────────────────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDTO create(@RequestBody CreateUserDTO dto) {
        if (appUserRepository.findByUsername(dto.username()) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Username déjà pris : " + dto.username());
        }
        AppUser user = AppUser.builder()
                .username(dto.username())
                .password(passwordEncoder.encode(dto.password()))
                .email(dto.email())
                .roles(new ArrayList<>())
                .build();
        return toDTO(appUserRepository.save(user));
    }

    // ── Gestion des rôles ────────────────────────────────────────────────────

    @PutMapping("/{id}/roles")
    @Transactional
    public UserDTO addRole(@PathVariable Long id, @RequestParam String role) {
        AppUser user = findUserById(id);
        AppRole appRole = appRoleRepository.findByRoleName(role);
        if (appRole == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rôle introuvable : " + role);
        }
        if (user.getRoles().stream().noneMatch(r -> r.getRoleName().equals(role))) {
            user.getRoles().add(appRole);
        }
        return toDTO(appUserRepository.save(user));
    }

    @DeleteMapping("/{id}/roles/{roleName}")
    @Transactional
    public UserDTO removeRole(@PathVariable Long id, @PathVariable String roleName) {
        AppUser user = findUserById(id);
        user.getRoles().removeIf(r -> r.getRoleName().equals(roleName));
        return toDTO(appUserRepository.save(user));
    }

    // ── Suppression ──────────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!appUserRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur introuvable : " + id);
        }
        appUserRepository.deleteById(id);
        log.info("Utilisateur id={} supprimé.", id);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private AppUser findUserById(Long id) {
        return appUserRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Utilisateur introuvable : " + id));
    }

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
