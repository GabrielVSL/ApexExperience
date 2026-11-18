package com.aluguel.facades;

import com.aluguel.models.*;
import com.aluguel.repositories.*;
import com.aluguel.utils.CnhValidator;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Singleton
public class PedidoFacade {

    private final PedidoRepository pedidoRepository;
    private final AutomovelRepository automovelRepository;
    private final UsuarioRepository usuarioRepository;
    private final TrackSlotRepository trackSlotRepository;
    private final ApexPayFacade apexPayFacade;
    private final com.aluguel.services.EmailService emailService;
    private final com.aluguel.services.QrCodePassService qrCodePassService;

    @Inject
    public PedidoFacade(PedidoRepository pedidoRepository,
                        AutomovelRepository automovelRepository,
                        UsuarioRepository usuarioRepository,
                        TrackSlotRepository trackSlotRepository,
                        ApexPayFacade apexPayFacade,
                        @io.micronaut.core.annotation.Nullable com.aluguel.services.EmailService emailService,
                        @io.micronaut.core.annotation.Nullable com.aluguel.services.QrCodePassService qrCodePassService) {
        this.pedidoRepository = pedidoRepository;
        this.automovelRepository = automovelRepository;
        this.usuarioRepository = usuarioRepository;
        this.trackSlotRepository = trackSlotRepository;
        this.apexPayFacade = apexPayFacade;
        this.emailService = emailService;
        this.qrCodePassService = qrCodePassService;
    }

    public PedidoFacade(PedidoRepository pedidoRepository,
                        AutomovelRepository automovelRepository,
                        UsuarioRepository usuarioRepository,
                        TrackSlotRepository trackSlotRepository,
                        ApexPayFacade apexPayFacade,
                        com.aluguel.services.EmailService emailService) {
        this(pedidoRepository, automovelRepository, usuarioRepository, trackSlotRepository, apexPayFacade, emailService, null);
    }

    public PedidoFacade(PedidoRepository pedidoRepository,
                        AutomovelRepository automovelRepository,
                        UsuarioRepository usuarioRepository,
                        TrackSlotRepository trackSlotRepository,
                        ApexPayFacade apexPayFacade) {
        this(pedidoRepository, automovelRepository, usuarioRepository, trackSlotRepository, apexPayFacade, null);
    }

    public PedidoFacade(PedidoRepository pedidoRepository,
                        AutomovelRepository automovelRepository,
                        UsuarioRepository usuarioRepository,
                        TrackSlotRepository trackSlotRepository) {
        this(pedidoRepository, automovelRepository, usuarioRepository, trackSlotRepository, null);
    }

    public PedidoFacade(PedidoRepository pedidoRepository,
                        AutomovelRepository automovelRepository,
                        UsuarioRepository usuarioRepository) {
        this(pedidoRepository, automovelRepository, usuarioRepository, null, null);
    }

    public List<Map<String, String>> buscarDatasOcupadas(Long automovelId) {
        List<String> statusAtivos = List.of("AGUARDANDO_APROVACAO", "PENDENTE_EMPRESA", "PENDENTE_BANCO", "APROVADO", "REVISAO_CLIENTE");
        List<Pedido> pedidos = pedidoRepository.findByAutomovelIdAndStatusIn(automovelId, statusAtivos);

        return pedidos.stream().map(p -> Map.of(
            "from", p.getDataInicio().toString(),
            "to", p.getDataFim().toString()
        )).collect(Collectors.toList());
    }

