package com.aluguel.facades;

import com.aluguel.models.*;
import com.aluguel.queue.ReservaQueueEngine;
import com.aluguel.repositories.*;
import com.aluguel.services.WhatsAppService;
import com.aluguel.utils.CnhValidator;
import io.micronaut.core.annotation.Nullable;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.mindrot.jbcrypt.BCrypt;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Singleton
public class AdminDashboardFacade {

    private final PedidoRepository pedidoRepository;
    private final TrackSlotRepository trackSlotRepository;
    private final UsuarioRepository usuarioRepository;
    private final TransacaoApexPayRepository transacaoRepository;
    private final ReservaQueueEngine queueEngine;
    private final ApexPayFacade apexPayFacade;
    private final ClienteRepository clienteRepository;
    private final WhatsAppService whatsAppService;

    @Inject
    public AdminDashboardFacade(PedidoRepository pedidoRepository,
                                TrackSlotRepository trackSlotRepository,
                                UsuarioRepository usuarioRepository,
                                TransacaoApexPayRepository transacaoRepository,
                                ReservaQueueEngine queueEngine,
                                ApexPayFacade apexPayFacade,
                                @Nullable ClienteRepository clienteRepository,
                                @Nullable WhatsAppService whatsAppService) {
        this.pedidoRepository = pedidoRepository;
        this.trackSlotRepository = trackSlotRepository;
        this.usuarioRepository = usuarioRepository;
        this.transacaoRepository = transacaoRepository;
        this.queueEngine = queueEngine;
        this.apexPayFacade = apexPayFacade;
        this.clienteRepository = clienteRepository;
        this.whatsAppService = whatsAppService;
    }

    public AdminDashboardFacade(PedidoRepository pedidoRepository,
                                TrackSlotRepository trackSlotRepository,
                                UsuarioRepository usuarioRepository,
                                TransacaoApexPayRepository transacaoRepository,
                                ReservaQueueEngine queueEngine,
                                ApexPayFacade apexPayFacade) {
        this(pedidoRepository, trackSlotRepository, usuarioRepository, transacaoRepository, queueEngine, apexPayFacade, null, null);
    }

