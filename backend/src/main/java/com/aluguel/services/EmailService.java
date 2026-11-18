package com.aluguel.services;

import io.micronaut.context.annotation.Value;
import io.micronaut.core.annotation.Nullable;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicInteger;

@Singleton
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    // --- TETOS DE PROTEÇÃO ANTI-SPAM E COTA DIÁRIA ---
    public static final int MAX_DISPAROS_GLOBAIS_DIA = 90;
    public static final int MAX_DISPAROS_POR_EMAIL_24H = 3;
    public static final int MAX_TENTATIVAS_POR_IP_1H = 5;

    private LocalDate dataCorrente = LocalDate.now();
    private final AtomicInteger disparosGlobaisHoje = new AtomicInteger(0);
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Instant>> historicoPorEmail = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Instant>> historicoPorIp = new ConcurrentHashMap<>();

    private final String resendApiKey;
    private final String fromAddress;
    private final String resendApiUrl;
    private final HttpClient httpClient;

    @Inject
    public EmailService(@Nullable @Value("${resend.api.key:}") String resendApiKey,
                        @Nullable @Value("${resend.from:}") String fromAddress,
                        @Nullable @Value("${resend.api.url:}") String resendApiUrl) {
        this.resendApiKey = resendApiKey != null ? resendApiKey.trim() : "";
        this.fromAddress = (fromAddress != null && !fromAddress.isBlank())
                ? fromAddress.trim()
                : "Apex Track Experience <onboarding@resend.dev>";
        this.resendApiUrl = normalizarResendUrl(resendApiUrl);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    static String normalizarResendUrl(@Nullable String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "https://api.resend.com/emails";
        }
        String trimmed = rawUrl.trim();
        if (trimmed.startsWith("//")) {
            return "https:" + trimmed;
        }
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            return "https://" + trimmed;
        }
        return trimmed;
    }

    public EmailService(String resendApiKey, String fromAddress) {
        this(resendApiKey, fromAddress, "https://api.resend.com/emails");
    }

    public boolean isConfigurado() {
        return !resendApiKey.isEmpty();
    }

    public String getFromAddress() {
        return fromAddress;
    }

    public String getResendApiUrl() {
        return resendApiUrl;
    }

    /**
     * Valida os tetos de segurança anti-spam antes de disparar códigos de recuperação.
     */
    public void validarLimitesAntiSpam(String email, @Nullable String clientIp) {
        LocalDate hoje = LocalDate.now();
        synchronized (this) {
            if (!hoje.equals(dataCorrente)) {
                dataCorrente = hoje;
                disparosGlobaisHoje.set(0);
            }
        }
        if (disparosGlobaisHoje.get() >= MAX_DISPAROS_GLOBAIS_DIA) {
            log.warn("🚨 Teto diário de segurança da API de E-mail atingido ({} envios hoje).", disparosGlobaisHoje.get());
            throw new IllegalStateException("Limite diário de envio de e-mails do sistema atingido. Por segurança, tente novamente amanhã ou contate o suporte.");
        }

        if (clientIp != null && !clientIp.isBlank()) {
            Instant umHoraAtras = Instant.now().minus(Duration.ofHours(1));
            ConcurrentLinkedDeque<Instant> timestampsIp = historicoPorIp.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>());
            timestampsIp.removeIf(instant -> instant.isBefore(umHoraAtras));
            if (timestampsIp.size() >= MAX_TENTATIVAS_POR_IP_1H) {
                log.warn("⚠️ IP {} atingiu o limite de {} solicitações de recuperação em 1h.", clientIp, MAX_TENTATIVAS_POR_IP_1H);
                throw new IllegalArgumentException("Muitas tentativas a partir deste dispositivo ou rede. Aguarde 1 hora antes de solicitar novamente.");
            }
        }

        String emailLimpo = normalizarEmail(email);
        Instant vinteQuatroHorasAtras = Instant.now().minus(Duration.ofHours(24));
        ConcurrentLinkedDeque<Instant> timestampsEmail = historicoPorEmail.computeIfAbsent(emailLimpo, k -> new ConcurrentLinkedDeque<>());
        timestampsEmail.removeIf(instant -> instant.isBefore(vinteQuatroHorasAtras));
        if (timestampsEmail.size() >= MAX_DISPAROS_POR_EMAIL_24H) {
            log.warn("⚠️ E-mail {} atingiu o limite de {} solicitações de recuperação em 24h.", emailLimpo, MAX_DISPAROS_POR_EMAIL_24H);
            throw new IllegalArgumentException("Limite de 3 códigos por e-mail atingido nas últimas 24 horas. Por segurança, tente mais tarde.");
        }
    }

    /**
     * Registra o envio bem-sucedido nos contadores anti-spam.
     */
    public void registrarEnvio(String email, @Nullable String clientIp) {
        disparosGlobaisHoje.incrementAndGet();
        String emailLimpo = normalizarEmail(email);
        historicoPorEmail.computeIfAbsent(emailLimpo, k -> new ConcurrentLinkedDeque<>()).add(Instant.now());
        if (clientIp != null && !clientIp.isBlank()) {
            historicoPorIp.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>()).add(Instant.now());
        }
    }

    /**
     * Dispara código OTP de 6 dígitos para recuperação de senha por e-mail.
     */
    public boolean enviarCodigo(String email, String codigo) {
        return enviarCodigo(email, null, codigo);
    }

    public boolean enviarCodigo(String email, @Nullable String nome, String codigo) {
        String primeiroNome = extrairPrimeiroNome(nome);
        String subject = "Código de Segurança Apex: " + codigo;
        String bodyHtml = """
                <p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                  Olá, <strong style="color:#ffffff;">%s</strong>. Recebemos uma solicitação para redefinir sua senha no Paddock Apex.
                </p>
                <div style="margin:24px 0;padding:22px;border-radius:14px;background:#121726;border:1px solid #263047;text-align:center;">
                  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">
                    Código de Verificação
                  </div>
                  <div style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:#ffffff;">
                    %s
                  </div>
                </div>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  Este código expira em <strong>10 minutos</strong>. Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.
                </p>
                """.formatted(escapeHtml(primeiroNome), escapeHtml(codigo));

        String text = String.format(
                "Apex Track Experience\n\nOlá, %s! Seu código de segurança para redefinição de senha é: %s\nVálido por 10 minutos.",
                primeiroNome, codigo
        );

        return enviarEmail(email, subject, wrapEmailLayout("Recuperação de Acesso", bodyHtml), text);
    }

    /**
     * Dispara e-mail de Boas-Vindas no cadastro inicial do piloto.
     */
    public boolean enviarBoasVindas(String email, String nome) {
        String primeiroNome = extrairPrimeiroNome(nome);
        String subject = "Bem-vindo ao Paddock Apex Track Experience";
        String bodyHtml = """
                <p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                  Olá, <strong style="color:#ffffff;">%s</strong>! Sua credencial de piloto foi homologada na Apex Track Experience.
                </p>
                <div style="margin:20px 0;padding:18px;border-radius:14px;background:#121726;border:1px solid #263047;">
                  <p style="margin:0 0 8px;color:#e2e8f0;font-size:14px;">• <strong>Credencial:</strong> Paddock &amp; Boxes liberados</p>
                  <p style="margin:0;color:#e2e8f0;font-size:14px;">• <strong>Carteira ApexPay:</strong> Pronta para recargas e reservas instantâneas</p>
                </div>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  Explore nossa garagem de superesportivos e agende sua próxima sessão nos circuitos oficiais. Nos vemos no grid de largada!
                </p>
                """.formatted(escapeHtml(primeiroNome));

        String text = String.format(
                "Bem-vindo ao Paddock Apex, %s! Sua credencial foi criada com sucesso e sua carteira ApexPay está pronta.",
                primeiroNome
        );

        return enviarEmail(email, subject, wrapEmailLayout("Credencial Liberada", bodyHtml), text);
    }

    public void enviarBoasVindasAsync(String email, String nome) {
        CompletableFuture.runAsync(() -> {
            try {
                enviarBoasVindas(email, nome);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível enviar e-mail de boas-vindas para {}: {}", email, e.getMessage());
            }
        });
    }

    /**
     * Dispara confirmação de depósito na carteira digital ApexPay.
     */
    public boolean enviarConfirmacaoDeposito(String email, String nome, BigDecimal valor, BigDecimal saldoAtual) {
        String primeiroNome = extrairPrimeiroNome(nome);
        String valorFormatado = formatarMoeda(valor);
        String saldoFormatado = formatarMoeda(saldoAtual);
        String subject = "Depósito Confirmado · ApexPay (" + valorFormatado + ")";

        String bodyHtml = """
                <p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                  Olá, <strong style="color:#ffffff;">%s</strong>! Sua recarga na carteira digital <strong style="color:#ffffff;">ApexPay</strong> foi creditada.
                </p>
                <div style="margin:20px 0;padding:18px;border-radius:14px;background:#121726;border:1px solid #263047;">
                  <p style="margin:0 0 8px;color:#34d399;font-size:15px;font-weight:700;">Valor Creditado: +%s</p>
                  <p style="margin:0;color:#e2e8f0;font-size:14px;">Saldo Atual Disponível: <strong>%s</strong></p>
                </div>
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  Seu saldo já está pronto para reservar sessões de pista e experiências exclusivas.
                </p>
                """.formatted(escapeHtml(primeiroNome), escapeHtml(valorFormatado), escapeHtml(saldoFormatado));

        String text = String.format(
                "ApexPay · Olá, %s! Depósito de %s confirmado. Saldo atual: %s.",
                primeiroNome, valorFormatado, saldoFormatado
        );

        return enviarEmail(email, subject, wrapEmailLayout("ApexPay · Crédito Confirmado", bodyHtml), text);
    }

    public void enviarConfirmacaoDepositoAsync(String email, String nome, BigDecimal valor, BigDecimal saldoAtual) {
        CompletableFuture.runAsync(() -> {
            try {
                enviarConfirmacaoDeposito(email, nome, valor, saldoAtual);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível enviar e-mail de depósito para {}: {}", email, e.getMessage());
            }
        });
    }

    /**
     * Dispara confirmação de reserva de sessão de pista com QR Code do Box.
     */
    public boolean enviarConfirmacaoReserva(String email, String nome, String carro, String pista, String dataHora, Long pedidoId) {
        return enviarConfirmacaoReserva(email, nome, carro, pista, dataHora, pedidoId, null);
    }

    public boolean enviarConfirmacaoReserva(String email, String nome, String carro, String pista, String dataHora, Long pedidoId, @Nullable String qrPayload) {
        String primeiroNome = extrairPrimeiroNome(nome);
        String passCode = String.format("#APX-%05d", pedidoId != null ? pedidoId : 0L);
        String conteudoQr = (qrPayload != null && !qrPayload.isBlank())
                ? qrPayload
                : String.format("APEX-PADDOCK-PASS-%d", pedidoId != null ? pedidoId : 0L);
        String qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=280x280&data="
                + URLEncoder.encode(conteudoQr, StandardCharsets.UTF_8);

        String subject = "Reserva Homologada " + passCode + " · Apex Track Experience";
        String bodyHtml = """
                <p style="margin:0 0 14px;color:#cbd5e1;font-size:15px;line-height:1.6;">
                  Olá, <strong style="color:#ffffff;">%s</strong>! Sua sessão de pista foi homologada com sucesso.
                </p>
                <div style="margin:20px 0;padding:18px;border-radius:14px;background:#121726;border:1px solid #263047;">
                  <p style="margin:0 0 6px;color:#e2e8f0;font-size:14px;"><strong>PassCode do Box:</strong> %s</p>
                  <p style="margin:0 0 6px;color:#e2e8f0;font-size:14px;"><strong>Veículo:</strong> %s</p>
                  <p style="margin:0 0 6px;color:#e2e8f0;font-size:14px;"><strong>Circuito:</strong> %s</p>
                  <p style="margin:0;color:#e2e8f0;font-size:14px;"><strong>Data / Turno:</strong> %s</p>
                </div>
                <div style="margin:22px 0;text-align:center;">
                  <div style="display:inline-block;padding:14px;background:#ffffff;border-radius:14px;">
                    <img src="%s" alt="QR Code da Credencial %s" width="220" height="220" style="display:block;border:0;" />
                  </div>
                  <p style="margin:10px 0 0;color:#94a3b8;font-size:12px;">
                    Apresente este QR Code na portaria dos boxes para liberação do veículo na pista.
                  </p>
                </div>
                """.formatted(
                escapeHtml(primeiroNome),
                escapeHtml(passCode),
                escapeHtml(carro != null ? carro : "Sessão Apex"),
                escapeHtml(pista != null ? pista : "Circuito Oficial"),
                escapeHtml(dataHora != null ? dataHora : "Confirmado"),
                escapeHtml(qrUrl),
                escapeHtml(passCode)
        );

        String text = String.format(
                "Reserva Confirmada %s · Olá, %s! Veículo: %s | Circuito: %s | Data: %s | Passe QR: %s",
                passCode, primeiroNome, carro, pista, dataHora, qrUrl
        );

        return enviarEmail(email, subject, wrapEmailLayout("Passe do Box Confirmado", bodyHtml), text);
    }

    public void enviarConfirmacaoReservaAsync(String email, String nome, String carro, String pista, String dataHora, Long pedidoId) {
        enviarConfirmacaoReservaAsync(email, nome, carro, pista, dataHora, pedidoId, null);
    }

    public void enviarConfirmacaoReservaAsync(String email, String nome, String carro, String pista, String dataHora, Long pedidoId, @Nullable String qrPayload) {
        CompletableFuture.runAsync(() -> {
            try {
                enviarConfirmacaoReserva(email, nome, carro, pista, dataHora, pedidoId, qrPayload);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível enviar passe de reserva por e-mail para {}: {}", email, e.getMessage());
            }
        });
    }

    /**
     * Envia e-mail transacional via Resend API (HTTPS).
     */
    public boolean enviarEmail(String destinatario, String assunto, String htmlBody, @Nullable String textBody) {
        String emailLimpo = normalizarEmail(destinatario);
        if (emailLimpo.isEmpty() || !emailLimpo.contains("@")) {
            log.warn("⚠️ E-mail destinatário inválido ignorado: {}", destinatario);
            return false;
        }

        if (!isConfigurado()) {
            log.warn("🔒 [EMAIL LOCAL DEV - RESEND_API_KEY não configurada] Para: {} | Assunto: {} | Texto:\n{}", emailLimpo, assunto, textBody);
            return false;
        }

        try {
            String payload = buildResendPayload(fromAddress, emailLimpo, assunto, htmlBody, textBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(resendApiUrl))
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(8))
                    .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("✉️ E-mail entregue via Resend para {}: {}", emailLimpo, response.body());
                return true;
            }

            log.error("❌ Resend recusou envio para {} (Status {}): {}", emailLimpo, response.statusCode(), response.body());
        } catch (Exception e) {
            log.error("❌ Falha na requisição para Resend API: {}", e.getMessage());
        }
        return false;
    }

    static String buildResendPayload(String from, String to, String subject, String html, @Nullable String text) {
        StringBuilder sb = new StringBuilder();
        sb.append('{');
        sb.append("\"from\":\"").append(escapeJson(from)).append("\",");
        sb.append("\"to\":[\"").append(escapeJson(to)).append("\"],");
        sb.append("\"subject\":\"").append(escapeJson(subject)).append("\",");
        sb.append("\"html\":\"").append(escapeJson(html)).append("\"");
        if (text != null && !text.isBlank()) {
            sb.append(",\"text\":\"").append(escapeJson(text)).append("\"");
        }
        sb.append('}');
        return sb.toString();
    }

    private String wrapEmailLayout(String badgeTitle, String innerHtml) {
        return """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <body style="margin:0;padding:24px 12px;background:#07090e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  <div style="max-width:560px;margin:0 auto;background:#0d111a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;">
                    <div style="padding:24px 28px;border-bottom:1px solid #1e293b;background:#0a0d14;">
                      <div style="font-size:11px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#ff1717;margin-bottom:6px;">
                        APEX TRACK EXPERIENCE
                      </div>
                      <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">%s</h1>
                    </div>
                    <div style="padding:28px;">
                      %s
                    </div>
                    <div style="padding:18px 28px;border-top:1px solid #1e293b;background:#0a0d14;color:#64748b;font-size:11px;text-align:center;">
                      Apex Track Experience · Paddock Digital &amp; Race Control
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(escapeHtml(badgeTitle), innerHtml);
    }

    private String extrairPrimeiroNome(@Nullable String nome) {
        if (nome == null || nome.isBlank()) {
            return "Piloto";
        }
        return nome.trim().split("\\s+")[0];
    }

    private String normalizarEmail(@Nullable String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String formatarMoeda(@Nullable BigDecimal valor) {
        BigDecimal safe = valor != null ? valor : BigDecimal.ZERO;
        return NumberFormat.getCurrencyInstance(PT_BR).format(safe);
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }
}
