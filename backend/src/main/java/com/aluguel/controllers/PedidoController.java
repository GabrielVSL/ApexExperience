package com.aluguel.controllers;

import com.aluguel.facades.PedidoFacade;
import com.aluguel.models.Pedido;
import com.aluguel.queue.ReservaMensagem;
import com.aluguel.queue.ReservaQueueEngine;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import java.security.Principal;
import java.util.Map;

@Controller("/api/pedidos")
public class PedidoController {

    private final PedidoFacade facade;
    private final ReservaQueueEngine queueEngine;

    public PedidoController(PedidoFacade facade, ReservaQueueEngine queueEngine) {
        this.facade = facade;
        this.queueEngine = queueEngine;
    }

    @Post
    @Secured("ROLE_CLIENTE")
    public HttpResponse<?> criar(@Body Pedido pedido, Principal principal) {
        try {
            Pedido salvo = facade.criarPedido(pedido, principal.getName());
            queueEngine.registrarSucessoSincrono(salvo);
            return HttpResponse.created(salvo);
        } catch (IllegalArgumentException | IllegalStateException e) {
            queueEngine.registrarFalhaSincrona(pedido, principal.getName(), e.getMessage());
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Post("/async")
    @Secured("ROLE_CLIENTE")
    public HttpResponse<?> criarAssincrono(@Body ReservaMensagem msg, Principal principal) {
        try {
            msg.setEmailCliente(principal.getName());
            ReservaMensagem enfileirada = queueEngine.enfileirar(msg);
            return HttpResponse.accepted().body(Map.of(
                    "status", "ACCEPTED",
                    "trackingId", enfileirada.getTrackingId(),
                    "message", "Agendamento aceito e enfileirado para processamento assíncrono.",
                    "dataHora", enfileirada.getDataHoraEnfileiramento()
            ));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Put("/{id}/avaliar")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> avaliar(@PathVariable Long id, @QueryValue String status, Principal principal) {
        try {
            Pedido avaliado = facade.avaliarPedido(id, principal.getName(), status);
            return HttpResponse.ok(avaliado);
        } catch (IllegalArgumentException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Get
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> listarPedidos(Principal principal) {
        return HttpResponse.ok(facade.listarPedidosParaAgente(principal.getName()));
    }

    @Get("/ocupados/{automovelId}")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> buscarDatasOcupadas(@PathVariable Long automovelId) {
        try {
            return HttpResponse.ok(facade.buscarDatasOcupadas(automovelId));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Put("/{id}/modificar")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> modificar(@PathVariable Long id, @Body Pedido pedido, Principal principal) {
        try {
            return HttpResponse.ok(facade.modificarPedidoAgente(id, principal.getName(), pedido));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Put("/{id}/responder-revisao")
    @Secured("ROLE_CLIENTE")
    public HttpResponse<?> responderRevisao(@PathVariable Long id, @QueryValue boolean aceito, Principal principal) {
        try {
            return HttpResponse.ok(facade.responderContrapropostaCliente(id, principal.getName(), aceito));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Put("/{id}/cancelar")
    @Secured("ROLE_CLIENTE")
    public HttpResponse<?> cancelarPedido(@PathVariable Long id, Principal principal) {
        try {
            return HttpResponse.ok(facade.cancelarPedidoCliente(id, principal.getName()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Get("/meus")
    @Secured("ROLE_CLIENTE")
    public HttpResponse<?> listarMeusPedidos(Principal principal) {
        return HttpResponse.ok(facade.listarPedidosDoCliente(principal.getName()));
    }

    @Get("/fila/metricas")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> obterMetricasFila() {
        return HttpResponse.ok(queueEngine.getMetricas());
    }

    @Get("/{id}/qrcode")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> obterQrCodeSessao(@PathVariable Long id, Principal principal) {
        try {
            return HttpResponse.ok(facade.obterQrCodeSessao(id, principal.getName()));
        } catch (IllegalStateException e) {
            return HttpResponse.status(io.micronaut.http.HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return HttpResponse.notFound(Map.of("message", e.getMessage()));
        }
    }

    @Post("/validar-qrcode")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> validarQrCode(@Body Map<String, Object> body, Principal principal) {
        try {
            String qrData = body != null && body.get("qrData") != null ? body.get("qrData").toString() : "";
            boolean registrarCheckIn = body != null && Boolean.TRUE.equals(body.get("registrarCheckIn"));
            return HttpResponse.ok(facade.validarQrCodeSessao(qrData, registrarCheckIn, principal.getName()));
        } catch (IllegalStateException e) {
            return HttpResponse.status(io.micronaut.http.HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Post("/qrcode/task")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> executarTaskQrCodes(Principal principal) {
        try {
            return HttpResponse.ok(facade.executarTaskQrCodesAdmin(principal.getName()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }
}
