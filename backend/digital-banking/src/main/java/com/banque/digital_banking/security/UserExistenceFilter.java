package com.banque.digital_banking.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtre de sécurité : vérifie en base que l'utilisateur JWT existe encore.
 *
 * Problème résolu : avec JWT stateless, un compte supprimé par l'admin
 * conserve un token valide jusqu'à son expiration (1 jour). Ce filtre
 * court-circuite la requête et retourne 401 si l'utilisateur n'existe plus,
 * ce qui force le client frontend à se déconnecter immédiatement.
 *
 * Ordre d'exécution : après BearerTokenAuthenticationFilter
 * (le SecurityContext est déjà peuplé quand ce filtre s'exécute).
 */
public class UserExistenceFilter extends OncePerRequestFilter {

    private final AppUserRepository appUserRepository;

    public UserExistenceFilter(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest  request,
                                    HttpServletResponse response,
                                    FilterChain         chain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Ne s'applique qu'aux requêtes authentifiées (pas anonymous)
        if (auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal())) {

            String username = auth.getName();
            if (username != null && !username.isBlank()) {
                AppUser user = appUserRepository.findByUsername(username);
                if (user == null) {
                    // Compte supprimé → invalider la session côté client
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter()
                            .write("{\"error\":\"Compte supprimé ou introuvable.\"}");
                    return; // arrêt de la chaîne
                }
            }
        }

        chain.doFilter(request, response);
    }

    /** Exclure les routes publiques de la vérification. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/auth/login")
            || path.startsWith("/swagger-ui")
            || path.startsWith("/v3/api-docs");
    }
}
