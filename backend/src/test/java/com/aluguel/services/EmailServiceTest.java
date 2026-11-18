package com.aluguel.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class EmailServiceTest {

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService("re_test_key", "Apex Track <noreply@apex.test>");
    }

    @Test
    @DisplayName("Deve permitir envios dentro dos limites normais")
    void devePermitirEnviosDentroDosLimites() {
        assertDoesNotThrow(() ->
                emailService.validarLimitesAntiSpam("piloto@apex.com", "192.168.1.100")
        );
        assertTrue(emailService.isConfigurado());
    }

    @Test
    @DisplayName("Deve bloquear após exceder 3 envios para o mesmo e-mail em 24h")
    void deveBloquearAposTresEnviosMesmoEmail() {
        String email = "piloto@apex.com";
        String ip = "192.168.1.10";

        emailService.registrarEnvio(email, ip);
        emailService.registrarEnvio(email, ip);
        emailService.registrarEnvio(email, ip);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                emailService.validarLimitesAntiSpam("PILOTO@APEX.COM", ip)
        );
        assertTrue(ex.getMessage().contains("Limite de 3 códigos por e-mail atingido nas últimas 24 horas"));
    }

    @Test
    @DisplayName("Deve bloquear após exceder 5 requisições do mesmo IP em 1 hora")
    void deveBloquearAposCincoRequisicoesMesmoIp() {
        String ip = "203.0.113.50";

        for (int i = 1; i <= 5; i++) {
            emailService.registrarEnvio("piloto" + i + "@apex.com", ip);
        }

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                emailService.validarLimitesAntiSpam("outro@apex.com", ip)
        );
        assertTrue(ex.getMessage().contains("Muitas tentativas a partir deste dispositivo ou rede"));
    }

    @Test
    @DisplayName("Deve bloquear se o teto diário global de envios for atingido")
    void deveBloquearAoAtingirTetoDiarioGlobal() {
        for (int i = 0; i < EmailService.MAX_DISPAROS_GLOBAIS_DIA; i++) {
            emailService.registrarEnvio("piloto" + i + "@apex.com", "10.0.0." + (i % 50));
        }

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                emailService.validarLimitesAntiSpam("novo@apex.com", "189.10.20.30")
        );
        assertTrue(ex.getMessage().contains("Limite diário de envio de e-mails do sistema atingido"));
    }

    @Test
    @DisplayName("Deve retornar false com segurança quando RESEND_API_KEY não estiver configurada")
    void deveRetornarFalseSemApiKey() {
        EmailService unconfigured = new EmailService("", "Apex <noreply@apex.test>");
        assertFalse(unconfigured.isConfigurado());
        assertFalse(unconfigured.enviarCodigo("piloto@apex.com", "Gabriel", "123456"));
    }

    @Test
    @DisplayName("Deve montar payload JSON válido escapando aspas e quebras de linha")
    void deveMontarPayloadResendValido() {
        String json = EmailService.buildResendPayload(
                "Apex \"Track\" <noreply@apex.test>",
                "piloto@apex.com",
                "Assunto \"Teste\"",
                "<p>Linha 1\nLinha 2</p>",
                "Texto\tcom tab"
        );
        assertTrue(json.contains("\"from\":\"Apex \\\"Track\\\" <noreply@apex.test>\""));
        assertTrue(json.contains("\"to\":[\"piloto@apex.com\"]"));
        assertTrue(json.contains("<p>Linha 1\\nLinha 2</p>"));
        assertTrue(json.contains("\"text\":\"Texto\\tcom tab\""));
    }

    @Test
    @DisplayName("Deve normalizar URL da Resend API preservando scheme https")
    void deveNormalizarUrlComSchemeHttps() {
        assertEquals("https://api.resend.com/emails", EmailService.normalizarResendUrl(null));
        assertEquals("https://api.resend.com/emails", EmailService.normalizarResendUrl(""));
        assertEquals("https://api.resend.com/emails", EmailService.normalizarResendUrl("//api.resend.com/emails"));
        assertEquals("https://api.resend.com/emails", EmailService.normalizarResendUrl("https://api.resend.com/emails"));
    }
}
