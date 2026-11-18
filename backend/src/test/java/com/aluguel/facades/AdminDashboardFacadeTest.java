package com.aluguel.facades;

import com.aluguel.models.*;
import com.aluguel.queue.ReservaQueueEngine;
import com.aluguel.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Testes do Painel Executivo Admin - Lucro, Devedores e Sinistro")
class AdminDashboardFacadeTest {

    @Mock
    private PedidoRepository pedidoRepository;
    @Mock
    private TrackSlotRepository trackSlotRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private TransacaoApexPayRepository transacaoRepository;
    @Mock
    private ReservaQueueEngine queueEngine;
    @Mock
    private ApexPayFacade apexPayFacade;

    private AdminDashboardFacade facade;

    @BeforeEach
    void setUp() {
        facade = new AdminDashboardFacade(
                pedidoRepository,
                trackSlotRepository,
                usuarioRepository,
                transacaoRepository,
                queueEngine,
                apexPayFacade
        );
    }

    @Test
    @DisplayName("Deve calcular lucro líquido estimado e ordenar clientes inadimplentes primeiro")
    void deveCalcularLucroEOrdenarDevedoresPrimeiro() {
        Cliente regular = new Cliente();
        regular.setId(1L);
        regular.setNome("Piloto Regular");
        regular.setEmail("regular@apex.com");
        regular.setRole("ROLE_CLIENTE");
        regular.setSaldoCarteira(new BigDecimal("15000.00"));
        regular.setStatusFinanceiro("REGULAR");

        Cliente devedor = new Cliente();
        devedor.setId(2L);
        devedor.setNome("Piloto Devedor");
        devedor.setEmail("devedor@apex.com");
        devedor.setRole("ROLE_CLIENTE");
        devedor.setSaldoCarteira(new BigDecimal("-4500.00"));
        devedor.setStatusFinanceiro("INADIMPLENTE");

        Circuito interlagos = new Circuito(
                "interlagos", "Interlagos", "Brasil", "SP",
                new BigDecimal("4.309"), 15, "1:10.540", 12
        );
        TrackSlot slot = new TrackSlot(interlagos, LocalDate.now().plusDays(1), "MANHA", 12);
        slot.ocuparVaga();

        Pedido aprovado = new Pedido();
        aprovado.setId(10L);
        aprovado.setTrackingCode("APX-10");
        aprovado.setCliente(regular);
        aprovado.setTrackSlot(slot);
        aprovado.setStatus("APROVADO");
        aprovado.setTipoServico("TRACK_EXPERIENCE");
        aprovado.setValorTotal(new BigDecimal("10000.00"));
        aprovado.setValorFinal(new BigDecimal("10000.00"));
        aprovado.setValorSinistro(new BigDecimal("1000.00"));
        aprovado.setDataInicio(LocalDateTime.now().plusDays(1));
        aprovado.setDataPedido(LocalDateTime.now());

        TransacaoApexPay juros = new TransacaoApexPay(
                devedor, "JUROS_ATRASO", new BigDecimal("45.00"), "Juros 0.1%", null
        );

        when(pedidoRepository.findAll()).thenReturn(List.of(aprovado));
        when(transacaoRepository.findAll()).thenReturn(List.of(juros));
        when(trackSlotRepository.findAll()).thenReturn(List.of(slot));
        when(usuarioRepository.findAll()).thenReturn(List.of(regular, devedor));
        when(queueEngine.getMetricas()).thenReturn(Map.of("pendentes", 0));

        Map<String, Object> kpis = facade.getMetricasDashboard();

        assertEquals(new BigDecimal("10000.00"), kpis.get("faturamentoConfirmadoBRL"));
        // Margem operacional 68% de 10000 = 6800.00 + juros 45.00 + sinistro 1000.00 = 7845.00
        assertEquals(new BigDecimal("7845.00"), kpis.get("lucroLiquidoEstimadoBRL"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> clientes = (List<Map<String, Object>>) kpis.get("clientes");
        assertEquals(2, clientes.size());
        assertTrue((Boolean) clientes.get(0).get("inadimplente"));
        assertEquals("Piloto Devedor", clientes.get(0).get("nome"));
        assertFalse((Boolean) clientes.get(1).get("inadimplente"));
    }

    @Test
    @DisplayName("Deve registrar sinistro em pedido APROVADO e lançar cobrança no ApexPay do piloto")
    void deveRegistrarSinistroELancarCobrancaApexPay() {
        Cliente cliente = new Cliente();
        cliente.setEmail("piloto@apex.com");

        Pedido pedido = new Pedido();
        pedido.setId(55L);
        pedido.setTrackingCode("APX-55");
        pedido.setCliente(cliente);
        pedido.setStatus("APROVADO");
        pedido.setTipoServico("TRACK_EXPERIENCE");
        pedido.setValorSinistro(new BigDecimal("500.00"));

        TransacaoApexPay txSinistro = new TransacaoApexPay(
                cliente, "DEBITO_SINISTRO", new BigDecimal("2500.00"), "Avaria asa dianteira", "APX-55"
        );

        when(pedidoRepository.findById(55L)).thenReturn(Optional.of(pedido));
        when(apexPayFacade.lancarCobrancaSinistro(eq("piloto@apex.com"), eq(new BigDecimal("2500.00")), eq("APX-55"), anyString()))
                .thenReturn(txSinistro);
        when(apexPayFacade.getResumoCarteira("piloto@apex.com")).thenReturn(Map.of("inadimplente", true));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> res = facade.registrarSinistro(55L, new BigDecimal("2500.00"), "Avaria asa dianteira");

        assertNotNull(res.get("transacao"));
        assertEquals(new BigDecimal("3000.00"), pedido.getValorSinistro());
        assertEquals("Avaria asa dianteira", pedido.getMotivoSinistro());
        verify(apexPayFacade, times(1))
                .lancarCobrancaSinistro("piloto@apex.com", new BigDecimal("2500.00"), "APX-55", "Avaria asa dianteira");
        verify(pedidoRepository, times(1)).update(pedido);
    }

    @Test
    @DisplayName("Deve bloquear registro de sinistro para pedidos ainda não aprovados")
    void deveBloquearSinistroEmPedidoNaoAprovado() {
        Pedido pendente = new Pedido();
        pendente.setId(56L);
        pendente.setCliente(new Cliente());
        pendente.setStatus("AGUARDANDO_APROVACAO");
        pendente.setTipoServico("TRACK_EXPERIENCE");

        when(pedidoRepository.findById(56L)).thenReturn(Optional.of(pendente));

        assertThrows(IllegalStateException.class, () ->
                facade.registrarSinistro(56L, new BigDecimal("1000.00"), "Tentativa em pendente")
        );
        verify(apexPayFacade, never()).lancarCobrancaSinistro(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Deve bloquear registro de sinistro em sessão VISITA_BOX")
    void deveBloquearSinistroEmVisitaBox() {
        Pedido visita = new Pedido();
        visita.setId(57L);
        visita.setCliente(new Cliente());
        visita.setStatus("APROVADO");
        visita.setTipoServico("VISITA_BOX");

        when(pedidoRepository.findById(57L)).thenReturn(Optional.of(visita));

        assertThrows(IllegalArgumentException.class, () ->
                facade.registrarSinistro(57L, new BigDecimal("1000.00"), "Tentativa em visita ao box")
        );
        verify(apexPayFacade, never()).lancarCobrancaSinistro(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Deve listar pilotos com filtro de busca e status")
    void deveListarPilotosComFiltro() {
        Usuario u1 = new Usuario();
        u1.setId(10L);
        u1.setNome("Ayrton Senna");
        u1.setEmail("senna@apex.com");
        u1.setRole("ROLE_CLIENTE");
        u1.setStatusFinanceiro("REGULAR");
        u1.setStatusConta("ATIVO");

        Usuario u2 = new Usuario();
        u2.setId(20L);
        u2.setNome("Alain Prost");
        u2.setEmail("prost@apex.com");
        u2.setRole("ROLE_CLIENTE");
        u2.setStatusFinanceiro("INADIMPLENTE");
        u2.setStatusConta("BLOQUEADO_RESERVAS");

        when(usuarioRepository.findAll()).thenReturn(List.of(u1, u2));

        List<Map<String, Object>> resBusca = facade.listarUsuariosAdmin("Senna", "TODOS");
        assertEquals(1, resBusca.size());
        assertEquals("Ayrton Senna", resBusca.get(0).get("nome"));

        List<Map<String, Object>> resDevedor = facade.listarUsuariosAdmin("", "DEVEDORES");
        assertEquals(1, resDevedor.size());
        assertEquals("Alain Prost", resDevedor.get(0).get("nome"));
    }

    @Test
    @DisplayName("Deve atualizar dados do piloto com validação oficial de CNH")
    void deveAtualizarPilotoComSucesso() {
        Usuario u = new Usuario();
        u.setId(30L);
        u.setNome("Lewis Hamilton");
        u.setEmail("hamilton@apex.com");
        u.setRole("ROLE_CLIENTE");
        u.setStatusFinanceiro("REGULAR");
        u.setStatusConta("ATIVO");

        when(usuarioRepository.findById(30L)).thenReturn(Optional.of(u));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(u);
        when(pedidoRepository.findAll()).thenReturn(List.of());
        when(apexPayFacade.getResumoCarteira("hamilton@apex.com")).thenReturn(Map.of("saldo", BigDecimal.ZERO));

        Map<String, Object> atualizado = facade.atualizarUsuarioAdmin(30L, Map.of(
                "nome", "Sir Lewis Hamilton",
                "telefone", "11999998888",
                "cnhNumero", com.aluguel.utils.CnhValidator.CNH_TESTE_OFICIAL,
                "statusConta", "ATIVO"
        ));

        assertEquals("Sir Lewis Hamilton", atualizado.get("nome"));
        assertEquals("11999998888", atualizado.get("telefone"));
        assertEquals(com.aluguel.utils.CnhValidator.CNH_TESTE_OFICIAL, atualizado.get("cnhNumero"));
    }

    @Test
    @DisplayName("Deve bloquear alteração de senha ou rebaixamento da conta Administrador")
    void deveBloquearAlteracaoSenhaDoAdmin() {
        Usuario admin = new Usuario();
        admin.setId(99L);
        admin.setNome("Apex Race Control");
        admin.setEmail("admin@apex.com");
        admin.setRole("ROLE_ADMIN");

        when(usuarioRepository.findById(99L)).thenReturn(Optional.of(admin));

        IllegalStateException exSenha = assertThrows(IllegalStateException.class, () ->
                facade.atualizarUsuarioAdmin(99L, Map.of("password", "hack123"))
        );
        assertTrue(exSenha.getMessage().contains("senha da conta de Administrador é protegida"));

        IllegalStateException exRole = assertThrows(IllegalStateException.class, () ->
                facade.atualizarUsuarioAdmin(99L, Map.of("role", "CLIENTE"))
        );
        assertTrue(exRole.getMessage().contains("Não é permitido rebaixar os privilégios"));
    }

    @Test
    @DisplayName("Deve permitir cadastrar novo piloto via CRUD administrativo")
    void deveCriarNovoPilotoAdminComSucesso() {
        when(usuarioRepository.findByEmail("novo@apex.com")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            u.setId(105L);
            return u;
        });

        Map<String, Object> criado = facade.criarUsuarioAdmin(Map.of(
                "nome", "Charles Leclerc",
                "email", "novo@apex.com",
                "password", "leclerc16",
                "telefone", "11988887777",
                "cnhNumero", com.aluguel.utils.CnhValidator.CNH_TESTE_OFICIAL,
                "cnhCategoria", "B",
                "dataNascimento", "1997-10-16"
        ));

        assertNotNull(criado);
        assertEquals("Charles Leclerc", criado.get("nome"));
        assertEquals("novo@apex.com", criado.get("email"));
        assertEquals(com.aluguel.utils.CnhValidator.CNH_TESTE_OFICIAL, criado.get("cnhNumero"));
    }

    @Test
    @DisplayName("Deve impedir exclusão da conta Administrador e permitir exclusão de piloto comum")
    void deveImpedirExclusaoDoAdminEPermitirDePilotoComum() {
        Usuario admin = new Usuario();
        admin.setId(1L);
        admin.setEmail("admin@apex.com");
        admin.setRole("ROLE_ADMIN");

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                facade.excluirUsuarioAdmin(1L)
        );
        assertTrue(ex.getMessage().contains("Não é permitido excluir o usuário Administrador principal"));

        Usuario piloto = new Usuario();
        piloto.setId(50L);
        piloto.setNome("Piloto Desistente");
        piloto.setEmail("desistente@apex.com");
        piloto.setRole("ROLE_CLIENTE");

        when(usuarioRepository.findById(50L)).thenReturn(Optional.of(piloto));
        when(pedidoRepository.findAll()).thenReturn(List.of());

        Map<String, Object> resp = facade.excluirUsuarioAdmin(50L);
        assertTrue((Boolean) resp.get("success"));
        assertTrue((Boolean) resp.get("deleted"));
        verify(usuarioRepository, times(1)).delete(piloto);
    }

    @Test
    @DisplayName("Deve cancelar sessões pendentes, liberar vaga no slot e estornar pagamento ao suspender piloto")
    void deveCancelarSessoesPendentesLiberarSlotEEstornarAoSuspender() {
        Cliente piloto = new Cliente();
        piloto.setId(44L);
        piloto.setNome("Piloto Suspenso");
        piloto.setEmail("suspenso@apex.com");
        piloto.setRole("ROLE_CLIENTE");
        piloto.setStatusFinanceiro("REGULAR");
        piloto.setStatusConta("ATIVO");

        Circuito circuito = new Circuito(
                "interlagos", "Interlagos", "Brasil", "SP",
                new BigDecimal("4.309"), 15, "1:10.540", 12
        );
        TrackSlot slot = new TrackSlot(circuito, LocalDate.now().plusDays(4), "TARDE", 12);
        slot.ocuparVaga();

        Pedido pedido = new Pedido();
        pedido.setId(77L);
        pedido.setTrackingCode("APX-777");
        pedido.setCliente(piloto);
        pedido.setTrackSlot(slot);
        pedido.setStatus("AGUARDANDO_APROVACAO");
        pedido.setPagamentoStatus("PAGO_CARTEIRA");
        pedido.setValorTotal(new BigDecimal("2500.00"));
        pedido.setValorFinal(new BigDecimal("2500.00"));

        when(usuarioRepository.findById(44L)).thenReturn(Optional.of(piloto));
        when(pedidoRepository.findAll()).thenReturn(List.of(pedido));
        when(trackSlotRepository.update(any(TrackSlot.class))).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(inv -> inv.getArgument(0));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(piloto);
        when(apexPayFacade.getResumoCarteira("suspenso@apex.com")).thenReturn(Map.of("saldo", new BigDecimal("2500.00")));

        Map<String, Object> atualizado = facade.atualizarUsuarioAdmin(44L, Map.of("statusConta", "SUSPENSO"));

        assertEquals("SUSPENSO", atualizado.get("statusConta"));
        assertEquals("CANCELADO", pedido.getStatus());
        assertEquals("ESTORNADO", pedido.getPagamentoStatus());
        assertEquals(0, slot.getVagasOcupadas());
        verify(trackSlotRepository).update(slot);
        verify(apexPayFacade).estornarReserva(eq(piloto), eq(new BigDecimal("2500.00")), eq("APX-777"), contains("suspensão"));
        verify(pedidoRepository).update(pedido);
    }
}
