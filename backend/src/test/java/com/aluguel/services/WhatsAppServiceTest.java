package com.aluguel.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class WhatsAppServiceTest {

    private WhatsAppService whatsAppService;

    @BeforeEach
    void setUp() {
        whatsAppService = new WhatsAppService("http://localhost:8085", "mockToken", "mockPhoneId");
    }

    @Test
    @DisplayName("Deve permitir envios dentro dos limites normais")
    void devePermitirEnviosDentroDosLimites() {
        assertDoesNotThrow(() ->
            whatsAppService.validarLimitesAntiSpam("11987654321", "192.168.1.100")
        );
    }

    @Test
    @DisplayName("Deve bloquear após exceder 3 envios para o mesmo WhatsApp em 24h")
    void deveBloquearAposTresEnviosMesmoNumero() {
        String telefone = "11987654321";
        String ip = "192.168.1.10";

        // Simula 3 envios registrados
        whatsAppService.registrarEnvio(telefone, ip);
        whatsAppService.registrarEnvio(telefone, ip);
        whatsAppService.registrarEnvio(telefone, ip);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            whatsAppService.validarLimitesAntiSpam(telefone, ip)
        );
        assertTrue(ex.getMessage().contains("Limite de 3 códigos por WhatsApp atingido nas últimas 24 horas"));
    }

    @Test
    @DisplayName("Deve bloquear após exceder 5 requisições do mesmo IP em 1 hora")
    void deveBloquearAposCincoRequisicoesMesmoIp() {
        String ip = "203.0.113.50";

        // Simula 5 envios registrados a partir de telefones diferentes, mas mesmo IP
        for (int i = 1; i <= 5; i++) {
            whatsAppService.registrarEnvio("1198765432" + i, ip);
        }

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            whatsAppService.validarLimitesAntiSpam("11999999999", ip)
        );
        assertTrue(ex.getMessage().contains("Muitas tentativas a partir deste dispositivo ou rede"));
    }

    @Test
    @DisplayName("Deve bloquear se o teto diário global de 30 mensagens for atingido")
    void deveBloquearAoAtingirTetoDiarioGlobal() {
        // Simula 30 envios ao longo do dia em IPs e telefones variados
        for (int i = 0; i < WhatsAppService.MAX_DISPAROS_GLOBAIS_DIA; i++) {
            whatsAppService.registrarEnvio("119000000" + (i % 10), "10.0.0." + (i % 5));
        }

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
            whatsAppService.validarLimitesAntiSpam("11988887777", "189.10.20.30")
        );
        assertTrue(ex.getMessage().contains("Limite diário de envio de mensagens do sistema atingido"));
    }
}
