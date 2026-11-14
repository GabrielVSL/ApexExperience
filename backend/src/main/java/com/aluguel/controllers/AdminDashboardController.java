package com.aluguel.controllers;

import com.aluguel.facades.AdminDashboardFacade;
import com.aluguel.queue.ReservaQueueEngine;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

import java.math.BigDecimal;
import java.util.Map;

@Controller("/api/admin")
public class AdminDashboardController {

    private final AdminDashboardFacade facade;
    private final ReservaQueueEngine queueEngine;

    public AdminDashboardController(AdminDashboardFacade facade, ReservaQueueEngine queueEngine) {
        this.facade = facade;
        this.queueEngine = queueEngine;
    }

    @Get("/dashboard")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> getDashboard() {
        return HttpResponse.ok(facade.getMetricasDashboard());
    }

    @Get("/dashboard/publico")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> getDashboardPublico() {
        return HttpResponse.ok(facade.getMetricasDashboard());
    }

    @Post("/clientes/{id}/aplicar-juros")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> aplicarJurosCliente(@PathVariable Long id) {
        try {
            return HttpResponse.ok(facade.aplicarJurosCliente(id));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Post("/pedidos/{id}/sinistro")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> registrarSinistro(@PathVariable Long id, @Body Map<String, Object> payload) {
        try {
            Object valorObj = payload.get("valor");
            if (valorObj == null) {
                return HttpResponse.badRequest(Map.of("message", "Campo 'valor' é obrigatório."));
            }
            BigDecimal valor = new BigDecimal(valorObj.toString());
            String motivo = payload.get("motivo") != null ? payload.get("motivo").toString() : null;
            return HttpResponse.ok(facade.registrarSinistro(id, valor, motivo));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Get("/queue/dlq")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> getDeadLetterQueue() {
        return HttpResponse.ok(Map.of(
                "dlqNome", "apex.reservas.dlq",
                "totalItens", queueEngine.getDeadLetterQueue().size(),
                "itens", queueEngine.getDeadLetterQueue()
        ));
    }

    // --- 🏎️ GESTÃO COMPLETA DE PILOTOS / USUÁRIOS (CRUD COMPLETO RACE CONTROL) ---

    @Post("/usuarios")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> criarUsuario(@Body Map<String, Object> payload) {
        try {
            return HttpResponse.created(facade.criarUsuarioAdmin(payload));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao cadastrar novo piloto."));
        }
    }

    @Get("/usuarios")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> listarUsuarios(@QueryValue(defaultValue = "") String busca,
                                          @QueryValue(defaultValue = "TODOS") String status) {
        return HttpResponse.ok(facade.listarUsuariosAdmin(busca, status));
    }

    @Get("/usuarios/{id}")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> buscarUsuarioDetalhes(@PathVariable Long id) {
        try {
            return HttpResponse.ok(facade.buscarUsuarioDetalhesAdmin(id));
        } catch (IllegalArgumentException e) {
            return HttpResponse.notFound(Map.of("message", e.getMessage()));
        }
    }

    @Put("/usuarios/{id}")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> atualizarUsuario(@PathVariable Long id, @Body Map<String, Object> payload) {
        try {
            return HttpResponse.ok(facade.atualizarUsuarioAdmin(id, payload));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao atualizar dados do piloto."));
        }
    }

    @Delete("/usuarios/{id}")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> excluirUsuario(@PathVariable Long id) {
        try {
            return HttpResponse.ok(facade.excluirUsuarioAdmin(id));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", "Falha ao excluir/desativar piloto."));
        }
    }
}
