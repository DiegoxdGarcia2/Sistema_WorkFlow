package com.bpm.inteligente.config;

import com.bpm.inteligente.domain.Usuario;
import com.bpm.inteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Runner que migra passwords en texto plano a BCrypt hash.
 * Se ejecuta al inicio de la aplicación y detecta passwords que
 * NO comienzan con "$2a$" (indicador de BCrypt).
 * Solo se ejecuta una vez por password — passwords ya hasheados se ignoran.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class PasswordMigrationRunner implements CommandLineRunner {

    private final UsuarioRepository usuarioRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        try {
            List<Usuario> users = usuarioRepo.findAll();
            int migrated = 0;
            for (Usuario user : users) {
                if (user.getPassword() != null && !user.getPassword().startsWith("$2a$")) {
                    user.setPassword(passwordEncoder.encode(user.getPassword()));
                    usuarioRepo.save(user);
                    migrated++;
                }
            }
            if (migrated > 0) {
                log.info("🔐 Migrated {} user passwords to BCrypt", migrated);
            }
        } catch (Exception e) {
            log.error("⚠️ Password migration failed but application will continue: {}", e.getMessage());
        }
    }
}
