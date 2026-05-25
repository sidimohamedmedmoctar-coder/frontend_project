package com.banque.digital_banking;

import com.banque.digital_banking.config.AuditingConfig;
import com.banque.digital_banking.entities.Customer;
import com.banque.digital_banking.repositories.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Slice test — only the JPA layer (H2 in-memory, schema auto-created).
 *
 * Why @Import(AuditingConfig.class)?
 *   AuditingConfig carries @EnableJpaAuditing + the auditorProvider bean.
 *   @DataJpaTest excludes non-JPA @Configuration beans from its slice, so we
 *   must import AuditingConfig explicitly to satisfy @CreatedBy / @CreatedDate
 *   on the audited entities.
 *
 * Why no CommandLineRunner seed data?
 *   DataInitializerRunner is a @Component — excluded automatically by the
 *   @DataJpaTest type filter, so the H2 database starts empty for every test.
 */
@DataJpaTest
@Import(AuditingConfig.class)
class CustomerRepositoryTest {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TestEntityManager entityManager;

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    void testSaveAndFindByName() {
        // Arrange — persist a customer whose name contains "ham"
        Customer customer = Customer.builder()
                .name("Mohamed")
                .email("mohamed@test.com")
                .build();
        entityManager.persistAndFlush(customer);

        // Act
        List<Customer> results = customerRepository.findByNameContains("ham");

        // Assert — exactly 1 match, correct data
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Mohamed");
        assertThat(results.get(0).getEmail()).isEqualTo("mohamed@test.com");
    }

    @Test
    void testFindByNameContains_noMatch() {
        // Arrange
        entityManager.persistAndFlush(
                Customer.builder().name("Yasmine").email("yasmine@test.com").build());

        // Act
        List<Customer> results = customerRepository.findByNameContains("xyz");

        // Assert — "xyz" is not in "Yasmine"
        assertThat(results).isEmpty();
    }

    @Test
    void testFindByNameContains_multipleCustomers_onlyMatchingReturned() {
        // Arrange — "Mohammed" contains "ham", "Karim" does not
        entityManager.persistAndFlush(
                Customer.builder().name("Mohammed").email("m@test.com").build());
        entityManager.persistAndFlush(
                Customer.builder().name("Karim").email("k@test.com").build());

        // Act
        List<Customer> results = customerRepository.findByNameContains("ham");

        // Assert
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Mohammed");
    }
}
