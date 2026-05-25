package com.banque.digital_banking.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncodingException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Date;
import java.util.List;
import java.util.Set;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${jwt.secret-key}")
    private String secretKey;

    private final AppUserRepository appUserRepository;

    public SecurityConfig(AppUserRepository appUserRepository) {
        this.appUserRepository = appUserRepository;
    }

    // ── Encodeur de mot de passe ─────────────────────────────────────────────
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ── AuthenticationManager ────────────────────────────────────────────────
    @Bean
    public AuthenticationManager authenticationManager(UserDetailsServiceImpl userDetailsService) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(provider);
    }

    // ── Filtre principal ─────────────────────────────────────────────────────
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .csrf(c -> c.disable())
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/auth/login").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .anyRequest().authenticated()
                )
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))
                // Vérifie que l'utilisateur JWT existe encore en base.
                // S'il a été supprimé par un admin → 401 → déconnexion forcée côté client.
                .addFilterAfter(new UserExistenceFilter(appUserRepository),
                                BearerTokenAuthenticationFilter.class)
                .build();
    }

    // ── CORS ─────────────────────────────────────────────────────────────────
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "http://localhost:5173"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    // ── JWT Encoder (MACSigner direct — contourne NimbusJwtEncoder / JWK) ───
    @Bean
    public JwtEncoder jwtEncoder() {
        return parameters -> {
            try {
                var claims = parameters.getClaims();
                SecretKey key = new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");

                // Construire les claims Nimbus
                JWTClaimsSet.Builder cb = new JWTClaimsSet.Builder();
                // Lire l'issuer depuis la map brute (getIssuer() essaie de caster en URL)
                Object rawIss = claims.getClaims().get("iss");
                if (rawIss != null) cb.issuer(rawIss.toString());
                if (claims.getSubject()   != null) cb.subject(claims.getSubject());
                if (claims.getIssuedAt()  != null) cb.issueTime(Date.from(claims.getIssuedAt()));
                if (claims.getExpiresAt() != null) cb.expirationTime(Date.from(claims.getExpiresAt()));
                // Claims personnalisés (scope, roles, …)
                claims.getClaims().forEach((k, v) -> {
                    if (!Set.of("iss", "sub", "iat", "exp").contains(k)) cb.claim(k, v);
                });

                // Signer avec HMAC-SHA256
                SignedJWT signed = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), cb.build());
                signed.sign(new MACSigner(key));

                // Retourner le Jwt Spring Security
                return Jwt.withTokenValue(signed.serialize())
                        .header("alg", "HS256")
                        .header("typ", "JWT")
                        .claims(c -> c.putAll(claims.getClaims()))
                        .build();

            } catch (JOSEException e) {
                throw new JwtEncodingException("Erreur lors de la signature JWT : " + e.getMessage(), e);
            }
        };
    }

    // ── JWT Decoder ──────────────────────────────────────────────────────────
    @Bean
    public JwtDecoder jwtDecoder() {
        SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(keySpec)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
    }
}
