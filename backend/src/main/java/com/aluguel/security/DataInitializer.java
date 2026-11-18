package com.aluguel.security;

import com.aluguel.models.*;
import com.aluguel.repositories.*;
import com.aluguel.services.QrCodePassService;
import com.aluguel.utils.CnhValidator;
import io.micronaut.context.event.StartupEvent;
import io.micronaut.runtime.event.annotation.EventListener;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Singleton
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UsuarioRepository usuarioRepository;
    private final AgenteRepository agenteRepository;
    private final ClienteRepository clienteRepository;
    private final AutomovelRepository automovelRepository;
    private final CircuitoRepository circuitoRepository;
    private final TrackSlotRepository trackSlotRepository;
    private final PedidoRepository pedidoRepository;
    private final TransacaoApexPayRepository transacaoRepository;
    private final QrCodePassService qrCodePassService;

    public DataInitializer(UsuarioRepository usuarioRepository,
                           AgenteRepository agenteRepository,
                           ClienteRepository clienteRepository,
                           AutomovelRepository automovelRepository,
                           CircuitoRepository circuitoRepository,
                           TrackSlotRepository trackSlotRepository,
                           PedidoRepository pedidoRepository,
                           TransacaoApexPayRepository transacaoRepository,
                           QrCodePassService qrCodePassService) {
        this.usuarioRepository = usuarioRepository;
        this.agenteRepository = agenteRepository;
        this.clienteRepository = clienteRepository;
        this.automovelRepository = automovelRepository;
        this.circuitoRepository = circuitoRepository;
        this.trackSlotRepository = trackSlotRepository;
        this.pedidoRepository = pedidoRepository;
        this.transacaoRepository = transacaoRepository;
        this.qrCodePassService = qrCodePassService;
    }

    @EventListener
    @Transactional
    public void onStartup(StartupEvent event) {
        // 1. Inicializa os 8 circuitos internacionais de alta velocidade se ainda não existirem
        Map<String, Circuito> circuitosMap = new HashMap<>();
        if (circuitoRepository.count() == 0) {
            circuitosMap.put("nurburgring", circuitoRepository.save(new Circuito(
                    "nurburgring", "Nürburgring Nordschleife", "Alemanha", "Europa",
                    new BigDecimal("20.832"), 73, "6:35.183", 45
            )));
            circuitosMap.put("spa", circuitoRepository.save(new Circuito(
                    "spa", "Circuit de Spa-Francorchamps", "Bélgica", "Europa",
                    new BigDecimal("7.004"), 19, "1:41.252", 40
            )));
            circuitosMap.put("monza", circuitoRepository.save(new Circuito(
                    "monza", "Autodromo Nazionale Monza", "Itália", "Europa",
                    new BigDecimal("5.793"), 11, "1:18.887", 35
            )));
            circuitosMap.put("monaco", circuitoRepository.save(new Circuito(
                    "monaco", "Circuit de Monaco", "Mônaco", "Europa",
                    new BigDecimal("3.337"), 19, "1:10.166", 25
            )));
            circuitosMap.put("le_mans", circuitoRepository.save(new Circuito(
                    "le_mans", "Circuit de la Sarthe (Le Mans)", "França", "Europa",
                    new BigDecimal("13.626"), 38, "3:14.791", 62
            )));
            circuitosMap.put("silverstone", circuitoRepository.save(new Circuito(
                    "silverstone", "Silverstone Circuit", "Reino Unido", "Europa",
                    new BigDecimal("5.891"), 18, "1:24.303", 40
            )));
            circuitosMap.put("interlagos", circuitoRepository.save(new Circuito(
                    "interlagos", "Autódromo de Interlagos", "Brasil", "América do Sul",
                    new BigDecimal("4.309"), 15, "1:07.281", 30
            )));
            circuitosMap.put("suzuka", circuitoRepository.save(new Circuito(
                    "suzuka", "Suzuka International Racing Course", "Japão", "Ásia",
                    new BigDecimal("5.807"), 18, "1:27.064", 35
            )));
        } else {
            circuitoRepository.findAll().forEach(c -> circuitosMap.put(c.getId(), c));
        }

        // Limpa slots futuros sem reservas que não pertencem ao calendário realista do circuito
        LocalDate hoje = LocalDate.now();
        trackSlotRepository.findAll().forEach(slot -> {
            if (slot.getVagasOcupadas() != null && slot.getVagasOcupadas() == 0
                    && slot.getData() != null && !slot.getData().isBefore(hoje)
                    && slot.getCircuito() != null) {
                List<String> turnosEsperados = turnosEsperadosParaDia(slot.getCircuito().getId(), slot.getData());
                String turnoSlot = slot.getTurno() != null ? slot.getTurno().toUpperCase() : "";
                if (!turnosEsperados.contains(turnoSlot)) {
                    trackSlotRepository.delete(slot);
                }
            }
        });

        // Garante slots agendáveis para os próximos 45 dias respeitando o calendário realista de cada autódromo
        for (Circuito c : circuitosMap.values()) {
            for (int d = 1; d <= 45; d++) {
                LocalDate dataSlot = hoje.plusDays(d);
                List<String> turnosDia = turnosEsperadosParaDia(c.getId(), dataSlot);
                if (turnosDia.isEmpty()) {
                    continue;
                }
                for (String turno : turnosDia) {
                    int vagasTotais = calcularCapacidadeTurno(c.getId(), dataSlot, turno);
                    int vagasOcupadas = calcularOcupacaoInicial(c.getId(), d, turno, vagasTotais);
                    BigDecimal taxaTurno = switch (turno) {
                        case "TARDE" -> new BigDecimal("90.00");
                        case "NOTURNO" -> new BigDecimal("180.00");
                        default -> BigDecimal.ZERO;
                    };
                    criarSlotSeAusente(c, dataSlot, turno, vagasTotais, vagasOcupadas, taxaTurno);
                }
            }
        }

        // 2. Garante exclusivamente a conta administrativa Apex Race Control e expurga contas legadas
        Usuario owner = ensureAgenteConta(
                "admin@apex.com",
                "Apex Race Control (Admin)",
                "ROLE_ADMIN",
                "Apex HQ - Race Control Center",
                "99887766000122"
        );
        limparDadosLegados(owner);
        ensureClienteTeste();

        // 3. Cadastra os 8 Supercarros únicos, alocando cada um em 3 pistas (= 3 carros distintos por pista)
        if (automovelRepository.count() == 0 && owner != null) {
            registrarAutomovel("Porsche", "911 GT3 RS (992)", 2024, "POR-GT3RS-2024", "GT39E92",
                    "1650.00", "/cars/porsche-studio.webp", 525, "3.2s", "296 km/h", "GT3",
                    List.of("nurburgring", "le_mans", "monaco"), circuitosMap, owner);

            registrarAutomovel("BMW", "M4 Competition Track", 2024, "BMW-M4C-2024", "M4C8E20",
                    "990.00", "/cars/bmw-studio.webp", 510, "3.5s", "290 km/h", "GT4",
                    List.of("spa", "nurburgring", "silverstone"), circuitosMap, owner);

            registrarAutomovel("Mercedes-AMG", "GT Track Series", 2024, "AMG-GTR-2024", "AMG9E00",
                    "1790.00", "/cars/amg-studio.webp", 734, "2.8s", "315 km/h", "GT2",
                    List.of("monza", "nurburgring", "spa"), circuitosMap, owner);

            registrarAutomovel("Audi", "R8 V10 Performance", 2024, "AUD-R8V10-2024", "R8V1E00",
                    "1390.00", "/cars/audi-studio.webp", 620, "3.1s", "331 km/h", "GT3",
                    List.of("interlagos", "spa", "suzuka"), circuitosMap, owner);

            registrarAutomovel("Porsche", "718 Cayman GT4 RS", 2024, "POR-GT4RS-2024", "GT48E71",
                    "1150.00", "/cars/cayman-studio.webp", 500, "3.4s", "315 km/h", "GT4",
                    List.of("monaco", "silverstone", "interlagos"), circuitosMap, owner);

            registrarAutomovel("BMW", "M8 Competition Coupé", 2024, "BMW-M8C-2024", "M8C9E92",
                    "1290.00", "/cars/m8-studio.webp", 625, "3.2s", "305 km/h", "GT3",
                    List.of("le_mans", "monza", "interlagos"), circuitosMap, owner);

            registrarAutomovel("Mercedes-AMG", "GT Black Series", 2024, "AMG-GTBS-2024", "AMGBS24",
                    "1990.00", "/cars/amg-bs-studio.webp", 730, "3.2s", "325 km/h", "GT2",
                    List.of("silverstone", "le_mans", "suzuka"), circuitosMap, owner);

            registrarAutomovel("Audi", "RS e-tron GT Performance", 2025, "AUD-ETRON-2025", "ETR9E25",
                    "1490.00", "/cars/etrongt-studio.webp", 925, "2.5s", "250 km/h", "ELECTRIC",
                    List.of("suzuka", "monza", "monaco"), circuitosMap, owner);

            log.info("Frota unificada Apex inicializada: 8 supercarros com 3 autódromos cada (3 opções por pista).");
        } else {
            // Garante sincronização dos 3 circuitos e atualização de preços seed legados
            sincronizarCircuitosExistentes(circuitosMap);
            sincronizarPrecosReais();
        }

        // 4. Task automática: garante que toda sessão agendada possua QR Code criptográfico FIA Pass
        qrCodePassService.executarTaskGeracaoQrCodes();
    }

    private Usuario ensureAgenteConta(String email, String nome, String role, String endereco, String cnpj) {
        return usuarioRepository.findByEmail(email).map(u -> {
            if (u.getTelefone() == null || u.getTelefone().isBlank()) {
                u.setTelefone("11999999999");
                return usuarioRepository.update(u);
            }
            return u;
        }).orElseGet(() -> {
            String adminPass = System.getenv("ADMIN_DEMO_PASSWORD");
            if (adminPass == null || adminPass.isBlank()) {
                adminPass = "123456";
            }
            Agente agente = new Agente();
            agente.setNome(nome);
            agente.setEmail(email);
            agente.setSenha(BCrypt.hashpw(adminPass.trim(), BCrypt.gensalt()));
            agente.setRole(role);
            agente.setEndereco(endereco);
            agente.setCnpj(cnpj);
            agente.setTelefone("11999999999");
            Usuario salvo = agenteRepository.save(agente);
            log.info("Conta operacional inicializada: {} ({}).", email, role);
            return salvo;
        });
    }

    private void ensureClienteTeste() {
        String emailTeste = "teste@gmail.com";
        String cpfTeste = "111.222.333-99";
        if (usuarioRepository.findByEmail(emailTeste).isPresent() || clienteRepository.findByCpf(cpfTeste).isPresent()) {
            return;
        }

        String testPass = System.getenv("TEST_PILOT_PASSWORD");
        if (testPass == null || testPass.isBlank()) {
            testPass = "122456";
        }
        Cliente piloto = new Cliente();
        piloto.setNome("Piloto Teste");
        piloto.setEmail(emailTeste);
        piloto.setSenha(BCrypt.hashpw(testPass.trim(), BCrypt.gensalt()));
        piloto.setRole("ROLE_CLIENTE");
        piloto.setCpf(cpfTeste);
        piloto.setRg("MG-12.345.678");
        piloto.setProfissao("Piloto de Testes");
        piloto.setEndereco("Av. Interlagos, 1000 - São Paulo, SP");
        piloto.setTelefone("11988887777");
        piloto.setCnhNumero(CnhValidator.CNH_TESTE_OFICIAL);
        piloto.setCnhCategoria("B");
        piloto.setDataNascimento(LocalDate.of(1995, 5, 15));
        piloto.setStatusConta("ATIVO");
        piloto.creditarSaldo(new BigDecimal("5000.00"));

        Cliente salvo = clienteRepository.save(piloto);
        transacaoRepository.save(new TransacaoApexPay(
                salvo,
                "DEPOSITO",
                new BigDecimal("5000.00"),
                "Crédito inicial conta de testes ApexPay",
                null
        ));
        log.info("Conta de teste inicializada: {} (ROLE_CLIENTE).", emailTeste);
    }

    private List<String> turnosEsperadosParaDia(String circuitoId, LocalDate data) {
        DayOfWeek dow = data.getDayOfWeek();
        if (dow == DayOfWeek.MONDAY) {
            return List.of();
        }
        int dom = data.getDayOfMonth();
        int weekOfYear = data.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int month = data.getMonthValue();
        boolean isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY);

        return switch (circuitoId) {
            case "nurburgring" -> {
                // Touristenfahrten: fim de semana o dia todo; terça e quinta no fim da tarde
                if (isWeekend) yield List.of("MANHA", "TARDE");
                if (dow == DayOfWeek.TUESDAY || dow == DayOfWeek.THURSDAY) yield List.of("TARDE");
                yield List.of();
            }
            case "spa" -> {
                // Open Pitlane: fins de semana + sextas selecionadas + quartas alternadas (sem noturno)
                if (isWeekend && (weekOfYear % 4 != 2)) yield List.of("MANHA", "TARDE");
                if (dow == DayOfWeek.FRIDAY && dom % 2 == 0) yield List.of("MANHA", "TARDE");
                if (dow == DayOfWeek.WEDNESDAY && dom % 2 == 0) yield List.of("MANHA", "TARDE");
                yield List.of();
            }
            case "monza" -> {
                // Monza Track Days: bloqueio na janela do GP da Itália (fim ago / início set); Sáb/Dom + Sex alternada
                boolean gpWindow = (month == 8 && dom >= 28) || (month == 9 && dom <= 7);
                if (gpWindow) yield List.of();
                if (isWeekend || (dow == DayOfWeek.FRIDAY && dom % 2 == 1)) yield List.of("MANHA", "TARDE");
                yield List.of();
            }
            case "le_mans" -> {
                // Circuito Bugatti: ~2 fins de semana por mês + noturno especial de endurance no sábado
                boolean bugattiWindow = (dom >= 1 && dom <= 7) || (dom >= 15 && dom <= 21);
                if (!bugattiWindow) yield List.of();
                if (dow == DayOfWeek.SATURDAY) yield List.of("MANHA", "TARDE", "NOTURNO");
                if (dow == DayOfWeek.SUNDAY) yield List.of("MANHA", "TARDE");
                yield List.of();
            }
            case "monaco" -> {
                // Circuito de rua: datas exclusivas quinzenais (Sáb/Dom) com grid reduzido
                if (isWeekend && weekOfYear % 2 == 0) yield List.of("MANHA", "TARDE");
                yield List.of();
            }
            case "silverstone" -> {
                // Calendário intenso Open Pitlane (102 dB): Sex/Sáb/Dom + Quartas alternadas
                if (dow == DayOfWeek.FRIDAY || isWeekend || (dow == DayOfWeek.WEDNESDAY && dom % 2 == 0)) {
                    yield List.of("MANHA", "TARDE");
                }
                yield List.of();
            }
            case "interlagos" -> {
                // Track days de promotores: Sáb/Dom (3 de 4 semanas) + Sextas alternadas (08h-18h, sem noturno)
                if ((isWeekend && weekOfYear % 4 != 1) || (dow == DayOfWeek.FRIDAY && dom % 2 == 0)) {
                    yield List.of("MANHA", "TARDE");
                }
                yield List.of();
            }
            case "suzuka" -> {
                // Suzuka SMSC Sports Driving: fins de semana alternados + terças alternadas
                if ((isWeekend && weekOfYear % 2 == 1) || (dow == DayOfWeek.TUESDAY && dom % 2 == 1)) {
                    yield List.of("MANHA", "TARDE");
                }
                yield List.of();
            }
            default -> isWeekend ? List.of("MANHA", "TARDE") : List.of();
        };
    }

    private int calcularCapacidadeTurno(String circuitoId, LocalDate data, String turno) {
        if ("monaco".equals(circuitoId)) return 6;
        if ("nurburgring".equals(circuitoId) && data.getDayOfWeek().getValue() <= 5) return 8;
        if ("NOTURNO".equals(turno)) return 10;
        return "TARDE".equals(turno) ? 14 : 12;
    }

    private int calcularOcupacaoInicial(String circuitoId, int dayOffset, String turno, int capacidade) {
        if ("monaco".equals(circuitoId)) return Math.min(capacidade - 2, 2 + (dayOffset % 2));
        int base = "TARDE".equals(turno) ? (dayOffset % 2 == 0 ? 4 : 2) : (dayOffset % 3 == 0 ? 3 : 1);
        return Math.min(Math.max(capacidade - 2, 0), base);
    }

    private void criarSlotSeAusente(Circuito c, LocalDate data, String turno, int total, int ocupadas, BigDecimal taxa) {
        if (trackSlotRepository.findByCircuitoIdAndDataAndTurno(c.getId(), data, turno).isEmpty()) {
            TrackSlot slot = new TrackSlot(c, data, turno, total);
            slot.setVagasOcupadas(ocupadas);
            slot.setTaxaAdicionalTurno(taxa);
            trackSlotRepository.save(slot);
        }
    }

    private void registrarAutomovel(String marca, String modelo, int ano, String matricula, String placa,
                                    String precoPorDia, String imageUrl, int potenciaCv, String aceleracao0a100,
                                    String velocidadeMaxima, String categoria, List<String> circuitoIds,
                                    Map<String, Circuito> circuitosMap, Usuario proprietario) {
        Automovel carro = new Automovel();
        carro.setMarca(marca);
        carro.setModelo(modelo);
        carro.setAno(ano);
        carro.setMatricula(matricula);
        carro.setPlaca(placa);
        carro.setPrecoPorDia(new BigDecimal(precoPorDia));
        carro.setImageUrl(imageUrl);
        carro.setPotenciaCv(potenciaCv);
        carro.setAceleracao0a100(aceleracao0a100);
        carro.setVelocidadeMaxima(velocidadeMaxima);
        carro.setCategoria(categoria);
        for (String cid : circuitoIds) {
            carro.adicionarCircuito(circuitosMap.get(cid));
        }
        carro.setAtivoBox(true);
        carro.setProprietario(proprietario);
        automovelRepository.save(carro);
    }

    private void sincronizarCircuitosExistentes(Map<String, Circuito> circuitosMap) {
        Map<String, List<String>> alocacaoPorMatricula = Map.of(
                "POR-GT3RS-2024", List.of("nurburgring", "le_mans", "monaco"),
                "BMW-M4C-2024", List.of("spa", "nurburgring", "silverstone"),
                "AMG-GTR-2024", List.of("monza", "nurburgring", "spa"),
                "AUD-R8V10-2024", List.of("interlagos", "spa", "suzuka"),
                "POR-GT4RS-2024", List.of("monaco", "silverstone", "interlagos"),
                "BMW-M8C-2024", List.of("le_mans", "monza", "interlagos"),
                "AMG-GTBS-2024", List.of("silverstone", "le_mans", "suzuka"),
                "AUD-ETRON-2025", List.of("suzuka", "monza", "monaco")
        );
        automovelRepository.findAll().forEach(carro -> {
            List<String> ids = alocacaoPorMatricula.get(carro.getMatricula());
            if (ids != null && (carro.getCircuitosDisponiveis() == null || carro.getCircuitosDisponiveis().size() < 3)) {
                ids.forEach(cid -> carro.adicionarCircuito(circuitosMap.get(cid)));
                automovelRepository.update(carro);
            }
        });
    }

    private void sincronizarPrecosReais() {
        Map<String, BigDecimal> precosAntigosParaNovos = Map.of(
                "POR-GT3RS-2024", new BigDecimal("1650.00"),
                "BMW-M4C-2024", new BigDecimal("990.00"),
                "AMG-GTR-2024", new BigDecimal("1790.00"),
                "AUD-R8V10-2024", new BigDecimal("1390.00"),
                "POR-GT4RS-2024", new BigDecimal("1150.00"),
                "BMW-M8C-2024", new BigDecimal("1290.00"),
                "AMG-GTBS-2024", new BigDecimal("1990.00"),
                "AUD-ETRON-2025", new BigDecimal("1490.00")
        );
        Map<String, BigDecimal> precosLegados = Map.of(
                "POR-GT3RS-2024", new BigDecimal("3850.00"),
                "BMW-M4C-2024", new BigDecimal("2750.00"),
                "AMG-GTR-2024", new BigDecimal("3950.00"),
                "AUD-R8V10-2024", new BigDecimal("3400.00"),
                "POR-GT4RS-2024", new BigDecimal("3100.00"),
                "BMW-M8C-2024", new BigDecimal("3250.00"),
                "AMG-GTBS-2024", new BigDecimal("4450.00"),
                "AUD-ETRON-2025", new BigDecimal("3600.00")
        );

        automovelRepository.findAll().forEach(carro -> {
            BigDecimal legado = precosLegados.get(carro.getMatricula());
            BigDecimal atualizado = precosAntigosParaNovos.get(carro.getMatricula());
            if (legado != null && atualizado != null && carro.getPrecoPorDia() != null
                    && carro.getPrecoPorDia().compareTo(legado) == 0) {
                carro.setPrecoPorDia(atualizado);
                automovelRepository.update(carro);
            }
        });

        trackSlotRepository.findAll().forEach(slot -> {
            if (slot.getTaxaAdicionalTurno() == null) return;
            if (slot.getTaxaAdicionalTurno().compareTo(new BigDecimal("250.00")) == 0) {
                slot.setTaxaAdicionalTurno(new BigDecimal("90.00"));
                trackSlotRepository.update(slot);
            } else if (slot.getTaxaAdicionalTurno().compareTo(new BigDecimal("500.00")) == 0) {
                slot.setTaxaAdicionalTurno(new BigDecimal("180.00"));
                trackSlotRepository.update(slot);
            }
        });
    }

    private void limparDadosLegados(Usuario adminOwner) {
        List<String> emailsLegados = List.of("empresa@rentcars.com", "banco@rentcars.com");
        Agente adminAgente = (adminOwner instanceof Agente) ? (Agente) adminOwner : null;

        // Reatribui proprietário da frota para admin@apex.com
        automovelRepository.findAll().forEach(carro -> {
            if (carro.getProprietario() != null && carro.getProprietario().getEmail() != null
                    && emailsLegados.stream().anyMatch(e -> e.equalsIgnoreCase(carro.getProprietario().getEmail()))) {
                carro.setProprietario(adminOwner);
                automovelRepository.update(carro);
            }
        });

        // Normaliza status de pedidos legados e desvincula avaliadores antigos
        pedidoRepository.findAll().forEach(pedido -> {
            boolean alterado = false;
            String st = pedido.getStatus();
            if ("PENDENTE_EMPRESA".equalsIgnoreCase(st) || "PENDENTE_BANCO".equalsIgnoreCase(st) || "PENDENTE".equalsIgnoreCase(st)) {
                pedido.setStatus("AGUARDANDO_APROVACAO");
                alterado = true;
            }
            if (pedido.getAgenteAvaliador() != null && pedido.getAgenteAvaliador().getEmail() != null
                    && emailsLegados.stream().anyMatch(e -> e.equalsIgnoreCase(pedido.getAgenteAvaliador().getEmail()))) {
                pedido.setAgenteAvaliador(adminAgente);
                alterado = true;
            }
            if (alterado) {
                pedidoRepository.update(pedido);
            }
        });

        // Remove contas legadas (empresa@rentcars.com e banco@rentcars.com)
        for (String legacyEmail : emailsLegados) {
            usuarioRepository.findByEmail(legacyEmail).ifPresent(legacyUser -> {
                transacaoRepository.findByUsuarioIdOrderByDataHoraDesc(legacyUser.getId())
                        .forEach(transacaoRepository::delete);
                usuarioRepository.delete(legacyUser);
                log.info("Conta legada expurgada do banco: {}", legacyEmail);
            });
        }
    }
}
