package com.aluguel.services;

import io.micronaut.context.annotation.Value;
import io.micronaut.core.annotation.Nullable;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.atomic.AtomicInteger;

@Singleton
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    // --- TETOS DE PROTEÇÃO ANTI-SPAM E ANTI-BILLING ---
    public static final int MAX_DISPAROS_GLOBAIS_DIA = 30; // 30/dia * 30 dias = 900 máx (Garante < 1.000 da Meta)
    public static final int MAX_DISPAROS_POR_TELEFONE_24H = 3;
    public static final int MAX_TENTATIVAS_POR_IP_1H = 5;

    private LocalDate dataCorrente = LocalDate.now();
    private final AtomicInteger disparosGlobaisHoje = new AtomicInteger(0);
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Instant>> historicoPorTelefone = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Instant>> historicoPorIp = new ConcurrentHashMap<>();

    private final String serviceUrl;
    private final String metaToken;
    private final String metaPhoneId;
    private final HttpClient httpClient;

    public WhatsAppService(@Value("${whatsapp.service.url:http://localhost:8085}") String serviceUrl,
                           @Nullable @Value("${whatsapp.cloud.token:}") String metaToken,
                           @Nullable @Value("${whatsapp.cloud.phone-number-id:}") String metaPhoneId) {
        this.serviceUrl = serviceUrl;
        this.metaToken = metaToken != null ? metaToken.trim() : "";
        this.metaPhoneId = metaPhoneId != null ? metaPhoneId.trim() : "";
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    public WhatsAppService(String serviceUrl) {
        this(serviceUrl, null, null);
    }

    /**
     * Valida os tetos de segurança anti-spam e cota máxima antes de qualquer processamento.
     * @throws IllegalStateException se o teto global do sistema for atingido
     * @throws IllegalArgumentException se o teto do IP ou do telefone for violado
     */
    public void validarLimitesAntiSpam(String telefone, @Nullable String clientIp) {
        // 1. Teto Global Diário (Evita estourar a cota gratuita de 1.000 da Meta)
        LocalDate hoje = LocalDate.now();
        synchronized (this) {
            if (!hoje.equals(dataCorrente)) {
                dataCorrente = hoje;
                disparosGlobaisHoje.set(0);
            }
        }
        if (disparosGlobaisHoje.get() >= MAX_DISPAROS_GLOBAIS_DIA) {
            log.warn("🚨 Teto diário de segurança da API de WhatsApp atingido ({} envios hoje).", disparosGlobaisHoje.get());
            throw new IllegalStateException("Limite diário de envio de mensagens do sistema atingido. Por segurança, tente novamente amanhã ou contate o suporte.");
        }

        // 2. Teto por IP (Máximo 5 requisições por hora do mesmo IP)
        if (clientIp != null && !clientIp.isBlank()) {
            Instant umHoraAtras = Instant.now().minus(Duration.ofHours(1));
            ConcurrentLinkedDeque<Instant> timestampsIp = historicoPorIp.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>());
            timestampsIp.removeIf(instant -> instant.isBefore(umHoraAtras));
            if (timestampsIp.size() >= MAX_TENTATIVAS_POR_IP_1H) {
                log.warn("⚠️ IP {} atingiu o limite de {} requisições de recuperação em 1h.", clientIp, MAX_TENTATIVAS_POR_IP_1H);
                throw new IllegalArgumentException("Muitas tentativas a partir deste dispositivo ou rede. Aguarde 1 hora antes de solicitar novamente.");
            }
        }

        // 3. Teto por Telefone (Máximo 3 solicitações em 24h para o mesmo número)
        String telLimpo = telefone.replaceAll("\\D", "");
        Instant vinteQuatroHorasAtras = Instant.now().minus(Duration.ofHours(24));
        ConcurrentLinkedDeque<Instant> timestampsTel = historicoPorTelefone.computeIfAbsent(telLimpo, k -> new ConcurrentLinkedDeque<>());
        timestampsTel.removeIf(instant -> instant.isBefore(vinteQuatroHorasAtras));
        if (timestampsTel.size() >= MAX_DISPAROS_POR_TELEFONE_24H) {
            log.warn("⚠️ WhatsApp {} atingiu o limite de {} solicitações de recuperação em 24h.", telLimpo, MAX_DISPAROS_POR_TELEFONE_24H);
            throw new IllegalArgumentException("Limite de 3 códigos por WhatsApp atingido nas últimas 24 horas. Por segurança, tente mais tarde.");
        }
    }

    /**
     * Registra o envio com sucesso nos contadores de cota.
     */
    public void registrarEnvio(String telefone, @Nullable String clientIp) {
        disparosGlobaisHoje.incrementAndGet();
        String telLimpo = telefone.replaceAll("\\D", "");
        historicoPorTelefone.computeIfAbsent(telLimpo, k -> new ConcurrentLinkedDeque<>()).add(Instant.now());
        if (clientIp != null && !clientIp.isBlank()) {
            historicoPorIp.computeIfAbsent(clientIp, k -> new ConcurrentLinkedDeque<>()).add(Instant.now());
        }
    }

    /**
     * Dispara código OTP real via WhatsApp.
     */
    public boolean enviarCodigo(String telefone, String codigo) {
        String mensagem = String.format(
                "🏎️ *Apex Racing Paddock*\n\n" +
                "Seu código de segurança para recuperação de senha é: *%s*\n\n" +
                "Válido por 10 minutos. Nunca compartilhe este código com ninguém.",
                codigo
        );
        return enviarMensagemTexto(telefone, mensagem);
    }

    /**
     * Dispara mensagem de Boas-Vindas no cadastro inicial do piloto.
     */
    public boolean enviarBoasVindas(String telefone, String nome) {
        String primeiroNome = (nome != null && !nome.isBlank()) ? nome.trim().split(" ")[0] : "Piloto";
        String mensagem = String.format(
                "🏎️ *Bem-vindo ao Paddock da Apex Racing, %s!*\n\n" +
                "Sua credencial de piloto foi criada com sucesso.\n\n" +
                "🏁 *Status da Credencial:* Paddock & Boxes Liberados\n" +
                "💳 *Carteira ApexPay:* Pronta para recargas instantâneas\n\n" +
                "Explore nossa frota de superesportivos na garagem e prepare-se para acelerar nos circuitos mais icônicos do mundo!\n\n" +
                "Nos vemos no grid de largada! 🏁",
                primeiroNome
        );
        return enviarMensagemTexto(telefone, mensagem);
    }

    public void enviarBoasVindasAsync(String telefone, String nome) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                enviarBoasVindas(telefone, nome);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível entregar mensagem de boas-vindas: {}", e.getMessage());
            }
        });
    }

    /**
     * Dispara confirmação de depósito ou recarga na carteira digital ApexPay.
     */
    public boolean enviarConfirmacaoDeposito(String telefone, String nome, java.math.BigDecimal valor, java.math.BigDecimal saldoAtual) {
        String primeiroNome = (nome != null && !nome.isBlank()) ? nome.trim().split(" ")[0] : "Piloto";
        String mensagem = String.format(
                "💳 *ApexPay - Depósito Confirmado*\n\n" +
                "Olá, *%s*! Confirmamos o crédito na sua carteira de piloto:\n\n" +
                "💰 *Valor Creditado:* R$ %,.2f\n" +
                "📊 *Saldo Disponível:* R$ %,.2f\n" +
                "⚡ *Processamento:* Instantâneo via ApexPay Engine\n\n" +
                "Seu saldo já está liberado para agendar sessões de pista e test drives!",
                primeiroNome, valor, saldoAtual
        );
        return enviarMensagemTexto(telefone, mensagem);
    }

    public void enviarConfirmacaoDepositoAsync(String telefone, String nome, java.math.BigDecimal valor, java.math.BigDecimal saldoAtual) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                enviarConfirmacaoDeposito(telefone, nome, valor, saldoAtual);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível entregar mensagem de depósito no WhatsApp: {}", e.getMessage());
            }
        });
    }

    /**
     * Dispara confirmação de reserva de sessão de pista com QR Code do Box.
     */
    public boolean enviarConfirmacaoReserva(String telefone, String nome, String carro, String pista, String dataHora, Long pedidoId) {
        return enviarConfirmacaoReserva(telefone, nome, carro, pista, dataHora, pedidoId, null);
    }

    public boolean enviarConfirmacaoReserva(String telefone, String nome, String carro, String pista, String dataHora, Long pedidoId, @Nullable String qrPayload) {
        String primeiroNome = (nome != null && !nome.isBlank()) ? nome.trim().split(" ")[0] : "Piloto";
        String conteudoQr = (qrPayload != null && !qrPayload.isBlank())
                ? qrPayload
                : String.format("APEX-PADDOCK-PASS-%d", pedidoId);
        String qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=350x350&data="
                + URLEncoder.encode(conteudoQr, StandardCharsets.UTF_8);
        String legenda = String.format(
                "🏁 *Reserva Confirmada - Apex Track Experience*\n\n" +
                "Olá, *%s*! Sua sessão de pista foi homologada com sucesso:\n\n" +
                "🚗 *Veículo:* %s\n" +
                "📍 *Circuito:* %s\n" +
                "📅 *Data / Turno:* %s\n" +
                "🔑 *PassCode do Box:* #APX-%05d\n\n" +
                "📱 Apresente este passe na portaria dos boxes para liberação do veículo na pista!",
                primeiroNome, carro, pista, dataHora, pedidoId
        );
        return enviarMensagemImagem(telefone, qrUrl, legenda);
    }

    public void enviarConfirmacaoReservaAsync(String telefone, String nome, String carro, String pista, String dataHora, Long pedidoId) {
        enviarConfirmacaoReservaAsync(telefone, nome, carro, pista, dataHora, pedidoId, null);
    }

    public void enviarConfirmacaoReservaAsync(String telefone, String nome, String carro, String pista, String dataHora, Long pedidoId, @Nullable String qrPayload) {
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                enviarConfirmacaoReserva(telefone, nome, carro, pista, dataHora, pedidoId, qrPayload);
            } catch (Exception e) {
                log.warn("⚠️ Não foi possível entregar passe de reserva no WhatsApp: {}", e.getMessage());
            }
        });
    }

    /**
     * Envia mensagem de texto comum via Meta Cloud API ou Gateway local.
     */
    public boolean enviarMensagemTexto(String telefone, String mensagem) {
        String telefoneLimpo = formatarTelefoneDdi(telefone);

        // 1. Tenta API Oficial da Meta
        if (!metaToken.isEmpty() && !metaPhoneId.isEmpty()) {
            boolean enviadoMeta = enviarViaMetaCloud(telefoneLimpo, mensagem);
            if (enviadoMeta) return true;
        }

        // 2. Tenta Microserviço Local Baileys HTTP
        try {
            String jsonPayload = String.format(
                    "{\"phone\":\"%s\",\"message\":\"%s\"}",
                    telefoneLimpo,
                    mensagem.replace("\n", "\\n").replace("\"", "\\\"")
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(serviceUrl + "/send-otp"))
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(4))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200 && response.body().contains("\"simulated\":false")) {
                log.info("📲 WhatsApp real entregue com sucesso via gateway local para {}: {}", telefoneLimpo, response.body());
                return true;
            } else if (response.statusCode() == 200 && response.body().contains("\"simulated\":true")) {
                log.warn("⚠️ Gateway local conectado em {} mas aguarda leitura de QR Code. Mensagem não entregue.", serviceUrl);
                return false;
            }
        } catch (Exception e) {
            log.debug("Gateway local não disponível na porta {}: {}", serviceUrl, e.getMessage());
        }

        // Log seguro no console local
        log.warn("🔒 [WHATSAPP LOCAL DEV] Mensagem para {}:\n{}", telefoneLimpo, mensagem);
        return false;
    }

    /**
     * Envia mensagem com imagem (ex: QR Code) via Meta Cloud API com fallback para texto com link.
     */
    public boolean enviarMensagemImagem(String telefone, String imageUrl, String legenda) {
        String telefoneLimpo = formatarTelefoneDdi(telefone);

        if (!metaToken.isEmpty() && !metaPhoneId.isEmpty()) {
            try {
                String url = String.format("https://graph.facebook.com/v19.0/%s/messages", metaPhoneId);
                String payload = String.format(
                        "{\"messaging_product\":\"whatsapp\",\"recipient_type\":\"individual\",\"to\":\"%s\",\"type\":\"image\",\"image\":{\"link\":\"%s\",\"caption\":\"%s\"}}",
                        telefoneLimpo,
                        imageUrl,
                        legenda.replace("\n", "\\n").replace("\"", "\\\"")
                );

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + metaToken)
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(6))
                        .POST(HttpRequest.BodyPublishers.ofString(payload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 200 && response.statusCode() < 300) {
                    log.info("✅ WhatsApp Cloud API Meta (Imagem/QR Code) enviado para {}!", telefoneLimpo);
                    return true;
                } else {
                    log.warn("⚠️ Meta recusou envio de imagem (Status {}): {}. Tentando envio como texto.", response.statusCode(), response.body());
                }
            } catch (Exception e) {
                log.warn("⚠️ Falha ao enviar imagem na Meta Cloud API: {}. Tentando como texto.", e.getMessage());
            }
        }

        // Fallback: envia o texto com link do QR Code
        String mensagemComLink = legenda + "\n\n🔗 *Passe Digital / QR Code:* " + imageUrl;
        return enviarMensagemTexto(telefone, mensagemComLink);
    }

    private String formatarTelefoneDdi(String telefone) {
        if (telefone == null) return "";
        String limpo = telefone.replaceAll("\\D", "");
        if (limpo.length() == 10 || limpo.length() == 11) {
            return "55" + limpo;
        }
        return limpo;
    }

    private boolean enviarViaMetaCloud(String telefoneCompleto, String mensagem) {
        try {
            String url = String.format("https://graph.facebook.com/v19.0/%s/messages", metaPhoneId);
            String payload = String.format(
                    "{\"messaging_product\":\"whatsapp\",\"recipient_type\":\"individual\",\"to\":\"%s\",\"type\":\"text\",\"text\":{\"preview_url\":false,\"body\":\"%s\"}}",
                    telefoneCompleto,
                    mensagem.replace("\n", "\\n").replace("\"", "\\\"")
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + metaToken)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5))
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                log.info("✅ WhatsApp Cloud API Meta disparado com sucesso para {}!", telefoneCompleto);
                return true;
            } else {
                log.error("❌ Erro da API WhatsApp Meta (Status {}): {}", response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.error("❌ Falha na conexão com WhatsApp Cloud API da Meta: {}", e.getMessage());
        }
        return false;
    }
}
