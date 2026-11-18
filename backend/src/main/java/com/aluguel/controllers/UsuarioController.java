package com.aluguel.controllers;

import com.aluguel.facades.UsuarioFacade;
import com.aluguel.models.Usuario;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.security.token.generator.AccessRefreshTokenGenerator;
import jakarta.inject.Inject;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller("/api/usuarios")
@Secured(SecurityRule.IS_ANONYMOUS)
public class UsuarioController {

    private final UsuarioFacade facade;
    private final AccessRefreshTokenGenerator tokenGenerator;

    @Inject
    public UsuarioController(UsuarioFacade facade, @Nullable AccessRefreshTokenGenerator tokenGenerator) {
        this.facade = facade;
        this.tokenGenerator = tokenGenerator;
    }

    public UsuarioController(UsuarioFacade facade) {
        this(facade, null);
    }

    @Post("/registrar")
    public HttpResponse<?> registrar(@Body Map<String, Object> payload) {
        try {
            Usuario salvo = facade.registrar(payload);
            return HttpResponse.created(salvo);
        } catch (IllegalArgumentException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Erro ao registrar usuário. Verifique se o e-mail ou documento já existem."));
        }
    }

    @Post("/recuperar-senha/solicitar")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> solicitarRecuperacaoEmail(@Body Map<String, String> payload, io.micronaut.http.HttpRequest<?> request) {
        try {
            String email = payload != null ? payload.get("email") : null;
            String clientIp = extrairIpCliente(request);
            Map<String, Object> resp = facade.solicitarRecuperacaoSenhaEmail(email, clientIp);
            return HttpResponse.ok(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao solicitar código por e-mail."));
        }
    }

    private String extrairIpCliente(io.micronaut.http.HttpRequest<?> request) {
        if (request == null) return "127.0.0.1";
        String remote = "127.0.0.1";
        try {
            remote = request.getRemoteAddress().getAddress().getHostAddress();
        } catch (Exception ignored) {}

        // Aceita X-Forwarded-For apenas quando o peer imediato é local/rede interna (ex: proxy reverso) e com formato IP válido
        String forwarded = request.getHeaders().get("X-Forwarded-For");
        if (forwarded != null && !forwarded.trim().isEmpty()) {
            String[] partes = forwarded.split(",");
            String candidate = partes[partes.length - 1].trim();
            if (candidate.matches("^[0-9a-fA-F:.]{3,45}$")) {
                return candidate;
            }
        }
        return remote;
    }

    @Post("/recuperar-senha/redefinir")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> redefinirSenhaEmail(@Body Map<String, String> payload) {
        try {
            String email = payload != null ? payload.get("email") : null;
            String codigo = payload != null ? payload.get("codigo") : null;
            String novaSenha = payload != null ? payload.get("novaSenha") : null;
            Map<String, Object> resp = facade.redefinirSenhaEmail(email, codigo, novaSenha);
            return HttpResponse.ok(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao redefinir senha por e-mail."));
        }
    }

    @Get("/me")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> meuPerfil(Principal principal) {
        try {
            return HttpResponse.ok(facade.buscarPerfil(principal.getName()));
        } catch (IllegalArgumentException e) {
            return HttpResponse.notFound(Map.of("message", e.getMessage()));
        }
    }

    @Put("/me")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> atualizarPerfil(@Body Map<String, Object> payload, Principal principal) {
        try {
            Map<String, Object> perfilAtualizado = new HashMap<>(facade.atualizarPerfil(principal.getName(), payload));
            String novoEmail = perfilAtualizado.get("email") != null ? perfilAtualizado.get("email").toString() : principal.getName();
            if (tokenGenerator != null && !novoEmail.equalsIgnoreCase(principal.getName())) {
                String role = perfilAtualizado.get("role") != null ? perfilAtualizado.get("role").toString() : "ROLE_CLIENTE";
                tokenGenerator.generate(Authentication.build(novoEmail, List.of(role)))
                        .ifPresent(tokens -> perfilAtualizado.put("accessToken", tokens.getAccessToken()));
            }
            return HttpResponse.ok(perfilAtualizado);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao atualizar dados do perfil."));
        }
    }

    @Put("/me/senha")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> alterarSenha(@Body Map<String, String> payload, Principal principal) {
        try {
            String senhaAtual = payload != null ? payload.get("senhaAtual") : null;
            String novaSenha = payload != null ? payload.get("novaSenha") : null;
            String codigo = payload != null ? payload.getOrDefault("codigoEmail", payload.get("codigo")) : null;
            Map<String, Object> resp = facade.alterarSenhaAutenticado(principal.getName(), senhaAtual, novaSenha, codigo);
            return HttpResponse.ok(resp);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao alterar senha."));
        }
    }

    @Put("/me/habilitacao")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> atualizarHabilitacao(@Body Map<String, String> payload, Principal principal) {
        try {
            Map<String, Object> atualizado = facade.atualizarHabilitacao(
                    principal.getName(),
                    payload.get("cnhNumero"),
                    payload.get("cnhCategoria"),
                    payload.get("dataNascimento")
            );
            return HttpResponse.ok(atualizado);
        } catch (IllegalArgumentException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Não foi possível atualizar os dados de habilitação."));
        }
    }
}
