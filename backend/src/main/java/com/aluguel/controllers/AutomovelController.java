package com.aluguel.controllers;

import com.aluguel.facades.AutomovelFacade;
import com.aluguel.models.Automovel;
import com.aluguel.repositories.AutomovelRepository;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;

@Controller("/api/automoveis")
public class AutomovelController {

    private final AutomovelFacade facade;
    private final AutomovelRepository automovelRepository;

    public AutomovelController(AutomovelFacade facade, AutomovelRepository automovelRepository) {
        this.facade = facade;
        this.automovelRepository = automovelRepository;
    }

    @Post
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> criar(@Body Automovel automovel, Principal principal) {
        return HttpResponse.badRequest(Map.of(
                "message", "A frota Apex Racing é exclusiva e imutável. Não é permitido criar novos veículos na coleção fixa."
        ));
    }

    @Get("/minha-frota")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> listarMinhaFrota(Principal principal) {
        try {
            return HttpResponse.ok(facade.listarPorProprietario(principal.getName()));
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }

    @Put("/{id}")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> atualizar(@PathVariable Long id, @Body Automovel automovel, Principal principal) {
        return HttpResponse.badRequest(Map.of(
                "message", "A frota Apex Racing é exclusiva e imutável. Não é permitido alterar as especificações dos supercarros da coleção fixa."
        ));
    }

    @Delete("/{id}")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> excluir(@PathVariable Long id, Principal principal) {
        return HttpResponse.badRequest(Map.of(
                "message", "A frota Apex Racing é exclusiva e imutável. Não é permitido remover veículos da coleção fixa."
        ));
    }

    @Get("/{id}")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> buscarPorId(@PathVariable Long id) {
        try {
            return HttpResponse.ok(facade.buscarPorId(id));
        } catch (IllegalArgumentException e) {
            return HttpResponse.notFound(Map.of("message", e.getMessage()));
        }
    }

    @Get
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> listarAutomoveis(
            @Nullable @QueryValue String inicio,
            @Nullable @QueryValue String fim,
            @Nullable @QueryValue String circuitoId) {

        try {
            if (circuitoId != null && !circuitoId.isBlank()) {
                return HttpResponse.ok(automovelRepository.findDisponiveisNoCircuito(circuitoId));
            }
            if (inicio != null && fim != null) {
                LocalDateTime dataInicio = LocalDateTime.parse(inicio);
                LocalDateTime dataFim = LocalDateTime.parse(fim);

                return HttpResponse.ok(automovelRepository.findDisponiveis(dataInicio, dataFim));
            }

            return HttpResponse.ok(facade.listarTodos());
        } catch (Exception e) {
            return HttpResponse.badRequest(Map.of("message", e.getMessage()));
        }
    }
}
