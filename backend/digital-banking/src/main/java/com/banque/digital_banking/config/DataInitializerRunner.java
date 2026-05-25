package com.banque.digital_banking.config;

import com.banque.digital_banking.entities.AccountOperation;
import com.banque.digital_banking.entities.CurrentAccount;
import com.banque.digital_banking.entities.Customer;
import com.banque.digital_banking.enums.AccountStatus;
import com.banque.digital_banking.enums.OperationType;
import com.banque.digital_banking.repositories.AccountOperationRepository;
import com.banque.digital_banking.repositories.BankAccountRepository;
import com.banque.digital_banking.repositories.CustomerRepository;
import com.banque.digital_banking.security.AccountService;
import com.banque.digital_banking.security.AppRole;
import com.banque.digital_banking.security.AppRoleRepository;
import com.banque.digital_banking.security.AppUser;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Application data + security seed.
 *
 * Utilise @PostConstruct plutôt que CommandLineRunner pour garantir que
 * les données sont insérées AVANT que Tomcat ouvre le port HTTP.
 *
 * Ordre de démarrage Spring Boot :
 *   1. finishBeanFactoryInitialization() → @PostConstruct (données insérées ici)
 *   2. finishRefresh()                  → Tomcat démarre et accepte les requêtes
 *   3. ApplicationReadyEvent            → RagIndexingService.indexData()
 *
 * Ce bean est un @Component → exclu automatiquement des slices @DataJpaTest
 * et @WebMvcTest, ce qui garde ces contextes de test légers et déterministes.
 */
@Component
@RequiredArgsConstructor
public class DataInitializerRunner {

    private final CustomerRepository         customerRepo;
    private final BankAccountRepository      accountRepo;
    private final AccountOperationRepository operationRepo;
    private final AccountService             accountService;
    private final AppRoleRepository          appRoleRepository;

    @PostConstruct
    public void init() {
        // ── Sécurité : vérifiée indépendamment des données métier ──────────────
        // (les rôles persistent dans le fichier H2 même si tous les clients
        //  sont supprimés, donc on ne se base PAS sur customerRepo.count())
        if (appRoleRepository.count() == 0) {
            initSecurity();
        } else {
            System.out.println("Sécurité déjà initialisée — ignorée.");
        }

        // ── Données démo : uniquement si aucun client n'existe ─────────────────
        if (customerRepo.count() == 0) {
            initData();
        } else {
            System.out.println("Données déjà présentes — initialisation ignorée.");
        }
    }

    // ── Security seed ─────────────────────────────────────────────────────────

    private void initSecurity() {
        // ── Rôles ──────────────────────────────────────────────────────────────
        accountService.addNewRole(AppRole.builder().roleName("USER").build());
        accountService.addNewRole(AppRole.builder().roleName("ADMIN").build());
        accountService.addNewRole(AppRole.builder().roleName("SUPER_ADMIN").build());

        // ── Utilisateurs ───────────────────────────────────────────────────────
        accountService.addNewUser(AppUser.builder()
                .username("user1").password("12345").email("user1@gmail.com")
                .roles(new ArrayList<>()).build());
        accountService.addNewUser(AppUser.builder()
                .username("user2").password("12345").email("user2@gmail.com")
                .roles(new ArrayList<>()).build());
        accountService.addNewUser(AppUser.builder()
                .username("admin").password("12345").email("admin@gmail.com")
                .roles(new ArrayList<>()).build());
        accountService.addNewUser(AppUser.builder()
                .username("superadmin").password("12345").email("superadmin@gmail.com")
                .roles(new ArrayList<>()).build());

        // ── Attribution des rôles ──────────────────────────────────────────────
        accountService.addRoleToUser("user1",      "USER");
        accountService.addRoleToUser("user2",      "USER");
        accountService.addRoleToUser("admin",      "USER");
        accountService.addRoleToUser("admin",      "ADMIN");
        accountService.addRoleToUser("superadmin", "USER");
        accountService.addRoleToUser("superadmin", "ADMIN");
        accountService.addRoleToUser("superadmin", "SUPER_ADMIN");

        System.out.println("Sécurité initialisée : 3 rôles, 4 utilisateurs");
    }

    /** Génère un RIB marocain unique (même logique que BankAccountServiceImpl) */
    private String generateRib() {
        SecureRandom rand = new SecureRandom();
        long accountPart = (rand.nextLong() & Long.MAX_VALUE) % 10_000_000_000_000_000L;
        int  key         = (int)(accountPart % 97) + 1;
        return String.format("011100%016d%02d", accountPart, key);
    }

    // ── Demo data seed ────────────────────────────────────────────────────────

    private void initData() {
        Random random = new Random();

        for (String name : List.of("Mohamed", "Hassan", "Imane")) {
            Customer customer = customerRepo.save(
                    Customer.builder()
                            .name(name)
                            .email(name.toLowerCase() + "@gmail.com")
                            .build()
            );

            CurrentAccount current = new CurrentAccount();
            current.setId(UUID.randomUUID().toString());
            current.setRib(generateRib());
            current.setBalance(Math.round(random.nextDouble() * 8000 + 1000));
            current.setCurrency("MAD");
            current.setStatus(AccountStatus.ACTIVATED);
            current.setCustomer(customer);
            current.setOverDraft(9000);
            accountRepo.save(current);

            for (int i = 0; i < 5; i++) {
                OperationType type   = random.nextBoolean() ? OperationType.CREDIT : OperationType.DEBIT;
                double        amount = Math.round(random.nextDouble() * 9900 + 100);
                operationRepo.save(
                        AccountOperation.builder()
                                .operationDate(new Date())
                                .amount(amount)
                                .type(type)
                                .description("Random operation")
                                .bankAccount(current)
                                .build()
                );
            }
        }

        System.out.println("Comptes créés : " + accountRepo.count()
                + ", Opérations créées : " + operationRepo.count());
    }
}