    @Transactional
    public Pedido criarPedido(Pedido pedido, String emailCliente) {
        String servico = pedido.getTipoServico() != null ? pedido.getTipoServico() : "TRACK_EXPERIENCE";
        boolean isVisitaBox = "VISITA_BOX".equalsIgnoreCase(servico);

        Automovel automovel = null;
        if (!isVisitaBox) {
            if (pedido.getAutomovel() == null || pedido.getAutomovel().getId() == null) {
                throw new IllegalArgumentException("Automóvel inválido.");
            }
            automovel = automovelRepository.findById(pedido.getAutomovel().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Automóvel não encontrado."));
        } else if (pedido.getAutomovel() != null && pedido.getAutomovel().getId() != null) {
            automovel = automovelRepository.findById(pedido.getAutomovel().getId()).orElse(null);
        }

        // 1. Validação de Datas
        if (pedido.getDataFim() == null || pedido.getDataInicio() == null) {
            throw new IllegalArgumentException("Datas de início e fim são obrigatórias.");
        }
        if (!pedido.getDataFim().isAfter(pedido.getDataInicio())) {
            throw new IllegalArgumentException("A data de devolução não pode ser anterior ou igual à data de retirada.");
        }
        if (pedido.getDataInicio().toLocalDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O aluguel não pode iniciar no passado.");
        }
        if (pedido.getDataInicio().getDayOfWeek() == DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("As pistas permanecem fechadas às segundas-feiras para manutenção FIA e calibração de telemetria. Escolha outra data.");
        }

        // 2. Verificação de Overbooking e Conflitos de Veículo
        if (automovel != null) {
            long conflitos = pedidoRepository.countAlugueisConflitantes(
                automovel.getId(),
                pedido.getDataInicio(),
                pedido.getDataFim()
            );

            if (conflitos > 0) {
                throw new IllegalArgumentException("Este veículo já está reservado para o período selecionado. Por favor, escolha outras datas ou outro veículo.");
            }
        }

        // 3. Vincula o Cliente logado e realiza checagem financeira de Inadimplência (ApexPay)
        Usuario usuario = usuarioRepository.findByEmail(emailCliente)
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado."));

        if (!(usuario instanceof Cliente)) {
            throw new IllegalArgumentException("Apenas clientes podem fazer pedidos de aluguel ou agendamentos de pista.");
        }

        Cliente cliente = (Cliente) usuario;

        if (cliente.isInadimplente()) {
            throw new IllegalArgumentException("Conta com pendências financeiras no ApexPay (Saldo: R$ " +
                    cliente.getSaldoCarteira() + "). Regularize os débitos pendentes para liberar novos agendamentos de autódromo.");
        }

        // Atualiza dados de habilitação enviados no checkout se informados
        boolean perfilAtualizado = false;
        if (pedido.getCnhInformada() != null && !pedido.getCnhInformada().isBlank()) {
            String cnhLimpa = pedido.getCnhInformada().replaceAll("\\D", "");
            if (!CnhValidator.isValid(cnhLimpa)) {
                throw new IllegalArgumentException("CNH informada inválida no algoritmo oficial (Módulo 11). Para testes utilize: " + CnhValidator.CNH_TESTE_OFICIAL);
            }
            cliente.setCnhNumero(cnhLimpa);
            perfilAtualizado = true;
        }
        if (pedido.getDataNascimentoInformada() != null && !pedido.getDataNascimentoInformada().isBlank()) {
            cliente.setDataNascimento(LocalDate.parse(pedido.getDataNascimentoInformada()));
            perfilAtualizado = true;
        }
        if (perfilAtualizado) {
            usuarioRepository.update(cliente);
        }

        // 4. Validações de Elegibilidade de Pilotagem vs Visita/Carona
        boolean exigePilotagem = "TRACK_EXPERIENCE".equalsIgnoreCase(servico) || "PACOTE_VIP".equalsIgnoreCase(servico);

        if (exigePilotagem) {
            if (cliente.getDataNascimento() == null) {
                throw new IllegalArgumentException("Data de nascimento obrigatória para validação de idade mínima de pilotagem (Serviço: " + servico + ").");
            }
            long idade = ChronoUnit.YEARS.between(cliente.getDataNascimento(), LocalDate.now());
            if (idade < 21) {
                throw new IllegalArgumentException("Idade mínima de 21 anos exigida para pilotagem de supercarros em autódromos internacionais (Serviço: " + servico + ").");
            }

            String cnh = cliente.getCnhNumero();
            if (cnh == null || !CnhValidator.isValid(cnh)) {
                throw new IllegalArgumentException("CNH válida obrigatória para pilotagem em pista (Módulo 11). Informe sua CNH ou utilize a de teste oficial (" + CnhValidator.CNH_TESTE_OFICIAL + ").");
            }
        }

        // 5. Verificação e Reserva do TrackSlot (Vagas de Box no Autódromo)
        if (pedido.getTrackSlot() != null && pedido.getTrackSlot().getId() != null && trackSlotRepository != null) {
            TrackSlot slot = trackSlotRepository.findById(pedido.getTrackSlot().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Turno/Slot do autódromo não encontrado."));

            if (!slot.temVagaDisponivel()) {
                throw new IllegalArgumentException("Vagas de box esgotadas para o autódromo neste turno (" + slot.getTurno() + "). Escolha outro horário.");
            }
            slot.ocuparVaga();
            trackSlotRepository.update(slot);
            pedido.setTrackSlot(slot);
        }

        pedido.setAutomovel(automovel);
        pedido.setCliente(cliente);
        pedido.setTipoServico(servico);

        // 6. Cálculo por Modalidade de Sessão + Taxa de Turno (Gateway ApexPay sem descontos de tier)
        BigDecimal valorBase = calcularValorBase(
                pedido.getDataInicio(),
                pedido.getDataFim(),
                pedido.getTrackSlot(),
                automovel,
                servico,
                pedido.getValorTotal()
        );
        BigDecimal desconto = BigDecimal.ZERO;
        BigDecimal valorFinal = valorBase;

        pedido.setValorTotal(valorBase);
        pedido.setDescontoFidelidade(desconto);
        pedido.setValorFinal(valorFinal);

        if (pedido.getTrackingCode() == null || pedido.getTrackingCode().isBlank()) {
            pedido.setTrackingCode("APX-" + System.currentTimeMillis());
        }

        // 7. Processamento Financeiro Gateway Simulado ApexPay
        String formaPgto = pedido.getFormaPagamento();
        if (apexPayFacade != null && "CARTEIRA_APEXPAY".equalsIgnoreCase(formaPgto)) {
            BigDecimal saldoAtual = cliente.getSaldoCarteira() != null ? cliente.getSaldoCarteira() : BigDecimal.ZERO;
            if (saldoAtual.compareTo(valorFinal) < 0) {
                throw new IllegalArgumentException(String.format(
                        "Saldo insuficiente na carteira ApexPay (Saldo: R$ %s | Sessão: R$ %s). Faça uma recarga simulada no ApexPay ou escolha Fatura Pós-Paga.",
                        saldoAtual, valorFinal
                ));
            }
            apexPayFacade.debitarValorLiquido(
                    cliente,
                    valorFinal,
                    pedido.getTrackingCode(),
                    String.format("Checkout Saldo ApexPay — %s [%s]", servico, pedido.getTrackingCode())
            );
            pedido.setPagamentoStatus("PAGO_CARTEIRA");
            pedido.setStatus("APROVADO");
        } else if ("FATURA_APEXPAY".equalsIgnoreCase(formaPgto)) {
            // Fatura pós-paga NÃO debita antes da homologação do Race Control
            pedido.setPagamentoStatus("FATURA_AGUARDANDO_APROVACAO");
            pedido.setStatus("AGUARDANDO_APROVACAO");
        } else {
            pedido.setPagamentoStatus("PENDENTE");
            pedido.setStatus("AGUARDANDO_APROVACAO");
        }

        Pedido salvo = pedidoRepository.save(pedido);

        if (qrCodePassService != null) {
            qrCodePassService.gerarOuAtualizarQrCode(salvo);
            salvo = pedidoRepository.update(salvo);
        }

        // Se a reserva já nasce APROVADA (ex: paga via Carteira ApexPay), dispara passe por e-mail
        if ("APROVADO".equals(salvo.getStatus()) && emailService != null && cliente.getEmail() != null && !cliente.getEmail().isBlank()) {
            String modeloCarro = automovel != null ? (automovel.getMarca() + " " + automovel.getModelo()) : "Acesso Boxes / Visita VIP";
            String pista = salvo.getTrackSlot() != null && salvo.getTrackSlot().getCircuito() != null ? salvo.getTrackSlot().getCircuito().getNome() : "Circuito Apex Track";
            String dataFormatada = salvo.getDataInicio() != null ? salvo.getDataInicio().toString().replace("T", " ") : "Data confirmada";
            emailService.enviarConfirmacaoReservaAsync(cliente.getEmail(), cliente.getNome(), modeloCarro, pista, dataFormatada, salvo.getId(), salvo.getQrCodePayload());
        }

        return salvo;
    }

    @Transactional
    public Pedido avaliarPedido(Long idPedido, String emailAgente, String novoStatus) {
        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado."));

        Usuario usuario = usuarioRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new IllegalArgumentException("Administrador não encontrado."));

        if (!"ROLE_ADMIN".equals(usuario.getRole())) {
            throw new IllegalArgumentException("Apenas o administrador Apex Race Control pode homologar sessões.");
        }

        String statusAtual = pedido.getStatus();
        boolean aguardandoHomologacao = "AGUARDANDO_APROVACAO".equals(statusAtual)
                || "PENDENTE_EMPRESA".equals(statusAtual)
                || "PENDENTE_BANCO".equals(statusAtual);

        if (!aguardandoHomologacao) {
            throw new IllegalArgumentException("Este pedido não está aguardando homologação.");
        }

        if ("APROVADO".equalsIgnoreCase(novoStatus)) {
            pedido.setStatus("APROVADO");
            efetivarPagamentoFaturaSeNecessario(pedido, "Fatura Pós-Paga Homologada");
            if (qrCodePassService != null) {
                qrCodePassService.gerarOuAtualizarQrCode(pedido);
            }

            // Dispara Passe com QR Code por e-mail após homologação do Race Control
            if (emailService != null && pedido.getCliente() != null && pedido.getCliente().getEmail() != null && !pedido.getCliente().getEmail().isBlank()) {
                String modeloCarro = pedido.getAutomovel() != null ? (pedido.getAutomovel().getMarca() + " " + pedido.getAutomovel().getModelo()) : "Acesso Boxes / Visita VIP";
                String pista = pedido.getTrackSlot() != null && pedido.getTrackSlot().getCircuito() != null ? pedido.getTrackSlot().getCircuito().getNome() : "Circuito Apex Track";
                String dataFormatada = pedido.getDataInicio() != null ? pedido.getDataInicio().toString().replace("T", " ") : "Data confirmada";
                emailService.enviarConfirmacaoReservaAsync(pedido.getCliente().getEmail(), pedido.getCliente().getNome(), modeloCarro, pista, dataFormatada, pedido.getId(), pedido.getQrCodePayload());
            }
        } else {
            pedido.setStatus("REJEITADO");
            liberarSlotSePresente(pedido);
            estornarSeNecessario(pedido, "Sessão rejeitada pelo Race Control Apex");
            if (qrCodePassService != null) {
                qrCodePassService.gerarOuAtualizarQrCode(pedido);
            }
        }

        if (usuario instanceof Agente) {
            pedido.setAgenteAvaliador((Agente) usuario);
        }
        return pedidoRepository.update(pedido);
    }

    public List<Pedido> listarPedidosParaAgente(String emailAgente) {
        Usuario usuario = usuarioRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new IllegalArgumentException("Administrador não encontrado."));

        if (!"ROLE_ADMIN".equals(usuario.getRole())) {
            throw new IllegalArgumentException("Apenas o administrador Apex Race Control pode listar todas as sessões.");
        }

        return java.util.stream.StreamSupport.stream(pedidoRepository.findAll().spliterator(), false)
                .sorted(Comparator.comparing(Pedido::getDataPedido, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    public List<Pedido> listarPedidosDoCliente(String emailCliente) {
        return pedidoRepository.findByClienteEmail(emailCliente).stream()
                .sorted(Comparator.comparing(Pedido::getDataPedido, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional
    public Pedido modificarPedidoAgente(Long idPedido, String emailAgente, Pedido dadosModificados) {
        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado."));

        Usuario usuario = usuarioRepository.findByEmail(emailAgente)
                .orElseThrow(() -> new IllegalArgumentException("Administrador não encontrado."));

        if (!"ROLE_ADMIN".equals(usuario.getRole())) {
            throw new IllegalArgumentException("Apenas o administrador Apex Race Control pode propor ajuste de turno/horário.");
        }

        String statusAtual = pedido.getStatus();
        if (!"AGUARDANDO_APROVACAO".equals(statusAtual)
                && !"PENDENTE_EMPRESA".equals(statusAtual)
                && !"PENDENTE_BANCO".equals(statusAtual)) {
            throw new IllegalArgumentException("Apenas pedidos aguardando homologação podem receber contraproposta.");
        }

        LocalDateTime novaInicio = dadosModificados.getDataInicio();
        LocalDateTime novaFim = dadosModificados.getDataFim();

        // Suporte completo à troca de TrackSlot (libera a vaga anterior e aloca a nova vaga no autódromo)
        if (dadosModificados.getTrackSlot() != null && dadosModificados.getTrackSlot().getId() != null && trackSlotRepository != null) {
            Long novoSlotId = dadosModificados.getTrackSlot().getId();
            TrackSlot novoSlot = trackSlotRepository.findById(novoSlotId)
                    .orElseThrow(() -> new IllegalArgumentException("Novo turno/slot do autódromo não encontrado."));

            Long slotAtualId = pedido.getTrackSlot() != null ? pedido.getTrackSlot().getId() : null;
            if (!novoSlotId.equals(slotAtualId)) {
                if (!novoSlot.temVagaDisponivel()) {
                    throw new IllegalArgumentException("Vagas de box esgotadas no turno sugerido (" + novoSlot.getTurno() + ").");
                }
                liberarSlotSePresente(pedido);
                novoSlot.ocuparVaga();
                trackSlotRepository.update(novoSlot);
                pedido.setTrackSlot(novoSlot);
            }

            if (novaInicio == null || novaFim == null) {
                LocalDateTime[] janela = resolverJanelaSlot(novoSlot);
                if (novaInicio == null) novaInicio = janela[0];
                if (novaFim == null) novaFim = janela[1];
            }
        }

        if (novaInicio == null || novaFim == null) {
            throw new IllegalArgumentException("Datas de início e fim são obrigatórias para a contraproposta.");
        }
        if (!novaFim.isAfter(novaInicio)) {
            throw new IllegalArgumentException("A data de devolução/fim não pode ser anterior ou igual à data de início.");
        }
        if (novaInicio.toLocalDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("O período sugerido não pode iniciar no passado.");
        }
        if (novaInicio.getDayOfWeek() == DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("As pistas permanecem fechadas às segundas-feiras para manutenção FIA. Escolha outra data.");
        }

        if (pedido.getAutomovel() != null) {
            long conflitos = pedidoRepository.countAlugueisConflitantesExcluindoPedido(
                    pedido.getAutomovel().getId(),
                    pedido.getId(),
                    novaInicio,
                    novaFim
            );
            if (conflitos > 0) {
                throw new IllegalArgumentException("As novas datas conflitam com outra reserva deste automóvel.");
            }
        }

        pedido.setDataInicio(novaInicio);
        pedido.setDataFim(novaFim);
        if (usuario instanceof Agente) {
            pedido.setAgenteAvaliador((Agente) usuario);
        }

        String servico = pedido.getTipoServico() != null ? pedido.getTipoServico() : "TRACK_EXPERIENCE";
        BigDecimal valorBase = calcularValorBase(
                pedido.getDataInicio(),
                pedido.getDataFim(),
                pedido.getTrackSlot(),
                pedido.getAutomovel(),
                servico,
                pedido.getValorTotal()
        );

        pedido.setValorTotal(valorBase);
        pedido.setDescontoFidelidade(BigDecimal.ZERO);
        pedido.setValorFinal(valorBase);
        pedido.setStatus("REVISAO_CLIENTE");

        if (qrCodePassService != null) {
            qrCodePassService.gerarOuAtualizarQrCode(pedido);
        }

        return pedidoRepository.update(pedido);
    }

    @Transactional
    public Pedido responderContrapropostaCliente(Long idPedido, String emailCliente, boolean aceito) {
        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado."));

        if (!pedido.getCliente().getEmail().equals(emailCliente)) {
            throw new IllegalArgumentException("Este pedido não pertence a você.");
        }

        if (!"REVISAO_CLIENTE".equals(pedido.getStatus())) {
            throw new IllegalArgumentException("Este pedido não está aguardando sua revisão.");
        }

        if (aceito) {
            // Como a contraproposta já foi validada pelo Race Control Admin, o aceite confirma a sessão diretamente
            pedido.setStatus("APROVADO");
            efetivarPagamentoFaturaSeNecessario(pedido, "Fatura Pós-Paga Aceita pelo Piloto");
        } else {
            pedido.setStatus("CANCELADO");
            liberarSlotSePresente(pedido);
            estornarSeNecessario(pedido, "Contraproposta de turno recusada pelo piloto");
        }
        if (qrCodePassService != null) {
            qrCodePassService.gerarOuAtualizarQrCode(pedido);
        }
        return pedidoRepository.update(pedido);
    }

    @Transactional
    public Pedido cancelarPedidoCliente(Long idPedido, String emailCliente) {
        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado."));

        if (pedido.getCliente() == null || !pedido.getCliente().getEmail().equals(emailCliente)) {
            throw new IllegalArgumentException("Este pedido não pertence a você.");
        }

        if ("CANCELADO".equals(pedido.getStatus()) || "REJEITADO".equals(pedido.getStatus())) {
            throw new IllegalArgumentException("Este pedido já foi finalizado.");
        }

        if (pedido.getCheckInRealizadoEm() != null) {
            throw new IllegalStateException("Não é possível cancelar uma sessão após o check-in no box.");
        }

        LocalDateTime agora = LocalDateTime.now();
        int percentualTaxa = calcularPercentualTaxaCancelamento(pedido, agora);
        BigDecimal valorBase = pedido.getValorFinal() != null
                ? pedido.getValorFinal()
                : (pedido.getValorTotal() != null ? pedido.getValorTotal() : BigDecimal.ZERO);
        BigDecimal valorTaxa = calcularValorPercentual(valorBase, percentualTaxa);

        pedido.setStatus("CANCELADO");
        pedido.setTaxaAplicada(valorTaxa);
        liberarSlotSePresente(pedido);

        String pStatus = pedido.getPagamentoStatus();
        boolean jaDebitadoOuPago = "PAGO_CARTEIRA".equalsIgnoreCase(pStatus)
                || "DEBITO_ABERTO".equalsIgnoreCase(pStatus)
                || "FATURA_EM_ABERTO".equalsIgnoreCase(pStatus);

        if (jaDebitadoOuPago && apexPayFacade != null) {
            BigDecimal valorEstorno = valorBase.subtract(valorTaxa).max(BigDecimal.ZERO);
            if (valorEstorno.compareTo(BigDecimal.ZERO) > 0) {
                String motivoEstorno = percentualTaxa > 0
                        ? String.format("Reembolso parcial por cancelamento (taxa de %d%% retida)", percentualTaxa)
                        : "Reembolso integral por cancelamento antecipado";
                apexPayFacade.estornarReserva(pedido.getCliente(), valorEstorno, pedido.getTrackingCode(), motivoEstorno);
                pedido.setPagamentoStatus("ESTORNADO");
            } else {
                pedido.setPagamentoStatus("CANCELADO");
            }
        } else if (("FATURA_AGUARDANDO_APROVACAO".equalsIgnoreCase(pStatus) || "PENDENTE".equalsIgnoreCase(pStatus))
                && valorTaxa.compareTo(BigDecimal.ZERO) > 0
                && apexPayFacade != null) {
            apexPayFacade.debitarValorLiquido(
                    pedido.getCliente(),
                    valorTaxa,
                    pedido.getTrackingCode(),
                    String.format("Taxa de cancelamento tardio (%d%%) [%s]", percentualTaxa, pedido.getTrackingCode())
            );
            pedido.setPagamentoStatus("CANCELADO");
        } else {
            pedido.setPagamentoStatus("CANCELADO");
        }

        if (qrCodePassService != null) {
            qrCodePassService.gerarOuAtualizarQrCode(pedido);
        }
        return pedidoRepository.update(pedido);
    }

    public Map<String, Object> obterPoliticaAlteracao(Long idPedido, String emailCliente) {
        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));

        if (pedido.getCliente() == null || !pedido.getCliente().getEmail().equals(emailCliente)) {
            throw new IllegalArgumentException("Este pedido não pertence a você.");
        }

        LocalDateTime agora = LocalDateTime.now();
        long horasAteSessao = pedido.getDataInicio() != null
                ? ChronoUnit.HOURS.between(agora, pedido.getDataInicio())
                : 999L;

        BigDecimal valorBase = pedido.getValorFinal() != null
                ? pedido.getValorFinal()
                : (pedido.getValorTotal() != null ? pedido.getValorTotal() : BigDecimal.ZERO);

        int faixaAtualCancelamento = calcularFaixaCancelamentoPorHoras(horasAteSessao);
        int taxaCancelamentoMinima = pedido.getTaxaCancelamentoMinima();
        int taxaCancelamentoPercent = Math.max(faixaAtualCancelamento, taxaCancelamentoMinima);
        BigDecimal taxaCancelamentoValor = calcularValorPercentual(valorBase, taxaCancelamentoPercent);
        BigDecimal valorEstornoLiquido = valorBase.subtract(taxaCancelamentoValor).max(BigDecimal.ZERO);

        boolean statusAtivo = !"CANCELADO".equals(pedido.getStatus()) && !"REJEITADO".equals(pedido.getStatus());
        boolean semCheckIn = pedido.getCheckInRealizadoEm() == null;
        boolean podeCancelar = statusAtivo && semCheckIn;

        int reagendamentosUsados = pedido.getReagendamentosCount();
        int reagendamentosLimite = 1;
        boolean podeReagendar = true;
        String motivoBloqueioReagendamento = null;

        if (!statusAtivo) {
            podeReagendar = false;
            motivoBloqueioReagendamento = "Esta sessão já foi finalizada.";
        } else if (!semCheckIn) {
            podeReagendar = false;
            motivoBloqueioReagendamento = "O check-in no box já foi realizado.";
        } else if (reagendamentosUsados >= reagendamentosLimite) {
            podeReagendar = false;
            motivoBloqueioReagendamento = "Cada reserva permite apenas 1 alteração de data.";
        } else if (horasAteSessao < 24) {
            podeReagendar = false;
            motivoBloqueioReagendamento = "Com menos de 24 horas de antecedência não é possível remarcar; apenas cancelar.";
        }

        int taxaReagendamentoPercent = calcularPercentualTaxaReagendamento(horasAteSessao);
        BigDecimal taxaReagendamentoValor = calcularValorPercentual(valorBase, taxaReagendamentoPercent);

        Map<String, Object> politica = new java.util.HashMap<>();
        politica.put("pedidoId", pedido.getId());
        politica.put("horasAteSessao", Math.max(horasAteSessao, 0));
        politica.put("valorBase", valorBase);
        politica.put("podeCancelar", podeCancelar);
        politica.put("taxaCancelamentoPercent", taxaCancelamentoPercent);
        politica.put("taxaCancelamentoValor", taxaCancelamentoValor);
        politica.put("valorEstornoLiquido", valorEstornoLiquido);
        politica.put("travaAntiBurlaAtiva", taxaCancelamentoMinima > faixaAtualCancelamento || reagendamentosUsados > 0);
        politica.put("taxaCancelamentoMinima", taxaCancelamentoMinima);
        politica.put("podeReagendar", podeReagendar);
        politica.put("motivoBloqueioReagendamento", motivoBloqueioReagendamento);
        politica.put("taxaReagendamentoPercent", taxaReagendamentoPercent);
        politica.put("taxaReagendamentoValor", taxaReagendamentoValor);
        politica.put("reagendamentosUsados", reagendamentosUsados);
        politica.put("reagendamentosLimite", reagendamentosLimite);
        return politica;
    }

    @Transactional
    public Pedido reagendarPedidoCliente(Long idPedido, String emailCliente, Long novoSlotId) {
        if (trackSlotRepository == null) {
            throw new IllegalStateException("Serviço de horários indisponível.");
        }
        if (novoSlotId == null) {
            throw new IllegalArgumentException("Selecione a nova data e turno desejados.");
        }

        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));

        if (pedido.getCliente() == null || !pedido.getCliente().getEmail().equals(emailCliente)) {
            throw new IllegalArgumentException("Este pedido não pertence a você.");
        }

        if ("CANCELADO".equals(pedido.getStatus()) || "REJEITADO".equals(pedido.getStatus())) {
            throw new IllegalArgumentException("Não é possível alterar uma sessão cancelada ou recusada.");
        }

        if (pedido.getCheckInRealizadoEm() != null) {
            throw new IllegalStateException("O check-in no box já foi realizado; não é possível alterar a data.");
        }

        if (pedido.getReagendamentosCount() >= 1) {
            throw new IllegalStateException("Limite atingido: cada reserva permite apenas 1 alteração de data.");
        }

        LocalDateTime agora = LocalDateTime.now();
        long horasAteSessao = pedido.getDataInicio() != null
                ? ChronoUnit.HOURS.between(agora, pedido.getDataInicio())
                : 999L;

        if (horasAteSessao < 24) {
            throw new IllegalStateException("Alteração de data bloqueada com menos de 24 horas de antecedência.");
        }

        TrackSlot novoSlot = trackSlotRepository.findById(novoSlotId)
                .orElseThrow(() -> new IllegalArgumentException("Novo horário não encontrado."));

        Long slotAtualId = pedido.getTrackSlot() != null ? pedido.getTrackSlot().getId() : null;
        if (novoSlotId.equals(slotAtualId)) {
            throw new IllegalArgumentException("Escolha uma data ou turno diferente do atual.");
        }

        if (!novoSlot.temVagaDisponivel()) {
            throw new IllegalArgumentException("Não há mais vagas disponíveis para este turno.");
        }

        if (novoSlot.getData() == null || novoSlot.getData().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("A nova data não pode estar no passado.");
        }

        if (novoSlot.getData().getDayOfWeek() == DayOfWeek.MONDAY) {
            throw new IllegalArgumentException("As pistas ficam fechadas às segundas-feiras para manutenção.");
        }

        LocalDateTime[] novaJanela = resolverJanelaSlot(novoSlot);
        if (pedido.getAutomovel() != null) {
            long conflitos = pedidoRepository.countAlugueisConflitantesExcluindoPedido(
                    pedido.getAutomovel().getId(),
                    pedido.getId(),
                    novaJanela[0],
                    novaJanela[1]
            );
            if (conflitos > 0) {
                throw new IllegalArgumentException("O veículo já está reservado para outro piloto nesta data e turno.");
            }
        }

        BigDecimal valorBase = pedido.getValorFinal() != null
                ? pedido.getValorFinal()
                : (pedido.getValorTotal() != null ? pedido.getValorTotal() : BigDecimal.ZERO);

        int taxaCancelamentoOrigem = calcularPercentualTaxaCancelamento(pedido, agora);
        int taxaRemarcacaoPercent = calcularPercentualTaxaReagendamento(horasAteSessao);
        BigDecimal valorTaxaRemarcacao = calcularValorPercentual(valorBase, taxaRemarcacaoPercent);

        if (valorTaxaRemarcacao.compareTo(BigDecimal.ZERO) > 0 && apexPayFacade != null) {
            if ("CARTEIRA_APEXPAY".equalsIgnoreCase(pedido.getFormaPagamento())) {
                BigDecimal saldoAtual = pedido.getCliente().getSaldoCarteira() != null
                        ? pedido.getCliente().getSaldoCarteira()
                        : BigDecimal.ZERO;
                if (saldoAtual.compareTo(valorTaxaRemarcacao) < 0) {
                    throw new IllegalStateException(
                            String.format("Saldo insuficiente no ApexPay para pagar a taxa de alteração de data (R$ %.2f).", valorTaxaRemarcacao)
                    );
                }
            }
            apexPayFacade.debitarValorLiquido(
                    pedido.getCliente(),
                    valorTaxaRemarcacao,
                    pedido.getTrackingCode(),
                    String.format("Taxa de alteração de data (%d%%) [%s]", taxaRemarcacaoPercent, pedido.getTrackingCode())
            );
        }

        // Trava Anti-Burla: preserva a maior taxa de cancelamento vigente antes da remarcação
        pedido.setTaxaCancelamentoMinima(Math.max(pedido.getTaxaCancelamentoMinima(), taxaCancelamentoOrigem));
        pedido.setReagendamentosCount(pedido.getReagendamentosCount() + 1);
        pedido.setTaxaAplicada(valorTaxaRemarcacao);

        liberarSlotSePresente(pedido);
        novoSlot.ocuparVaga();
        trackSlotRepository.update(novoSlot);
        pedido.setTrackSlot(novoSlot);
        pedido.setDataInicio(novaJanela[0]);
        pedido.setDataFim(novaJanela[1]);

        if (qrCodePassService != null) {
            qrCodePassService.gerarOuAtualizarQrCode(pedido);
        }
        return pedidoRepository.update(pedido);
    }

    private int calcularPercentualTaxaCancelamento(Pedido pedido, LocalDateTime agora) {
        if (pedido.getDataInicio() == null) {
            return pedido.getTaxaCancelamentoMinima();
        }
        long horasAteSessao = ChronoUnit.HOURS.between(agora, pedido.getDataInicio());
        int faixaAtual = calcularFaixaCancelamentoPorHoras(horasAteSessao);
        return Math.max(faixaAtual, pedido.getTaxaCancelamentoMinima());
    }

    private int calcularFaixaCancelamentoPorHoras(long horasAteSessao) {
        if (horasAteSessao >= 168) return 0;  // 7 dias ou mais -> gratuito
        if (horasAteSessao >= 72) return 15;  // 3 a 6 dias -> 15%
        if (horasAteSessao >= 24) return 35;  // 1 a 2 dias -> 35%
        return 50;                            // Menos de 24h -> 50%
    }

    private int calcularPercentualTaxaReagendamento(long horasAteSessao) {
        if (horasAteSessao >= 168) return 0;  // 7 dias ou mais -> gratuito
        if (horasAteSessao >= 72) return 10;  // 3 a 6 dias -> 10%
        return 25;                            // 24h a 71h -> 25% (<24h é bloqueado)
    }

    private BigDecimal calcularValorPercentual(BigDecimal valorBase, int percentual) {
        if (valorBase == null || valorBase.compareTo(BigDecimal.ZERO) <= 0 || percentual <= 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return valorBase
                .multiply(BigDecimal.valueOf(percentual))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    public Map<String, Object> obterQrCodeSessao(Long idPedido, String emailSolicitante) {
        if (qrCodePassService == null) {
            throw new IllegalStateException("Serviço de geração de QR Code não inicializado.");
        }
        Pedido pedido = pedidoRepository.findById(idPedido)
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));
        Usuario solicitante = usuarioRepository.findByEmail(emailSolicitante)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        boolean isAdmin = "ROLE_ADMIN".equals(solicitante.getRole());
        boolean isDono = pedido.getCliente() != null && emailSolicitante.equalsIgnoreCase(pedido.getCliente().getEmail());
        if (!isAdmin && !isDono) {
            throw new IllegalStateException("Acesso negado à credencial QR Code de outro piloto.");
        }
        return qrCodePassService.montarResumoQrCode(pedido);
    }

    @Transactional
    public Map<String, Object> validarQrCodeSessao(String qrData, boolean solicitarCheckIn, String emailSolicitante) {
        if (qrCodePassService == null) {
            throw new IllegalStateException("Serviço de validação de QR Code não inicializado.");
        }
        Usuario solicitante = usuarioRepository.findByEmail(emailSolicitante)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        boolean isAdmin = "ROLE_ADMIN".equals(solicitante.getRole());
        if (solicitarCheckIn && !isAdmin) {
            throw new IllegalStateException("Apenas o Race Control (Admin) pode registrar check-in oficial no Box.");
        }

        Map<String, Object> resultado = qrCodePassService.validarQrCode(qrData, solicitarCheckIn);
        if (!isAdmin && resultado.get("sessao") instanceof Map<?, ?> sessaoMap) {
            Object pilotoEmail = sessaoMap.get("pilotoEmail");
            if (pilotoEmail != null && !emailSolicitante.equalsIgnoreCase(pilotoEmail.toString())) {
                throw new IllegalStateException("Acesso negado: esta credencial pertence a outro piloto.");
            }
        }
        return resultado;
    }

    @Transactional
    public Map<String, Object> executarTaskQrCodesAdmin(String emailSolicitante) {
        if (qrCodePassService == null) {
            throw new IllegalStateException("Serviço de QR Code não inicializado.");
        }
        Usuario solicitante = usuarioRepository.findByEmail(emailSolicitante)
                .orElseThrow(() -> new IllegalArgumentException("Administrador não encontrado."));
        if (!"ROLE_ADMIN".equals(solicitante.getRole())) {
            throw new IllegalStateException("Apenas o administrador Apex Race Control pode executar esta task.");
        }
        return qrCodePassService.executarTaskGeracaoQrCodes();
    }

    private BigDecimal calcularValorBase(LocalDateTime dataInicio,
                                         LocalDateTime dataFim,
                                         TrackSlot slot,
                                         Automovel automovel,
                                         String servico,
                                         BigDecimal fallbackValor) {
        BigDecimal valorBase;
        boolean isVisitaBox = "VISITA_BOX".equalsIgnoreCase(servico);
        if (isVisitaBox) {
            valorBase = new BigDecimal("190.00");
        } else if (automovel != null) {
            long dias = ChronoUnit.DAYS.between(dataInicio.toLocalDate(), dataFim.toLocalDate());
            if (dias <= 0) {
                dias = 1;
            }
            BigDecimal precoSessao = automovel.getPrecoPorDia() != null ? automovel.getPrecoPorDia() : BigDecimal.ZERO;
            BigDecimal multiplicadorServico = switch (servico.toUpperCase()) {
                case "FAST_LAP" -> new BigDecimal("0.55");
                case "PACOTE_VIP" -> new BigDecimal("1.70");
                default -> BigDecimal.ONE;
            };
            valorBase = precoSessao.multiply(BigDecimal.valueOf(dias)).multiply(multiplicadorServico).setScale(2, RoundingMode.HALF_UP);
        } else {
            valorBase = fallbackValor != null ? fallbackValor : BigDecimal.ZERO;
        }

        if (slot != null && slot.getTaxaAdicionalTurno() != null) {
            valorBase = valorBase.add(slot.getTaxaAdicionalTurno());
        }
        return valorBase.setScale(2, RoundingMode.HALF_UP);
    }

    private LocalDateTime[] resolverJanelaSlot(TrackSlot slot) {
        LocalDate data = slot.getData() != null ? slot.getData() : LocalDate.now().plusDays(1);
        String turno = slot.getTurno() != null ? slot.getTurno().toUpperCase() : "MANHA";
        LocalTime start = switch (turno) {
            case "TARDE" -> LocalTime.of(13, 0);
            case "NOTURNO" -> LocalTime.of(19, 0);
            default -> LocalTime.of(8, 0);
        };
        LocalTime end = switch (turno) {
            case "TARDE" -> LocalTime.of(17, 0);
            case "NOTURNO" -> LocalTime.of(22, 0);
            default -> LocalTime.of(12, 0);
        };
        return new LocalDateTime[]{LocalDateTime.of(data, start), LocalDateTime.of(data, end)};
    }

    private void efetivarPagamentoFaturaSeNecessario(Pedido pedido, String prefixoDescricao) {
        String pStatus = pedido.getPagamentoStatus();
        boolean jaLiquidado = "PAGO_CARTEIRA".equalsIgnoreCase(pStatus) || "FATURA_EM_ABERTO".equalsIgnoreCase(pStatus);
        if (jaLiquidado) {
            return;
        }
        BigDecimal valor = pedido.getValorFinal() != null ? pedido.getValorFinal() : pedido.getValorTotal();
        if (apexPayFacade != null && pedido.getCliente() != null && valor != null && valor.compareTo(BigDecimal.ZERO) > 0) {
            apexPayFacade.debitarValorLiquido(
                    pedido.getCliente(),
                    valor,
                    pedido.getTrackingCode(),
                    String.format("%s — %s [%s]", prefixoDescricao, pedido.getTipoServico(), pedido.getTrackingCode())
            );
            pedido.setPagamentoStatus(pedido.getCliente().isInadimplente() ? "FATURA_EM_ABERTO" : "PAGO_CARTEIRA");
        } else if ("FATURA_AGUARDANDO_APROVACAO".equalsIgnoreCase(pStatus)
                || "FATURA_APEXPAY".equalsIgnoreCase(pedido.getFormaPagamento())) {
            pedido.setPagamentoStatus("FATURA_EM_ABERTO");
        }
    }

    private void liberarSlotSePresente(Pedido pedido) {
        if (pedido.getTrackSlot() != null) {
            pedido.getTrackSlot().liberarVaga();
            if (trackSlotRepository != null) {
                trackSlotRepository.update(pedido.getTrackSlot());
            }
        }
    }

    private void estornarSeNecessario(Pedido pedido, String motivo) {
        String pStatus = pedido.getPagamentoStatus();
        if ("FATURA_AGUARDANDO_APROVACAO".equalsIgnoreCase(pStatus) || "PENDENTE".equalsIgnoreCase(pStatus)) {
            pedido.setPagamentoStatus("CANCELADO");
            return;
        }
        if (apexPayFacade != null && pedido.getCliente() != null) {
            if ("PAGO_CARTEIRA".equalsIgnoreCase(pStatus)
                    || "DEBITO_ABERTO".equalsIgnoreCase(pStatus)
                    || "FATURA_EM_ABERTO".equalsIgnoreCase(pStatus)) {
                BigDecimal valor = pedido.getValorFinal() != null ? pedido.getValorFinal() : pedido.getValorTotal();
                if (valor != null && valor.compareTo(BigDecimal.ZERO) > 0) {
                    apexPayFacade.estornarReserva(pedido.getCliente(), valor, pedido.getTrackingCode(), motivo);
                    pedido.setPagamentoStatus("ESTORNADO");
                }
            }
        }
    }
}
