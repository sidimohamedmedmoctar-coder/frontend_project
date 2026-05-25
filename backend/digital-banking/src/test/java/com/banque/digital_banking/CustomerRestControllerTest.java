package com.banque.digital_banking;

import com.banque.digital_banking.dtos.CustomerDTO;
import com.banque.digital_banking.security.UserDetailsServiceImpl;
import com.banque.digital_banking.services.BankAccountService;
import com.banque.digital_banking.web.CustomerRestController;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web-layer slice test.
 * Spring Security is fully active; @WithMockUser populates the security context
 * so requests pass the authenticated() authorisation check without a real JWT.
 *
 * Why @MockBean UserDetailsServiceImpl?
 *   SecurityConfig.authenticationManager() injects UserDetailsServiceImpl by
 *   constructor parameter.  That service is not part of the web slice, so
 *   Spring cannot find it — we mock it here to satisfy the bean dependency.
 */
@WebMvcTest(CustomerRestController.class)
class CustomerRestControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ── Mock beans required by the loaded Spring context ──────────────────────

    /** Main collaborator of the controller under test. */
    @MockBean
    private BankAccountService bankAccountService;

    /**
     * Satisfies SecurityConfig.authenticationManager(UserDetailsServiceImpl).
     * The service layer is not loaded in @WebMvcTest, so without this mock
     * the application context would fail to start.
     */
    @MockBean
    private UserDetailsServiceImpl userDetailsService;

    // ── GET /customers ────────────────────────────────────────────────────────

    @Test
    @WithMockUser                       // provides an authenticated principal — no JWT needed
    void testGetCustomers() throws Exception {
        // Arrange — service returns two customers
        CustomerDTO c1 = buildDTO(1L, "Mohamed", "mohamed@test.com");
        CustomerDTO c2 = buildDTO(2L, "Fatima",  "fatima@test.com");
        when(bankAccountService.listCustomers()).thenReturn(List.of(c1, c2));

        // Act & Assert
        mockMvc.perform(get("/customers"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name", is("Mohamed")))
                .andExpect(jsonPath("$[1].name", is("Fatima")));

        verify(bankAccountService).listCustomers();
    }

    @Test
    void testGetCustomers_unauthenticated_returns401() throws Exception {
        // No @WithMockUser → no security context → Spring Security blocks the request
        mockMvc.perform(get("/customers"))
                .andExpect(status().isUnauthorized());
    }

    // ── POST /customers ───────────────────────────────────────────────────────

    @Test
    @WithMockUser
    void testSaveCustomer() throws Exception {
        // Arrange
        CustomerDTO input  = buildDTO(null,  "Ali",  "ali@test.com");
        CustomerDTO output = buildDTO(42L,   "Ali",  "ali@test.com");
        when(bankAccountService.saveCustomer(any(CustomerDTO.class))).thenReturn(output);

        // Act & Assert — POST with JSON body, expect the saved DTO back
        mockMvc.perform(post("/customers")
                        .with(csrf())                               // CSRF token (Spring Security default)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(input)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id",    is(42)))
                .andExpect(jsonPath("$.name",  is("Ali")))
                .andExpect(jsonPath("$.email", is("ali@test.com")));

        verify(bankAccountService).saveCustomer(any(CustomerDTO.class));
    }

    // ── GET /customers/{id} ───────────────────────────────────────────────────

    @Test
    @WithMockUser
    void testGetCustomerById() throws Exception {
        CustomerDTO dto = buildDTO(1L, "Khalid", "khalid@test.com");
        when(bankAccountService.getCustomer(1L)).thenReturn(dto);

        mockMvc.perform(get("/customers/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Khalid")));
    }

    @Test
    @WithMockUser
    void testGetCustomerById_notFound_returns404() throws Exception {
        when(bankAccountService.getCustomer(99L))
                .thenThrow(new com.banque.digital_banking.exceptions.CustomerNotFoundException(
                        "Customer not found with id : 99"));

        // GlobalExceptionHandler maps CustomerNotFoundException → 404
        mockMvc.perform(get("/customers/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", containsString("99")));
    }

    // ── DELETE /customers/{id} ────────────────────────────────────────────────

    @Test
    @WithMockUser
    void testDeleteCustomer() throws Exception {
        mockMvc.perform(delete("/customers/5").with(csrf()))
                .andExpect(status().isOk());

        verify(bankAccountService).deleteCustomer(5L);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private CustomerDTO buildDTO(Long id, String name, String email) {
        CustomerDTO dto = new CustomerDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setEmail(email);
        return dto;
    }
}
