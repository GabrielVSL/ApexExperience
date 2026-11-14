package com.aluguel.services;

import com.aluguel.models.Automovel;
import com.aluguel.models.Cliente;
import com.aluguel.models.Pedido;
import com.aluguel.models.TrackSlot;
import com.aluguel.repositories.PedidoRepository;
import io.micronaut.context.annotation.Value;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Singleton
public class QrCodePassService {

    private static final Logger log = LoggerFactory.getLogger(QrCodePassService.class);
    private static final String VERSAO_PASS = "APEX-FIA-PASS-V2";
    private static final String ALGORITMO_HMAC = "HmacSHA256";
    private static final DateTimeFormatter ISO_SEC = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final PedidoRepository pedidoRepository;
    private final byte[] secretKeyBytes;

    @Inject
    public QrCodePassService(
            PedidoRepository pedidoRepository,
            @Value("${micronaut.security.token.jwt.signatures.secret.generator.secret:uma-chave-muito-longa-e-segura-para-o-rentcars-lab02-256bits}") String secretKey
    ) {
        this.pedidoRepository = pedidoRepository;
        String effective = (secretKey != null && !secretKey.isBlank())
                ? secretKey
                : "uma-chave-muito-longa-e-segura-para-o-rentcars-lab02-256bits";
        this.secretKeyBytes = effective.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Gera ou atualiza o payload JSON assinado por HMAC-SHA256 da credencial FIA Paddock Pass.
     */
    public Pedido gerarOuAtualizarQrCode(Pedido pedido) {
        if (pedido == null) {
            return null;
        }
        if (pedido.getTrackingCode() == null || pedido.getTrackingCode().isBlank()) {
            pedido.setTrackingCode("APX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        Map<String, String> dados = extrairCamposSessao(pedido);
        String signature = assinarHmac(montarStringCanonica(dados));
        LocalDateTime agora = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        Map<String, Object> payloadObj = new LinkedHashMap<>();
        payloadObj.put("v", VERSAO_PASS);
        payloadObj.put("pedidoId", pedido.getId() != null ? pedido.getId() : 0L);
        payloadObj.put("trackingCode", dados.get("trackingCode"));
        payloadObj.put("pilotoNome", dados.get("pilotoNome"));
        payloadObj.put("pilotoEmail", dados.get("pilotoEmail"));
        payloadObj.put("pilotoCnh", dados.get("pilotoCnh"));
        payloadObj.put("modalidade", dados.get("modalidade"));
        payloadObj.put("circuito", dados.get("circuito"));
        payloadObj.put("turno", dados.get("turno"));
        payloadObj.put("inicio", dados.get("inicio"));
        payloadObj.put("fim", dados.get("fim"));
        payloadObj.put("veiculo", dados.get("veiculo"));
        payloadObj.put("placa", dados.get("placa"));
        payloadObj.put("matricula", dados.get("matricula"));
        payloadObj.put("valorFinal", dados.get("valorFinal"));
        payloadObj.put("pagamentoStatus", dados.get("pagamentoStatus"));
        payloadObj.put("status", dados.get("status"));
        payloadObj.put("emitidoEm", agora.format(ISO_SEC));
        payloadObj.put("sig", signature);

        pedido.setQrCodeAssinatura(signature);
        pedido.setQrCodePayload(serializarJson(payloadObj));
        pedido.setQrCodeGeradoEm(agora);
        return pedido;
    }

    /**
     * Task executada no boot ou sob demanda pelo Race Control para garantir que todas as sessões
     * agendadas possuam um QR Code criptográfico realista atualizado.
     */
    @Transactional
    public Map<String, Object> executarTaskGeracaoQrCodes() {
        int totalSessoes = 0;
        int atualizadas = 0;

        for (Pedido pedido : pedidoRepository.findAll()) {
            totalSessoes++;
            String assinaturaEsperada = calcularAssinaturaEsperada(pedido);
            boolean precisaGerar = pedido.getQrCodePayload() == null
                    || pedido.getQrCodePayload().isBlank()
                    || pedido.getQrCodeAssinatura() == null
                    || !assinaturaEsperada.equalsIgnoreCase(pedido.getQrCodeAssinatura());

            if (precisaGerar) {
                gerarOuAtualizarQrCode(pedido);
                pedidoRepository.update(pedido);
                atualizadas++;
            }
        }

        if (atualizadas > 0) {
            log.info("🎫 [Apex QR Task] {} de {} sessões receberam QR Code FIA assinado (HMAC-SHA256).", atualizadas, totalSessoes);
        } else {
            log.info("🎫 [Apex QR Task] Todas as {} sessões já possuem QR Code FIA assinado e sincronizado.", totalSessoes);
        }

        Map<String, Object> relatorio = new LinkedHashMap<>();
        relatorio.put("task", "SYNC_QR_CODE_FIA_PASS");
        relatorio.put("totalSessoes", totalSessoes);
        relatorio.put("qrCodesGeradosOuAtualizados", atualizadas);
        relatorio.put("timestamp", LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS).toString());
        return relatorio;
    }

    /**
     * Retorna os detalhes estruturados do QR Code de uma sessão específica.
     */
    public Map<String, Object> montarResumoQrCode(Pedido pedido) {
        if (pedido.getQrCodePayload() == null || pedido.getQrCodePayload().isBlank()) {
            gerarOuAtualizarQrCode(pedido);
            if (pedido.getId() != null) {
                pedidoRepository.update(pedido);
            }
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("pedidoId", pedido.getId());
        resp.put("trackingCode", pedido.getTrackingCode());
        resp.put("status", pedido.getStatus());
        resp.put("qrCodePayload", pedido.getQrCodePayload());
        resp.put("qrCodeAssinatura", pedido.getQrCodeAssinatura());
        resp.put("qrCodeGeradoEm", pedido.getQrCodeGeradoEm() != null ? pedido.getQrCodeGeradoEm().toString() : null);
        resp.put("checkInRealizadoEm", pedido.getCheckInRealizadoEm() != null ? pedido.getCheckInRealizadoEm().toString() : null);
        resp.put("dadosDecodificados", decodificarPayload(pedido.getQrCodePayload()));
        return resp;
    }

    /**
     * Valida criptograficamente um QR Code JSON ou Tracking Code lido no Pitlane/Box.
     */
    @Transactional
    public Map<String, Object> validarQrCode(String rawInput, boolean registrarCheckIn) {
        String entrada = rawInput != null ? rawInput.trim() : "";
        if (entrada.isEmpty()) {
            return respostaInvalida("Nenhum payload JSON ou código de rastreio foi informado para validação.");
        }

        boolean veioPayloadJson = entrada.startsWith("{");
        Map<String, String> camposLidos = veioPayloadJson ? decodificarPayload(entrada) : Collections.emptyMap();

        Optional<Pedido> pedidoOpt = localizarPedido(entrada, veioPayloadJson, camposLidos);
        if (pedidoOpt.isEmpty()) {
            return respostaInvalida("Sessão não localizada na base oficial do Apex Race Control.");
        }

        Pedido pedido = pedidoOpt.get();
        String assinaturaEsperadaBanco = calcularAssinaturaEsperada(pedido);

        boolean assinaturaVerificada;
        if (veioPayloadJson) {
            String sigInformada = camposLidos.getOrDefault("sig", "");
            String sigDoPayload = assinarHmac(montarStringCanonica(camposLidos));
            boolean integraPayload = constantTimeEquals(sigDoPayload, sigInformada);
            boolean bateComBanco = constantTimeEquals(sigDoPayload, assinaturaEsperadaBanco);
            assinaturaVerificada = integraPayload && bateComBanco;

            if (!integraPayload) {
                return respostaInvalidaComSessao(pedido, false,
                        "ALERTA DE SEGURANÇA: Assinatura HMAC-SHA256 inválida ou credencial adulterada.");
            }
            if (!bateComBanco) {
                return respostaInvalidaComSessao(pedido, false,
                        "Credencial desatualizada: os dados ou status da sessão foram alterados após a emissão deste QR Code.");
            }
        } else {
            if (pedido.getQrCodePayload() == null || pedido.getQrCodeAssinatura() == null) {
                gerarOuAtualizarQrCode(pedido);
                pedidoRepository.update(pedido);
            }
            assinaturaVerificada = constantTimeEquals(pedido.getQrCodeAssinatura(), assinaturaEsperadaBanco);
            if (!assinaturaVerificada) {
                return respostaInvalidaComSessao(pedido, false,
                        "Falha de integridade: assinatura armazenada diverge dos registros da sessão.");
            }
        }

        Cliente cliente = pedido.getCliente();
        if (cliente != null && "SUSPENSO".equalsIgnoreCase(cliente.getStatusConta())) {
            return buildResultadoValidacao(pedido, true, false,
                    "Credencial autêntica, porém a conta do piloto está SUSPENSA pelo Race Control.");
        }

        String status = pedido.getStatus() != null ? pedido.getStatus() : "";
        if (!"APROVADO".equalsIgnoreCase(status)) {
            return buildResultadoValidacao(pedido, true, false,
                    "Credencial HMAC-SHA256 autêntica, porém sem liberação de pista (Status atual: " + status + ").");
        }

        if (registrarCheckIn && pedido.getCheckInRealizadoEm() == null) {
            pedido.setCheckInRealizadoEm(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
            pedidoRepository.update(pedido);
        }

        String mensagem = pedido.getCheckInRealizadoEm() != null && registrarCheckIn
                ? "Check-in oficial registrado no Box! Credencial FIA autêntica e piloto liberado para pista."
                : "Credencial FIA autêntica (HMAC-SHA256) — Acesso liberado ao Box e Pitlane!";

        return buildResultadoValidacao(pedido, true, true, mensagem);
    }

    public Map<String, String> decodificarPayload(String json) {
        return parseFlatJsonObject(json);
    }

    private Optional<Pedido> localizarPedido(String entrada, boolean veioPayloadJson, Map<String, String> camposLidos) {
        if (veioPayloadJson) {
            String pidStr = camposLidos.get("pedidoId");
            if (pidStr != null && !pidStr.isBlank()) {
                try {
                    long pid = Long.parseLong(pidStr.trim());
                    if (pid > 0) {
                        Optional<Pedido> byId = pedidoRepository.findById(pid);
                        if (byId.isPresent()) return byId;
                    }
                } catch (NumberFormatException ignored) {}
            }
            String tracking = camposLidos.get("trackingCode");
            if (tracking != null && !tracking.isBlank()) {
                return pedidoRepository.findByTrackingCode(tracking.trim().toUpperCase());
            }
            return Optional.empty();
        }

        String codigoLimpo = entrada.startsWith("#") ? entrada.substring(1).trim() : entrada;
        Optional<Pedido> byTracking = pedidoRepository.findByTrackingCode(codigoLimpo.toUpperCase());
        if (byTracking.isPresent()) {
            return byTracking;
        }
        try {
            long idNum = Long.parseLong(codigoLimpo);
            return pedidoRepository.findById(idNum);
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    private String calcularAssinaturaEsperada(Pedido pedido) {
        return assinarHmac(montarStringCanonica(extrairCamposSessao(pedido)));
    }

    private Map<String, String> extrairCamposSessao(Pedido pedido) {
        Cliente cliente = pedido.getCliente();
        Automovel auto = pedido.getAutomovel();
        TrackSlot slot = pedido.getTrackSlot();

        String circuitoNome = "Circuito Apex Track";
        if (slot != null && slot.getCircuito() != null && slot.getCircuito().getNome() != null) {
            circuitoNome = slot.getCircuito().getNome();
        } else if (auto != null && auto.getCircuito() != null && auto.getCircuito().getNome() != null) {
            circuitoNome = auto.getCircuito().getNome();
        }

        String turno = slot != null && slot.getTurno() != null ? slot.getTurno() : "FULL_DAY";
        String veiculo = auto != null ? (safe(auto.getMarca()) + " " + safe(auto.getModelo())).trim() : "Acesso Paddock VIP";
        String placa = auto != null && auto.getPlaca() != null ? auto.getPlaca() : "BOX-VIP";
        String matricula = auto != null && auto.getMatricula() != null ? auto.getMatricula() : "FIA-PASS";
        String cnh = cliente != null && cliente.getCnhNumero() != null && !cliente.getCnhNumero().isBlank()
                ? cliente.getCnhNumero()
                : "ISENTO_BOX";

        BigDecimal valor = pedido.getValorFinal() != null ? pedido.getValorFinal() : BigDecimal.ZERO;

        Map<String, String> map = new LinkedHashMap<>();
        map.put("pedidoId", pedido.getId() != null ? String.valueOf(pedido.getId()) : "0");
        map.put("trackingCode", safe(pedido.getTrackingCode()));
        map.put("pilotoNome", cliente != null ? safe(cliente.getNome()) : "Piloto");
        map.put("pilotoEmail", cliente != null ? safe(cliente.getEmail()) : "");
        map.put("pilotoCnh", cnh);
        map.put("modalidade", pedido.getTipoServico() != null ? pedido.getTipoServico() : "TRACK_EXPERIENCE");
        map.put("circuito", circuitoNome);
        map.put("turno", turno);
        map.put("inicio", formatDateTime(pedido.getDataInicio()));
        map.put("fim", formatDateTime(pedido.getDataFim()));
        map.put("veiculo", veiculo);
        map.put("placa", placa);
        map.put("matricula", matricula);
        map.put("valorFinal", valor.setScale(2, RoundingMode.HALF_UP).toPlainString());
        map.put("pagamentoStatus", pedido.getPagamentoStatus() != null ? pedido.getPagamentoStatus() : "PENDENTE");
        map.put("status", pedido.getStatus() != null ? pedido.getStatus() : "AGUARDANDO_APROVACAO");
        return map;
    }

    private String montarStringCanonica(Map<String, String> dados) {
        return String.join("|",
                dados.getOrDefault("pedidoId", "0"),
                dados.getOrDefault("trackingCode", ""),
                dados.getOrDefault("pilotoEmail", ""),
                dados.getOrDefault("pilotoCnh", "ISENTO_BOX"),
                dados.getOrDefault("modalidade", ""),
                dados.getOrDefault("veiculo", ""),
                dados.getOrDefault("placa", ""),
                dados.getOrDefault("inicio", ""),
                dados.getOrDefault("fim", ""),
                dados.getOrDefault("status", ""),
                normalizarValorMonetario(dados.getOrDefault("valorFinal", "0.00"))
        );
    }

    private String normalizarValorMonetario(String raw) {
        try {
            return new BigDecimal(raw).setScale(2, RoundingMode.HALF_UP).toPlainString();
        } catch (Exception e) {
            return "0.00";
        }
    }

    private String formatDateTime(LocalDateTime dt) {
        if (dt == null) return "";
        return dt.truncatedTo(ChronoUnit.SECONDS).format(ISO_SEC);
    }

    private String assinarHmac(String mensagemCanonica) {
        try {
            Mac mac = Mac.getInstance(ALGORITMO_HMAC);
            mac.init(new SecretKeySpec(secretKeyBytes, ALGORITMO_HMAC));
            byte[] rawHmac = mac.doFinal(mensagemCanonica.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao assinar credencial QR Code via HMAC-SHA256.", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                b.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8)
        );
    }

    private Map<String, Object> respostaInvalida(String mensagem) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("valido", false);
        res.put("liberadoPitlane", false);
        res.put("assinaturaVerificada", false);
        res.put("algoritmo", "HMAC-SHA256");
        res.put("mensagem", mensagem);
        res.put("checkInRealizadoEm", null);
        res.put("sessao", null);
        return res;
    }

    private Map<String, Object> respostaInvalidaComSessao(Pedido pedido, boolean assinaturaOk, String mensagem) {
        return buildResultadoValidacao(pedido, false, assinaturaOk, mensagem);
    }

    private Map<String, Object> buildResultadoValidacao(Pedido pedido, boolean valido, boolean liberadoPitlane, String mensagem) {
        Map<String, String> dados = extrairCamposSessao(pedido);
        Map<String, Object> sessao = new LinkedHashMap<>(dados);
        sessao.put("checkInRealizadoEm", pedido.getCheckInRealizadoEm() != null ? pedido.getCheckInRealizadoEm().toString() : null);

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("valido", valido);
        res.put("liberadoPitlane", liberadoPitlane);
        res.put("assinaturaVerificada", valido);
        res.put("algoritmo", "HMAC-SHA256");
        res.put("mensagem", mensagem);
        res.put("checkInRealizadoEm", pedido.getCheckInRealizadoEm() != null ? pedido.getCheckInRealizadoEm().toString() : null);
        res.put("sessao", sessao);
        return res;
    }

    private String serializarJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append('"').append(escapeJson(entry.getKey())).append("\":");
            Object val = entry.getValue();
            if (val == null) {
                sb.append("null");
            } else if (val instanceof Number || val instanceof Boolean) {
                sb.append(val);
            } else {
                sb.append('"').append(escapeJson(val.toString())).append('"');
            }
        }
        sb.append('}');
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> out.append(c);
            }
        }
        return out.toString();
    }

    private Map<String, String> parseFlatJsonObject(String json) {
        Map<String, String> result = new LinkedHashMap<>();
        if (json == null) return result;
        String src = json.trim();
        if (!src.startsWith("{") || !src.endsWith("}")) {
            return result;
        }
        int i = 1;
        int len = src.length() - 1;
        while (i < len) {
            i = skipWhitespaceAndCommas(src, i, len);
            if (i >= len || src.charAt(i) != '"') break;

            int[] keyEnd = new int[1];
            String key = readJsonString(src, i, len, keyEnd);
            if (key == null) break;
            i = skipWhitespace(src, keyEnd[0], len);
            if (i >= len || src.charAt(i) != ':') break;
            i = skipWhitespace(src, i + 1, len);
            if (i >= len) break;

            if (src.charAt(i) == '"') {
                int[] valEnd = new int[1];
                String val = readJsonString(src, i, len, valEnd);
                result.put(key, val != null ? val : "");
                i = valEnd[0];
            } else {
                int start = i;
                while (i < len && src.charAt(i) != ',' && !Character.isWhitespace(src.charAt(i))) {
                    i++;
                }
                String rawVal = src.substring(start, i);
                if (!"null".equals(rawVal)) {
                    result.put(key, rawVal);
                }
            }
        }
        return result;
    }

    private int skipWhitespaceAndCommas(String s, int i, int len) {
        while (i < len && (Character.isWhitespace(s.charAt(i)) || s.charAt(i) == ',')) {
            i++;
        }
        return i;
    }

    private int skipWhitespace(String s, int i, int len) {
        while (i < len && Character.isWhitespace(s.charAt(i))) {
            i++;
        }
        return i;
    }

    private String readJsonString(String s, int startQuote, int len, int[] endOut) {
        if (startQuote >= len || s.charAt(startQuote) != '"') return null;
        StringBuilder sb = new StringBuilder();
        int i = startQuote + 1;
        while (i < len) {
            char c = s.charAt(i++);
            if (c == '"') {
                endOut[0] = i;
                return sb.toString();
            }
            if (c == '\\' && i < len) {
                char next = s.charAt(i++);
                switch (next) {
                    case '"', '\\', '/' -> sb.append(next);
                    case 'b' -> sb.append('\b');
                    case 'f' -> sb.append('\f');
                    case 'n' -> sb.append('\n');
                    case 'r' -> sb.append('\r');
                    case 't' -> sb.append('\t');
                    case 'u' -> {
                        if (i + 4 <= len) {
                            sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16));
                            i += 4;
                        }
                    }
                    default -> sb.append(next);
                }
            } else {
                sb.append(c);
            }
        }
        return null;
    }

    private String safe(String s) {
        return s != null ? s.trim() : "";
    }
}
