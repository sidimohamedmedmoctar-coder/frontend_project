package com.banque.digital_banking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/**
 * Active JPA Auditing et fournit le "qui a fait l'action"
 * pour @CreatedBy / @LastModifiedBy.
 *
 * Placer @EnableJpaAuditing ici (et NON sur DigitalBankingApplication) permet
 * aux tests @WebMvcTest d'exclure cette configuration du contexte allégé et
 * d'éviter l'erreur "JPA metamodel must not be empty".
 *
 * - Utilisateur authentifié → authentication.getName()  (ex : "admin")
 * - Pas d'auth ou anonyme   → "system"
 *   (couvre les CommandLineRunner au démarrage et le @PostConstruct)
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class AuditingConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth == null
                    || !auth.isAuthenticated()
                    || auth instanceof AnonymousAuthenticationToken) {
                return Optional.of("system");
            }

            return Optional.of(auth.getName());
        };
    }
}