    public Map<String, Object> getMetricasDashboard() {
        Map<String, Object> kpis = new LinkedHashMap<>();

        // 1. Pedidos, Faturamento e Lucro Operacional
        List<Pedido> todosPedidos = StreamSupport.stream(pedidoRepository.findAll().spliterator(), false)
                .sorted(Comparator.comparing(Pedido::getDataPedido, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        BigDecimal faturamentoConfirmado = todosPedidos.stream()
                .filter(p -> "APROVADO".equals(p.getStatus()))
                .map(p -> p.getValorFinal() != null ? p.getValorFinal() : (p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal faturamentoPendente = todosPedidos.stream()
                .filter(p -> "AGUARDANDO_APROVACAO".equals(p.getStatus())
                        || "PENDENTE_EMPRESA".equals(p.getStatus())
                        || "PENDENTE_BANCO".equals(p.getStatus())
                        || "REVISAO_CLIENTE".equals(p.getStatus()))
                .map(p -> p.getValorFinal() != null ? p.getValorFinal() : (p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal faturamentoTotal = faturamentoConfirmado.add(faturamentoPendente);

        BigDecimal totalDescontos = todosPedidos.stream()
                .map(p -> p.getDescontoFidelidade() != null ? p.getDescontoFidelidade() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSinistros = todosPedidos.stream()
                .map(p -> p.getValorSinistro() != null ? p.getValorSinistro() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Juros de inadimplência arrecadados
        List<TransacaoApexPay> transacoesJuros = StreamSupport.stream(transacaoRepository.findAll().spliterator(), false)
                .filter(t -> "JUROS_ATRASO".equals(t.getTipo()) && t.getValor() != null)
                .toList();

        BigDecimal totalJuros = transacoesJuros.stream()
                .map(TransacaoApexPay::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Taxas de cancelamento/remarcação retidas (100% margem líquida)
        BigDecimal totalTaxasRetidas = todosPedidos.stream()
                .map(Pedido::getTaxaAplicada)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Lucro líquido estimado (68% da receita confirmada + juros + sinistros + taxas de cancelamento/remarcação)
        BigDecimal margemOperacional = faturamentoConfirmado.multiply(new BigDecimal("0.68")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal lucroLiquido = margemOperacional.add(totalJuros).add(totalSinistros).add(totalTaxasRetidas);

        long totalSessoesAgendadas = todosPedidos.size();
        long sessoesConfirmadas = todosPedidos.stream().filter(p -> "APROVADO".equals(p.getStatus())).count();
        long sessoesPendentes = todosPedidos.stream()
                .filter(p -> "AGUARDANDO_APROVACAO".equals(p.getStatus())
                        || "PENDENTE_EMPRESA".equals(p.getStatus())
                        || "PENDENTE_BANCO".equals(p.getStatus()))
                .count();

        kpis.put("faturamentoTotalBRL", faturamentoTotal);
        kpis.put("faturamentoConfirmadoBRL", faturamentoConfirmado);
        kpis.put("faturamentoPendenteBRL", faturamentoPendente);
        kpis.put("lucroLiquidoEstimadoBRL", lucroLiquido);
        kpis.put("totalDescontosConcedidosBRL", totalDescontos);
        kpis.put("totalSinistrosCobradosBRL", totalSinistros);
        kpis.put("totalJurosRecebidosBRL", totalJuros);
        kpis.put("totalSessoesAgendadas", totalSessoesAgendadas);
        kpis.put("sessoesConfirmadas", sessoesConfirmadas);
        kpis.put("sessoesPendentes", sessoesPendentes);

        // 1.1 Séries temporais para gráficos de evolução (últimos 6 meses contínuos)
        DateTimeFormatter mesFmt = DateTimeFormatter.ofPattern("MMM/yy", new Locale("pt", "BR"));
        Map<String, Map<String, Object>> timelineMap = new LinkedHashMap<>();
        YearMonth ymAtual = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = ymAtual.minusMonths(i);
            String label = ym.format(mesFmt).toUpperCase();
            Map<String, Object> ponto = new LinkedHashMap<>();
            ponto.put("mes", label);
            ponto.put("faturamento", BigDecimal.ZERO);
            ponto.put("faturamentoPendente", BigDecimal.ZERO);
            ponto.put("lucro", BigDecimal.ZERO);
            ponto.put("sessoes", 0);
            timelineMap.put(ym.toString(), ponto);
        }

        for (Pedido p : todosPedidos) {
            if (p.getDataPedido() != null) {
                YearMonth ym = YearMonth.from(p.getDataPedido());
                String key = ym.toString();
                Map<String, Object> ponto = timelineMap.computeIfAbsent(key, k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("mes", ym.format(mesFmt).toUpperCase());
                    m.put("faturamento", BigDecimal.ZERO);
                    m.put("faturamentoPendente", BigDecimal.ZERO);
                    m.put("lucro", BigDecimal.ZERO);
                    m.put("sessoes", 0);
                    return m;
                });

                BigDecimal val = p.getValorFinal() != null ? p.getValorFinal() : (p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO);
                BigDecimal sinistro = p.getValorSinistro() != null ? p.getValorSinistro() : BigDecimal.ZERO;
                BigDecimal taxaRetida = p.getTaxaAplicada() != null ? p.getTaxaAplicada() : BigDecimal.ZERO;

                if ("APROVADO".equals(p.getStatus())) {
                    BigDecimal fatAtual = (BigDecimal) ponto.get("faturamento");
                    BigDecimal lucroAtual = (BigDecimal) ponto.get("lucro");
                    ponto.put("faturamento", fatAtual.add(val));
                    ponto.put("lucro", lucroAtual
                            .add(val.multiply(new BigDecimal("0.68")).setScale(2, RoundingMode.HALF_UP))
                            .add(sinistro)
                            .add(taxaRetida));
                } else if ("AGUARDANDO_APROVACAO".equals(p.getStatus())
                        || "PENDENTE_EMPRESA".equals(p.getStatus())
                        || "PENDENTE_BANCO".equals(p.getStatus())
                        || "PENDENTE".equals(p.getStatus())
                        || "REVISAO_CLIENTE".equals(p.getStatus())) {
                    BigDecimal pendAtual = (BigDecimal) ponto.get("faturamentoPendente");
                    ponto.put("faturamentoPendente", pendAtual.add(val));
                } else if (taxaRetida.compareTo(BigDecimal.ZERO) > 0) {
                    BigDecimal fatAtual = (BigDecimal) ponto.get("faturamento");
                    BigDecimal lucroAtual = (BigDecimal) ponto.get("lucro");
                    if ("CANCELADO".equals(p.getStatus())) {
                        ponto.put("faturamento", fatAtual.add(taxaRetida));
                    }
                    ponto.put("lucro", lucroAtual.add(taxaRetida));
                }
                int sess = (int) ponto.get("sessoes");
                ponto.put("sessoes", sess + 1);
            }
        }

        for (TransacaoApexPay jurosTx : transacoesJuros) {
            YearMonth ym = jurosTx.getDataHora() != null ? YearMonth.from(jurosTx.getDataHora()) : ymAtual;
            Map<String, Object> ponto = timelineMap.get(ym.toString());
            if (ponto != null) {
                BigDecimal lucroAtual = (BigDecimal) ponto.get("lucro");
                ponto.put("lucro", lucroAtual.add(jurosTx.getValor()));
            }
        }
        kpis.put("timelineFaturamento", new ArrayList<>(timelineMap.values()));

        // 1.2 Distribuição de receita e volume por modalidade de serviço
        Map<String, Map<String, Object>> modalidadesMap = new LinkedHashMap<>();
        for (Pedido p : todosPedidos) {
            if ("CANCELADO".equals(p.getStatus()) || "REJEITADO".equals(p.getStatus())) {
                continue;
            }
            String tipo = p.getTipoServico() != null ? p.getTipoServico() : "TRACK_EXPERIENCE";
            String label = switch (tipo.toUpperCase()) {
                case "FAST_LAP" -> "Fast Lap";
                case "PACOTE_VIP" -> "Pacote VIP";
                case "VISITA_BOX" -> "Visita ao Box";
                case "HOT_LAP_COACH" -> "Hot Lap Coach";
                case "TRACK_EXPERIENCE", "TRACK_DAY" -> "Track Experience";
                default -> tipo;
            };
            modalidadesMap.compute(label, (k, v) -> {
                if (v == null) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("modalidade", label);
                    m.put("tipoServico", tipo);
                    m.put("quantidade", 0);
                    m.put("totalBRL", BigDecimal.ZERO);
                    v = m;
                }
                v.put("quantidade", (int) v.get("quantidade") + 1);
                BigDecimal val = p.getValorFinal() != null ? p.getValorFinal() : (p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO);
                v.put("totalBRL", ((BigDecimal) v.get("totalBRL")).add(val));
                return v;
            });
        }
        kpis.put("distribuicaoModalidades", new ArrayList<>(modalidadesMap.values()));

        // 2. Faturamento por Autódromo / Circuito (sessões ativas ou confirmadas)
        Map<String, BigDecimal> faturamentoPorCircuito = new HashMap<>();
        for (Pedido p : todosPedidos) {
            if ("CANCELADO".equals(p.getStatus()) || "REJEITADO".equals(p.getStatus())) {
                continue;
            }
            String nomeCircuito = resolverNomeCircuito(p);
            BigDecimal valor = p.getValorFinal() != null ? p.getValorFinal() : (p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO);
            faturamentoPorCircuito.merge(nomeCircuito, valor, BigDecimal::add);
        }
        kpis.put("faturamentoPorCircuito", faturamentoPorCircuito);

        // 3. Taxa de Ocupação dos Boxes por Circuito
        List<TrackSlot> todosSlots = StreamSupport.stream(trackSlotRepository.findAll().spliterator(), false).toList();
        Map<String, Map<String, Object>> ocupacaoBoxes = new HashMap<>();

        for (TrackSlot slot : todosSlots) {
            if (slot.getCircuito() == null || slot.getCircuito().getId() == null) {
                continue;
            }
            String circuitoId = slot.getCircuito().getId();
            int vagasTotaisSlot = slot.getVagasTotais() != null ? slot.getVagasTotais() : 0;
            int vagasOcupadasSlot = slot.getVagasOcupadas() != null ? slot.getVagasOcupadas() : 0;
            ocupacaoBoxes.compute(circuitoId, (k, v) -> {
                if (v == null) {
                    Map<String, Object> map = new HashMap<>();
                    map.put("circuitoNome", slot.getCircuito().getNome() != null ? slot.getCircuito().getNome() : circuitoId);
                    map.put("totalVagas", 0);
                    map.put("totalOcupadas", 0);
                    v = map;
                }
                int tv = (int) v.get("totalVagas") + vagasTotaisSlot;
                int to = (int) v.get("totalOcupadas") + vagasOcupadasSlot;
                v.put("totalVagas", tv);
                v.put("totalOcupadas", to);
                v.put("taxaOcupacaoPercentual", tv > 0 ? Math.round((to * 100.0) / tv) : 0);
                return v;
            });
        }
        kpis.put("ocupacaoBoxesPorAutodromo", ocupacaoBoxes);

        // 4. Supercarros Mais Pilotados
        Map<String, Long> carrosMaisAlugados = todosPedidos.stream()
                .filter(p -> p.getAutomovel() != null
                        && !"CANCELADO".equals(p.getStatus())
                        && !"REJEITADO".equals(p.getStatus()))
                .collect(Collectors.groupingBy(p -> p.getAutomovel().getMarca() + " " + p.getAutomovel().getModelo(), Collectors.counting()));
        kpis.put("supercarrosMaisPilotados", carrosMaisAlugados);

        // 5. Métricas Financeiras da Base de Pilotos (Quem está devendo vs Em dia)
        List<Usuario> clientes = StreamSupport.stream(usuarioRepository.findAll().spliterator(), false)
                .filter(u -> "ROLE_CLIENTE".equals(u.getRole()))
                .toList();

        long totalPilotos = clientes.size();
        long pilotosInadimplentes = clientes.stream().filter(Usuario::isInadimplente).count();
        long pilotosEmDia = totalPilotos - pilotosInadimplentes;
        long pilotosVipBlack = clientes.stream().filter(u -> "APEX_BLACK".equals(u.getTierFidelidade())).count();

        BigDecimal saldoTotalCustodia = clientes.stream()
                .map(u -> u.getSaldoCarteira() != null ? u.getSaldoCarteira() : BigDecimal.ZERO)
                .filter(s -> s.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal dividaAtivaTotal = clientes.stream()
                .map(u -> u.getSaldoCarteira() != null ? u.getSaldoCarteira() : BigDecimal.ZERO)
                .filter(s -> s.compareTo(BigDecimal.ZERO) < 0)
                .map(BigDecimal::abs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> metricsApexPay = new HashMap<>();
        metricsApexPay.put("totalPilotosCadastrados", totalPilotos);
        metricsApexPay.put("pilotosInadimplentes", pilotosInadimplentes);
        metricsApexPay.put("pilotosEmDia", pilotosEmDia);
        metricsApexPay.put("pilotosVipApexBlack", pilotosVipBlack);
        metricsApexPay.put("saldoTotalCustodiadoBRL", saldoTotalCustodia);
        metricsApexPay.put("dividaAtivaTotalBRL", dividaAtivaTotal);
        kpis.put("metricasApexPay", metricsApexPay);

        // Lista de clientes detalhada (inadimplentes ordenados primeiro)
        List<Map<String, Object>> listaClientes = clientes.stream()
                .sorted(Comparator.comparing(Usuario::isInadimplente).reversed()
                        .thenComparing(u -> u.getSaldoCarteira() != null ? u.getSaldoCarteira() : BigDecimal.ZERO))
                .map(this::converterUsuarioResumo)
                .toList();
        kpis.put("clientes", listaClientes);

        // Lista detalhada de agendamentos para o Admin acompanhar e gerenciar
        List<Map<String, Object>> listaAgendamentos = todosPedidos.stream()
                .map(p -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", p.getId());
                    item.put("trackingCode", p.getTrackingCode());
                    item.put("clienteId", p.getCliente() != null ? p.getCliente().getId() : null);
                    item.put("clienteNome", p.getCliente() != null ? p.getCliente().getNome() : "-");
                    item.put("clienteEmail", p.getCliente() != null ? p.getCliente().getEmail() : "-");
                    item.put("clienteInadimplente", p.getCliente() != null && p.getCliente().isInadimplente());
                    item.put("automovelNome", p.getAutomovel() != null ? p.getAutomovel().getMarca() + " " + p.getAutomovel().getModelo() : "Paddock / Sem Veículo");
                    item.put("circuitoId", resolverIdCircuito(p));
                    item.put("circuitoNome", resolverNomeCircuito(p));
                    item.put("trackSlotId", p.getTrackSlot() != null ? p.getTrackSlot().getId() : null);
                    String slotData = "Data a definir";
                    if (p.getTrackSlot() != null && p.getTrackSlot().getData() != null) {
                        slotData = p.getTrackSlot().getData().toString();
                    } else if (p.getDataInicio() != null) {
                        slotData = p.getDataInicio().toLocalDate().toString();
                    }
                    item.put("slotData", slotData);
                    item.put("slotTurno", p.getTrackSlot() != null ? p.getTrackSlot().getTurno() : "FULL_DAY");
                    item.put("tipoServico", p.getTipoServico());
                    item.put("valorTotal", p.getValorTotal());
                    item.put("descontoFidelidade", p.getDescontoFidelidade());
                    item.put("valorFinal", p.getValorFinal());
                    item.put("valorSinistro", p.getValorSinistro() != null ? p.getValorSinistro() : BigDecimal.ZERO);
                    item.put("motivoSinistro", p.getMotivoSinistro());
                    item.put("formaPagamento", p.getFormaPagamento());
                    item.put("pagamentoStatus", p.getPagamentoStatus());
                    item.put("status", p.getStatus());
                    return item;
                })
                .toList();
        kpis.put("agendamentos", listaAgendamentos);

        // 6. Monitoramento de Saúde da Fila Assíncrona & DLQ
        kpis.put("saudeMensageriaQueue", queueEngine.getMetricas());

        return kpis;
    }

    @Transactional
    public Map<String, Object> aplicarJurosCliente(Long usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado."));
        TransacaoApexPay transacao = apexPayFacade.aplicarJurosInadimplencia(u.getEmail());
        return Map.of(
                "message", "Juros diários (0.1%) aplicados com sucesso.",
                "transacao", transacao,
                "carteira", apexPayFacade.getResumoCarteira(u.getEmail())
        );
    }

    @Transactional
    public Map<String, Object> registrarSinistro(Long pedidoId, BigDecimal valor, String motivo) {
        Pedido p = pedidoRepository.findById(pedidoId)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado."));
        if (p.getCliente() == null) {
            throw new IllegalStateException("Agendamento sem cliente vinculado.");
        }
        if (!"APROVADO".equalsIgnoreCase(p.getStatus())) {
            throw new IllegalStateException("Só é possível registrar franquia de sinistro em sessões com status APROVADO.");
        }
        if ("VISITA_BOX".equalsIgnoreCase(p.getTipoServico())) {
            throw new IllegalArgumentException("A modalidade Visita ao Box não envolve condução de veículo em pista e não permite cobrança de sinistro.");
        }

        TransacaoApexPay transacao = apexPayFacade.lancarCobrancaSinistro(
                p.getCliente().getEmail(), valor, p.getTrackingCode(), motivo
        );

        BigDecimal atual = p.getValorSinistro() != null ? p.getValorSinistro() : BigDecimal.ZERO;
        p.setValorSinistro(atual.add(valor));
        p.setMotivoSinistro(motivo != null && !motivo.isBlank() ? motivo : "Franquia de colisão / avaria em pista");
        pedidoRepository.update(p);

        return Map.of(
                "message", "Franquia / Sinistro registrado na conta ApexPay do piloto.",
                "transacao", transacao,
                "carteiraPiloto", apexPayFacade.getResumoCarteira(p.getCliente().getEmail())
        );
    }

    public List<Map<String, Object>> listarUsuariosAdmin(String busca, String status) {
        String buscaLimpa = busca != null ? busca.trim().toLowerCase() : "";
        String statusLimpo = status != null ? status.trim().toUpperCase() : "";

        return StreamSupport.stream(usuarioRepository.findAll().spliterator(), false)
                .filter(u -> "ROLE_CLIENTE".equals(u.getRole()))
                .filter(u -> {
                    if (buscaLimpa.isEmpty()) return true;
                    boolean matchNome = u.getNome() != null && u.getNome().toLowerCase().contains(buscaLimpa);
                    boolean matchEmail = u.getEmail() != null && u.getEmail().toLowerCase().contains(buscaLimpa);
                    boolean matchCnh = u.getCnhNumero() != null && u.getCnhNumero().contains(buscaLimpa);
                    boolean matchTel = u.getTelefone() != null && u.getTelefone().contains(buscaLimpa);
                    return matchNome || matchEmail || matchCnh || matchTel;
                })
                .filter(u -> {
                    if (statusLimpo.isEmpty() || "TODOS".equals(statusLimpo)) return true;
                    if ("DEVEDORES".equals(statusLimpo) || "INADIMPLENTE".equals(statusLimpo)) return u.isInadimplente();
                    if ("EM_DIA".equals(statusLimpo) || "REGULAR".equals(statusLimpo)) return !u.isInadimplente();
                    if ("BLOQUEADO".equals(statusLimpo)) return "BLOQUEADO_RESERVAS".equalsIgnoreCase(u.getStatusConta());
                    if ("SUSPENSO".equals(statusLimpo)) return "SUSPENSO".equalsIgnoreCase(u.getStatusConta());
                    if ("SEM_CNH".equals(statusLimpo)) return u.getCnhNumero() == null || u.getCnhNumero().isBlank();
                    return true;
                })
                .sorted(Comparator.comparing(Usuario::isInadimplente).reversed()
                        .thenComparing(u -> u.getNome() != null ? u.getNome() : ""))
                .map(this::converterUsuarioResumo)
                .toList();
    }

    public Map<String, Object> buscarUsuarioDetalhesAdmin(Long usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Piloto não encontrado."));

        Map<String, Object> detalhes = converterUsuarioResumo(u);

        // Histórico de pedidos do piloto
        List<Pedido> pedidosPiloto = StreamSupport.stream(pedidoRepository.findAll().spliterator(), false)
                .filter(p -> p.getCliente() != null && Objects.equals(p.getCliente().getId(), usuarioId))
                .sorted(Comparator.comparing(Pedido::getDataPedido, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        List<Map<String, Object>> historicoSessoes = pedidosPiloto.stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("trackingCode", p.getTrackingCode());
            m.put("automovel", p.getAutomovel() != null ? p.getAutomovel().getMarca() + " " + p.getAutomovel().getModelo() : "Paddock");
            m.put("circuito", resolverNomeCircuito(p));
            m.put("tipoServico", p.getTipoServico());
            m.put("status", p.getStatus());
            m.put("valorFinal", p.getValorFinal());
            m.put("valorSinistro", p.getValorSinistro() != null ? p.getValorSinistro() : BigDecimal.ZERO);
            m.put("data", p.getDataPedido() != null ? p.getDataPedido().toString() : "-");
            return m;
        }).toList();

        detalhes.put("historicoSessoes", historicoSessoes);
        detalhes.put("resumoCarteira", apexPayFacade.getResumoCarteira(u.getEmail()));

        return detalhes;
    }

    @Transactional
    public Map<String, Object> criarUsuarioAdmin(Map<String, Object> data) {
        if (data == null) {
            throw new IllegalArgumentException("Dados do usuário são obrigatórios.");
        }

        String nome = data.get("nome") != null ? data.get("nome").toString().trim() : "";
        if (nome.length() < 3) {
            throw new IllegalArgumentException("O nome deve ter no mínimo 3 caracteres.");
        }

        String email = data.get("email") != null ? data.get("email").toString().trim().toLowerCase() : "";
        if (email.isEmpty() || !email.contains("@")) {
            throw new IllegalArgumentException("E-mail de acesso inválido.");
        }
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário cadastrado com este e-mail.");
        }

        Object passObj = data.containsKey("password") ? data.get("password") : data.get("senha");
        String senha = passObj != null ? passObj.toString().trim() : "";
        if (senha.length() < 6) {
            throw new IllegalArgumentException("A senha deve ter no mínimo 6 caracteres.");
        }

        String roleSolicitada = data.get("role") != null ? data.get("role").toString().trim().toUpperCase() : "CLIENTE";
        boolean criarAdmin = roleSolicitada.contains("ADMIN");

        Usuario novoUsuario;
        if (criarAdmin) {
            Agente agente = new Agente();
            agente.setRole("ROLE_ADMIN");
            novoUsuario = agente;
        } else {
            Cliente cliente = new Cliente();
            cliente.setRole("ROLE_CLIENTE");
            if (data.containsKey("cpf") && data.get("cpf") != null) {
                String cpfLimpo = data.get("cpf").toString().replaceAll("\\D", "");
                if (!cpfLimpo.isEmpty()) {
                    if (clienteRepository != null && clienteRepository.findByCpf(cpfLimpo).isPresent()) {
                        throw new IllegalArgumentException("Já existe um piloto cadastrado com este CPF.");
                    }
                    cliente.setCpf(cpfLimpo);
                }
            }
            if (data.containsKey("rg") && data.get("rg") != null) {
                cliente.setRg(data.get("rg").toString().trim());
            }
            if (data.containsKey("profissao") && data.get("profissao") != null) {
                cliente.setProfissao(data.get("profissao").toString().trim());
            }
            novoUsuario = cliente;
        }

        novoUsuario.setNome(nome);
        novoUsuario.setEmail(email);
        novoUsuario.setSenha(BCrypt.hashpw(senha, BCrypt.gensalt()));

        if (data.containsKey("telefone") && data.get("telefone") != null) {
            String tel = data.get("telefone").toString().replaceAll("\\D", "");
            if (!tel.isEmpty()) {
                novoUsuario.setTelefone(tel);
            }
        }

        if (data.containsKey("endereco") && data.get("endereco") != null) {
            novoUsuario.setEndereco(data.get("endereco").toString().trim());
        }

        if (data.containsKey("cnhNumero") && data.get("cnhNumero") != null) {
            String cnh = data.get("cnhNumero").toString().replaceAll("\\D", "");
            if (!cnh.isEmpty()) {
                if (!CnhValidator.isValid(cnh)) {
                    throw new IllegalArgumentException("Número de CNH inválido pelo algoritmo oficial (Módulo 11). Use: " + CnhValidator.CNH_TESTE_OFICIAL);
                }
                novoUsuario.setCnhNumero(cnh);
                novoUsuario.setCnhCategoria(data.get("cnhCategoria") != null ? data.get("cnhCategoria").toString().trim().toUpperCase() : "B");
            }
        }

        if (data.containsKey("dataNascimento") && data.get("dataNascimento") != null) {
            String dt = data.get("dataNascimento").toString().trim();
            if (!dt.isEmpty()) {
                LocalDate nasc = LocalDate.parse(dt);
                long idade = ChronoUnit.YEARS.between(nasc, LocalDate.now());
                if (idade < 21) {
                    throw new IllegalArgumentException("Piloto deve possuir idade mínima de 21 anos.");
                }
                novoUsuario.setDataNascimento(nasc);
            }
        }

        if (data.containsKey("statusConta") && data.get("statusConta") != null) {
            String sc = data.get("statusConta").toString().trim().toUpperCase();
            if (Set.of("ATIVO", "BLOQUEADO_RESERVAS", "SUSPENSO").contains(sc)) {
                novoUsuario.setStatusConta(sc);
            }
        }

        // Saldo Inicial ApexPay (opcional para demonstração de recarga)
        if (data.containsKey("saldoInicial") && data.get("saldoInicial") != null) {
            try {
                BigDecimal saldo = new BigDecimal(data.get("saldoInicial").toString().trim());
                if (saldo.compareTo(BigDecimal.ZERO) > 0) {
                    novoUsuario.creditarSaldo(saldo);
                }
            } catch (Exception ignored) {}
        }

        Usuario salvo = usuarioRepository.save(novoUsuario);

        // Se creditou saldo inicial, registra transação no extrato
        if (salvo.getSaldoCarteira() != null && salvo.getSaldoCarteira().compareTo(BigDecimal.ZERO) > 0 && transacaoRepository != null) {
            TransacaoApexPay tx = new TransacaoApexPay(
                    salvo,
                    "CREDITO_ADMIN",
                    salvo.getSaldoCarteira(),
                    "Bônus de Boas-Vindas Paddock (Admin)",
                    "PIX"
            );
            transacaoRepository.save(tx);
        }

        // Dispara mensagem de boas-vindas no WhatsApp se informado telefone
        if (whatsAppService != null && salvo.getTelefone() != null && !salvo.getTelefone().isBlank()) {
            whatsAppService.enviarBoasVindasAsync(salvo.getTelefone(), salvo.getNome());
        }

        return converterUsuarioResumo(salvo);
    }

    @Transactional
    public Map<String, Object> atualizarUsuarioAdmin(Long usuarioId, Map<String, Object> data) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Piloto não encontrado."));

        boolean isAdmin = u.getRole() != null && (u.getRole().contains("ADMIN") || "admin@apex.com".equalsIgnoreCase(u.getEmail()));

        // 🔒 PROTEÇÃO DE SEGURANÇA: A conta de Administrador é protegida para demonstração pública
        if (isAdmin) {
            if (data.containsKey("senha") || data.containsKey("password")) {
                throw new IllegalStateException("A senha da conta de Administrador é protegida para demonstração pública e não pode ser alterada.");
            }
            if (data.containsKey("role") && !data.get("role").toString().contains("ADMIN")) {
                throw new IllegalStateException("Não é permitido rebaixar os privilégios da conta de Administrador principal.");
            }
            if (data.containsKey("email") && !"admin@apex.com".equalsIgnoreCase(data.get("email").toString().trim())) {
                throw new IllegalStateException("O e-mail da conta de Administrador principal não pode ser alterado.");
            }
            if (data.containsKey("statusConta") && !"ATIVO".equalsIgnoreCase(data.get("statusConta").toString().trim())) {
                throw new IllegalStateException("A conta de Administrador principal não pode ser suspensa ou bloqueada.");
            }
            if (data.containsKey("nome") && data.get("nome") != null && !data.get("nome").toString().trim().equals(u.getNome())) {
                throw new IllegalStateException("O nome e as credenciais da conta de Administrador são imutáveis para demonstração pública.");
            }
        }

        // Se não for admin, permite redefinição direta de senha pelo administrador
        if (!isAdmin && (data.containsKey("password") || data.containsKey("senha"))) {
            Object passObj = data.containsKey("password") ? data.get("password") : data.get("senha");
            if (passObj != null && !passObj.toString().trim().isEmpty()) {
                String pass = passObj.toString().trim();
                if (pass.length() < 6) {
                    throw new IllegalArgumentException("A nova senha deve ter no mínimo 6 caracteres.");
                }
                u.setSenha(BCrypt.hashpw(pass, BCrypt.gensalt()));
            }
        }

        if (!isAdmin && data.containsKey("role") && data.get("role") != null) {
            String r = data.get("role").toString().trim().toUpperCase();
            u.setRole(r.contains("ADMIN") ? "ROLE_ADMIN" : "ROLE_CLIENTE");
        }

        if (data.containsKey("nome") && data.get("nome") != null) {
            String nome = data.get("nome").toString().trim();
            if (nome.length() < 3) {
                throw new IllegalArgumentException("O nome deve ter no mínimo 3 caracteres.");
            }
            u.setNome(nome);
        }

        if (data.containsKey("email") && data.get("email") != null) {
            String email = data.get("email").toString().trim().toLowerCase();
            if (!email.equalsIgnoreCase(u.getEmail())) {
                if (usuarioRepository.findByEmail(email).isPresent()) {
                    throw new IllegalArgumentException("Já existe outro usuário cadastrado com este e-mail.");
                }
                u.setEmail(email);
            }
        }

        if (data.containsKey("telefone") && data.get("telefone") != null) {
            String tel = data.get("telefone").toString().replaceAll("\\D", "");
            u.setTelefone(tel);
        }

        if (data.containsKey("endereco") && data.get("endereco") != null) {
            u.setEndereco(data.get("endereco").toString().trim());
        }

        if (data.containsKey("statusConta") && data.get("statusConta") != null) {
            String sc = data.get("statusConta").toString().trim().toUpperCase();
            if (Set.of("ATIVO", "BLOQUEADO_RESERVAS", "SUSPENSO").contains(sc)) {
                u.setStatusConta(sc);
            }
        }

        if (data.containsKey("statusFinanceiro") && data.get("statusFinanceiro") != null) {
            String sf = data.get("statusFinanceiro").toString().trim().toUpperCase();
            if (Set.of("REGULAR", "INADIMPLENTE").contains(sf)) {
                u.setStatusFinanceiro(sf);
            }
        }

        if (data.containsKey("cnhNumero") && data.get("cnhNumero") != null) {
            String cnh = data.get("cnhNumero").toString().replaceAll("\\D", "");
            if (!cnh.isEmpty()) {
                if (!CnhValidator.isValid(cnh)) {
                    throw new IllegalArgumentException("Número de CNH inválido pelo algoritmo oficial (Módulo 11). Use: " + CnhValidator.CNH_TESTE_OFICIAL);
                }
                u.setCnhNumero(cnh);
            } else {
                u.setCnhNumero(null);
            }
        }

        if (data.containsKey("cnhCategoria") && data.get("cnhCategoria") != null) {
            u.setCnhCategoria(data.get("cnhCategoria").toString().trim().toUpperCase());
        }

        if (data.containsKey("dataNascimento") && data.get("dataNascimento") != null) {
            String dt = data.get("dataNascimento").toString().trim();
            if (!dt.isEmpty()) {
                LocalDate nasc = LocalDate.parse(dt);
                long idade = ChronoUnit.YEARS.between(nasc, LocalDate.now());
                if (idade < 21) {
                    throw new IllegalArgumentException("Piloto deve possuir idade mínima de 21 anos.");
                }
                u.setDataNascimento(nasc);
            }
        }

        if (u instanceof Cliente cliente) {
            if (data.containsKey("cpf") && data.get("cpf") != null) {
                cliente.setCpf(data.get("cpf").toString().replaceAll("\\D", ""));
            }
            if (data.containsKey("rg") && data.get("rg") != null) {
                cliente.setRg(data.get("rg").toString().trim());
            }
        }

        usuarioRepository.update(u);
        return buscarUsuarioDetalhesAdmin(usuarioId);
    }

    @Transactional
    public Map<String, Object> excluirUsuarioAdmin(Long usuarioId) {
        Usuario u = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Piloto não encontrado."));

        if (u.getRole() != null && (u.getRole().contains("ADMIN") || "admin@apex.com".equalsIgnoreCase(u.getEmail()))) {
            throw new IllegalStateException("Não é permitido excluir o usuário Administrador principal.");
        }

        // Verifica se o piloto possui histórico de pedidos no paddock
        boolean temPedidos = StreamSupport.stream(pedidoRepository.findAll().spliterator(), false)
                .anyMatch(p -> p.getCliente() != null && Objects.equals(p.getCliente().getId(), usuarioId));

        if (temPedidos) {
            // Preserva integridade relacional do histórico: suspende conta
            u.setStatusConta("SUSPENSO");
            u.setStatusFinanceiro("INADIMPLENTE");
            usuarioRepository.update(u);
            return Map.of(
                    "success", true,
                    "deleted", false,
                    "message", "O piloto possui histórico de sessões em pista e foi SUSPENSO para garantir a integridade dos relatórios e telemetria."
            );
        } else {
            usuarioRepository.delete(u);
            return Map.of(
                    "success", true,
                    "deleted", true,
                    "message", "Piloto excluído com sucesso do sistema."
            );
        }
    }

    private Map<String, Object> converterUsuarioResumo(Usuario u) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", u.getId());
        item.put("nome", u.getNome());
        item.put("email", u.getEmail());
        item.put("telefone", u.getTelefone());
        item.put("endereco", u.getEndereco());
        item.put("cnhNumero", u.getCnhNumero());
        item.put("cnhCategoria", u.getCnhCategoria());
        item.put("dataNascimento", u.getDataNascimento());
        item.put("statusConta", u.getStatusConta());
        item.put("saldoCarteira", u.getSaldoCarteira() != null ? u.getSaldoCarteira() : BigDecimal.ZERO);
        item.put("totalDepositadoHistorico", u.getTotalDepositadoHistorico() != null ? u.getTotalDepositadoHistorico() : BigDecimal.ZERO);
        item.put("tierFidelidade", u.getTierFidelidade());
        item.put("porcentagemDesconto", u.getFatorDesconto().multiply(new BigDecimal("100")).intValue());
        item.put("statusFinanceiro", u.isInadimplente() ? "INADIMPLENTE" : "REGULAR");
        item.put("inadimplente", u.isInadimplente());
        return item;
    }

    private String resolverIdCircuito(Pedido p) {
        if (p.getTrackSlot() != null && p.getTrackSlot().getCircuito() != null) {
            return p.getTrackSlot().getCircuito().getId();
        }
        if (p.getAutomovel() != null && p.getAutomovel().getCircuito() != null) {
            return p.getAutomovel().getCircuito().getId();
        }
        return null;
    }

    private String resolverNomeCircuito(Pedido p) {
        if (p.getTrackSlot() != null && p.getTrackSlot().getCircuito() != null) {
            return p.getTrackSlot().getCircuito().getNome();
        }
        if (p.getAutomovel() != null && p.getAutomovel().getCircuito() != null) {
            return p.getAutomovel().getCircuito().getNome();
        }
        return "Circuito Internacional";
    }
}
