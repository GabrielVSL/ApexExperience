package com.aluguel.controllers;

import com.aluguel.queue.ReservaQueueEngine;
import com.aluguel.repositories.AutomovelRepository;
import com.aluguel.repositories.CircuitoRepository;
import com.aluguel.repositories.PedidoRepository;
import com.aluguel.repositories.TrackSlotRepository;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

@Controller("/api")
@Secured(SecurityRule.IS_ANONYMOUS)
public class SystemHealthController {

    private final CircuitoRepository circuitoRepository;
    private final AutomovelRepository automovelRepository;
    private final TrackSlotRepository trackSlotRepository;
    private final PedidoRepository pedidoRepository;
    private final ReservaQueueEngine queueEngine;
    private final boolean resendConfigured;
    private final String resendFrom;

    public SystemHealthController(
            CircuitoRepository circuitoRepository,
            AutomovelRepository automovelRepository,
            TrackSlotRepository trackSlotRepository,
            PedidoRepository pedidoRepository,
            ReservaQueueEngine queueEngine,
            @Nullable @Value("${resend.api.key:}") String resendApiKey,
            @Nullable @Value("${resend.from:Apex Track Experience <onboarding@resend.dev>}") String resendFrom
    ) {
        this.circuitoRepository = circuitoRepository;
        this.automovelRepository = automovelRepository;
        this.trackSlotRepository = trackSlotRepository;
        this.pedidoRepository = pedidoRepository;
        this.queueEngine = queueEngine;
        this.resendConfigured = resendApiKey != null && !resendApiKey.isBlank();
        this.resendFrom = resendFrom != null && !resendFrom.isBlank()
                ? resendFrom
                : "Apex Track Experience <onboarding@resend.dev>";
    }

    @Get("/health")
    public HttpResponse<Map<String, Object>> health() {
        return HttpResponse.ok(buildSystemReport());
    }

    @Get("/system/status")
    public HttpResponse<Map<String, Object>> systemStatus() {
        return HttpResponse.ok(buildSystemReport());
    }

    private Map<String, Object> buildSystemReport() {
        Map<String, Object> runtime = new LinkedHashMap<>();
        runtime.put("javaVersion", System.getProperty("java.version"));
        runtime.put("virtualThreads", true);

        Map<String, Object> database = new LinkedHashMap<>();
        try {
            long totalSessoes = pedidoRepository.count();
            long sessoesComQrCode = pedidoRepository.countComQrCode();
            database.put("status", "UP");
            database.put("circuitos", circuitoRepository.count());
            database.put("supercarrosFixos", automovelRepository.count());
            database.put("slotsAtivos", trackSlotRepository.count());
            database.put("totalSessoes", totalSessoes);
            database.put("sessoesComQrCode", sessoesComQrCode);
        } catch (Exception e) {
            database.put("status", "DOWN");
            database.put("error", e.getMessage());
        }

        Map<String, Object> emailGateway = new LinkedHashMap<>();
        emailGateway.put("provider", "Resend");
        emailGateway.put("configured", resendConfigured);
        emailGateway.put("fromAddress", resendFrom);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("status", "UP".equals(database.get("status")) ? "UP" : "DEGRADED");
        report.put("timestamp", LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS).toString());
        report.put("runtime", runtime);
        report.put("database", database);
        report.put("bookingQueue", queueEngine.getMetricas());
        report.put("emailGateway", emailGateway);
        return report;
    }
}
