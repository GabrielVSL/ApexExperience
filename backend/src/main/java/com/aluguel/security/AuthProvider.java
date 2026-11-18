package com.aluguel.security;

import com.aluguel.models.Usuario;
import com.aluguel.repositories.UsuarioRepository;
import io.micronaut.security.authentication.AuthenticationProvider;
import io.micronaut.security.authentication.AuthenticationRequest;
import io.micronaut.security.authentication.AuthenticationResponse;
import jakarta.inject.Singleton;
import org.mindrot.jbcrypt.BCrypt;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Flux;

import java.util.List;

@Singleton
public class AuthProvider<T> implements AuthenticationProvider<T> {

    private static final Logger log = LoggerFactory.getLogger(AuthProvider.class);
    private final UsuarioRepository repository;

    public AuthProvider(UsuarioRepository repository) {
        this.repository = repository;
    }

    @Override
    public Publisher<AuthenticationResponse> authenticate(T httpRequest,
                                                          AuthenticationRequest<?, ?> authRequest) {
        
        String rawEmail = authRequest.getIdentity() != null ? authRequest.getIdentity().toString().trim() : "";
        String normalizedEmail = rawEmail.toLowerCase();
        String senhaDigitada = authRequest.getSecret() != null ? authRequest.getSecret().toString() : "";

        log.debug("Processando tentativa de login para o usuário: {}", normalizedEmail);

        return Flux.create(emitter -> {
            var usuarioOpt = repository.findByEmail(normalizedEmail)
                    .or(() -> rawEmail.equals(normalizedEmail) ? java.util.Optional.empty() : repository.findByEmail(rawEmail));

            if (usuarioOpt.isPresent()) {
                Usuario usuario = usuarioOpt.get();

                if (BCrypt.checkpw(senhaDigitada, usuario.getSenha())) {
                    if ("SUSPENSO".equalsIgnoreCase(usuario.getStatusConta())) {
                        log.warn("Bloqueio de login para conta suspensa: {}", usuario.getEmail());
                        emitter.error(AuthenticationResponse.exception("Esta conta foi suspensa pelo Race Control Apex."));
                        return;
                    }
                    log.debug("Autenticação com sucesso para: {}", usuario.getEmail());
                    emitter.next(AuthenticationResponse.success(usuario.getEmail(), List.of(usuario.getRole())));
                    emitter.complete();
                    return;
                } else {
                    log.warn("Falha de autenticação (senha inválida) para o usuário: {}", normalizedEmail);
                }
            } else {
                log.warn("Falha de autenticação (usuário inexistente): {}", normalizedEmail);
            }

            emitter.error(AuthenticationResponse.exception("Email ou senha inválidos"));
        });
    }
}
