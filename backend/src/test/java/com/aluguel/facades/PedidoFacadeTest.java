package com.aluguel.facades;

import com.aluguel.models.Agente;
import com.aluguel.models.Automovel;
import com.aluguel.models.Cliente;
import com.aluguel.models.Pedido;
import com.aluguel.repositories.AutomovelRepository;
import com.aluguel.repositories.PedidoRepository;
import com.aluguel.repositories.TrackSlotRepository;
import com.aluguel.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PedidoFacadeTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @Mock
    private AutomovelRepository automovelRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    private PedidoFacade pedidoFacade;

    private LocalDateTime proximoDiaAberto(int minDias) {
        LocalDate d = LocalDate.now().plusDays(minDias);
        if (d.getDayOfWeek() == DayOfWeek.MONDAY) {
            d = d.plusDays(1);
        }
        return d.atTime(10, 0);
    }

    @BeforeEach
    void setUp() {
        pedidoFacade = new PedidoFacade(pedidoRepository, automovelRepository, usuarioRepository);
    }

    @Test
    @DisplayName("Deve criar pedido calculando valor total com sucesso e status AGUARDANDO_APROVACAO")
    void deveCriarPedidoComSucesso() {
        Agente admin = new Agente();
        admin.setEmail("admin@apex.com");

        Automovel automovel = new Automovel();
        automovel.setId(10L);
        automovel.setPrecoPorDia(new BigDecimal("150.00"));
        automovel.setProprietario(admin);

        Cliente cliente = new Cliente();
        cliente.setId(1L);
        cliente.setEmail("cliente@rentcars.com");
        cliente.setCnhNumero("52798802310");
        cliente.setDataNascimento(LocalDate.of(1995, 1, 1));
        cliente.setStatusFinanceiro("REGULAR");

        Pedido pedidoInput = new Pedido();
        pedidoInput.setAutomovel(automovel);
        LocalDateTime inicio = proximoDiaAberto(1);
        pedidoInput.setDataInicio(inicio);
        pedidoInput.setDataFim(inicio.plusDays(3)); // 3 diárias/sessões

        when(automovelRepository.findById(10L)).thenReturn(Optional.of(automovel));
        when(pedidoRepository.countAlugueisConflitantes(eq(10L), any(), any())).thenReturn(0L);
        when(usuarioRepository.findByEmail("cliente@rentcars.com")).thenReturn(Optional.of(cliente));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Pedido criado = pedidoFacade.criarPedido(pedidoInput, "cliente@rentcars.com");

        assertNotNull(criado);
        assertEquals("AGUARDANDO_APROVACAO", criado.getStatus());
        assertEquals(automovel, criado.getAutomovel());
        assertEquals(cliente, criado.getCliente());
        // 3 diárias * 150 = 450.00
        assertEquals(new BigDecimal("450.00"), criado.getValorTotal());
        verify(pedidoRepository, times(1)).save(any(Pedido.class));
    }

    @Test
    @DisplayName("Deve rejeitar criação de pedido se data de fim for anterior à data de início")
    void deveRejeitarDatasInvertidas() {
        Automovel automovel = new Automovel();
        automovel.setId(10L);

        Pedido pedidoInput = new Pedido();
        pedidoInput.setAutomovel(automovel);
        pedidoInput.setDataInicio(LocalDateTime.now().plusDays(5));
        pedidoInput.setDataFim(LocalDateTime.now().plusDays(2)); // Erro: fim antes do início

        when(automovelRepository.findById(10L)).thenReturn(Optional.of(automovel));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            pedidoFacade.criarPedido(pedidoInput, "cliente@rentcars.com")
        );
        assertTrue(ex.getMessage().contains("A data de devolução não pode ser anterior"));
    }

    @Test
    @DisplayName("Deve rejeitar criação de pedido com data de início no passado")
    void deveRejeitarDataNoPassado() {
        Automovel automovel = new Automovel();
        automovel.setId(10L);

        Pedido pedidoInput = new Pedido();
        pedidoInput.setAutomovel(automovel);
        pedidoInput.setDataInicio(LocalDateTime.now().minusDays(2));
        pedidoInput.setDataFim(LocalDateTime.now().plusDays(2));

        when(automovelRepository.findById(10L)).thenReturn(Optional.of(automovel));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            pedidoFacade.criarPedido(pedidoInput, "cliente@rentcars.com")
        );
        assertTrue(ex.getMessage().contains("não pode iniciar no passado"));
    }

    @Test
    @DisplayName("Deve bloquear criação de pedido se houver conflito de overbooking")
    void deveBloquearOverbooking() {
        Automovel automovel = new Automovel();
        automovel.setId(10L);

        Pedido pedidoInput = new Pedido();
        pedidoInput.setAutomovel(automovel);
        LocalDateTime inicio = proximoDiaAberto(2);
        pedidoInput.setDataInicio(inicio);
        pedidoInput.setDataFim(inicio.plusDays(3));

        when(automovelRepository.findById(10L)).thenReturn(Optional.of(automovel));
        when(pedidoRepository.countAlugueisConflitantes(eq(10L), any(), any())).thenReturn(1L); // Conflito existente

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            pedidoFacade.criarPedido(pedidoInput, "cliente@rentcars.com")
        );
        assertTrue(ex.getMessage().contains("já está reservado"));
    }

    @Test
    @DisplayName("Admin (Race Control) deve aprovar pedido pendente em 1 etapa e efetivar fatura pós-paga no aceite")
    void deveAdminAprovarPedidoFaturaEDebitarNoAceite() {
        TrackSlotRepository slotRepo = mock(TrackSlotRepository.class);
        ApexPayFacade apexMock = mock(ApexPayFacade.class);
        PedidoFacade facadeComApex = new PedidoFacade(pedidoRepository, automovelRepository, usuarioRepository, slotRepo, apexMock);

        Agente admin = new Agente();
        admin.setEmail("admin@apex.com");
        admin.setRole("ROLE_ADMIN");

        Cliente piloto = new Cliente();
        piloto.setEmail("piloto@apex.com");
        piloto.setStatusFinanceiro("REGULAR");

        Automovel automovel = new Automovel();
        automovel.setId(10L);
        automovel.setPrecoPorDia(new BigDecimal("1000.00"));
        automovel.setProprietario(admin);

        Pedido pedido = new Pedido();
        pedido.setId(100L);
        pedido.setTrackingCode("APX-100");
        pedido.setCliente(piloto);
        pedido.setAutomovel(automovel);
        pedido.setTipoServico("FAST_LAP");
        pedido.setFormaPagamento("FATURA_APEXPAY");
        LocalDateTime inicio = proximoDiaAberto(2).withHour(10);
        pedido.setDataInicio(inicio);
        pedido.setDataFim(inicio.plusHours(1));

        when(automovelRepository.findById(10L)).thenReturn(Optional.of(automovel));
        when(pedidoRepository.countAlugueisConflitantes(eq(10L), any(), any())).thenReturn(0L);
        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(piloto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocation -> {
            Pedido p = invocation.getArgument(0);
            p.setId(100L);
            return p;
        });

        Pedido criado = facadeComApex.criarPedido(pedido, "piloto@apex.com");

        assertEquals("AGUARDANDO_APROVACAO", criado.getStatus());
        assertEquals("FATURA_AGUARDANDO_APROVACAO", criado.getPagamentoStatus());
        verify(apexMock, never()).debitarValorLiquido(any(), any(), any(), any());

        when(pedidoRepository.findById(100L)).thenReturn(Optional.of(criado));
        when(usuarioRepository.findByEmail("admin@apex.com")).thenReturn(Optional.of(admin));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Pedido aprovado = facadeComApex.avaliarPedido(100L, "admin@apex.com", "APROVADO");

        assertEquals("APROVADO", aprovado.getStatus());
        assertEquals("PAGO_CARTEIRA", aprovado.getPagamentoStatus());
        verify(apexMock, times(1)).debitarValorLiquido(eq(piloto), eq(new BigDecimal("550.00")), eq(criado.getTrackingCode()), anyString());
        verify(pedidoRepository, times(1)).update(criado);
    }

    @Test
    @DisplayName("Rejeição pelo Race Control deve marcar o pedido como REJEITADO")
    void deveRejeitarPedido() {
        Agente admin = new Agente();
        admin.setEmail("admin@apex.com");
        admin.setRole("ROLE_ADMIN");

        Pedido pedido = new Pedido();
        pedido.setId(102L);
        pedido.setStatus("AGUARDANDO_APROVACAO");

        when(pedidoRepository.findById(102L)).thenReturn(Optional.of(pedido));
        when(usuarioRepository.findByEmail("admin@apex.com")).thenReturn(Optional.of(admin));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Pedido atualizado = pedidoFacade.avaliarPedido(102L, "admin@apex.com", "REJEITADO");

        assertEquals("REJEITADO", atualizado.getStatus());
    }

    @Test
    @DisplayName("Admin deve conseguir emitir contraproposta recalculando valor e movendo para REVISAO_CLIENTE")
    void deveEmitirContrapropostaComRecalculo() {
        Agente admin = new Agente();
        admin.setEmail("admin@apex.com");
        admin.setRole("ROLE_ADMIN");

        Automovel automovel = new Automovel();
        automovel.setId(10L);
        automovel.setPrecoPorDia(new BigDecimal("200.00"));
        automovel.setProprietario(admin);

        Pedido pedido = new Pedido();
        pedido.setId(103L);
        pedido.setStatus("AGUARDANDO_APROVACAO");
        pedido.setAutomovel(automovel);

        LocalDateTime novaInicio = proximoDiaAberto(2);
        LocalDateTime novaFim = novaInicio.plusDays(2); // 2 diárias

        Pedido dadosModificados = new Pedido();
        dadosModificados.setDataInicio(novaInicio);
        dadosModificados.setDataFim(novaFim);

        when(pedidoRepository.findById(103L)).thenReturn(Optional.of(pedido));
        when(usuarioRepository.findByEmail("admin@apex.com")).thenReturn(Optional.of(admin));
        when(pedidoRepository.countAlugueisConflitantesExcluindoPedido(eq(10L), eq(103L), any(), any())).thenReturn(0L);
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Pedido atualizado = pedidoFacade.modificarPedidoAgente(103L, "admin@apex.com", dadosModificados);

        assertEquals("REVISAO_CLIENTE", atualizado.getStatus());
        assertEquals(new BigDecimal("400.00"), atualizado.getValorTotal());
        assertEquals(novaInicio, atualizado.getDataInicio());
        assertEquals(novaFim, atualizado.getDataFim());
    }

    @Test
    @DisplayName("Cliente deve conseguir aceitar contraproposta movendo diretamente para APROVADO")
    void deveClienteAceitarContraproposta() {
        Cliente cliente = new Cliente();
        cliente.setEmail("cliente@rentcars.com");

        Pedido pedido = new Pedido();
        pedido.setId(104L);
        pedido.setStatus("REVISAO_CLIENTE");
        pedido.setCliente(cliente);

        when(pedidoRepository.findById(104L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Pedido atualizado = pedidoFacade.responderContrapropostaCliente(104L, "cliente@rentcars.com", true);

        assertEquals("APROVADO", atualizado.getStatus());
    }

    @Test
    @DisplayName("Cliente deve conseguir cancelar pedido pendente que pertence a ele")
    void deveClienteCancelarPedido() {
        Cliente cliente = new Cliente();
        cliente.setEmail("cliente@rentcars.com");

        Pedido pedido = new Pedido();
        pedido.setId(105L);
        pedido.setStatus("AGUARDANDO_APROVACAO");
        pedido.setCliente(cliente);

        when(pedidoRepository.findById(105L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Pedido cancelado = pedidoFacade.cancelarPedidoCliente(105L, "cliente@rentcars.com");

        assertEquals("CANCELADO", cancelado.getStatus());
    }

    @Test
    @DisplayName("Deve criar pedido VISITA_BOX sem automóvel com valor fixo de R$ 890,00")
    void deveCriarVisitaBoxSemAutomovelEFixarValor() {
        Cliente cliente = new Cliente();
        cliente.setId(2L);
        cliente.setEmail("visitante@apex.com");
        cliente.setStatusFinanceiro("REGULAR");

        Pedido visita = new Pedido();
        visita.setTipoServico("VISITA_BOX");
        visita.setAutomovel(null);
        LocalDateTime inicioVisita = proximoDiaAberto(2).withHour(9);
        visita.setDataInicio(inicioVisita);
        visita.setDataFim(inicioVisita.withHour(12));

        when(usuarioRepository.findByEmail("visitante@apex.com")).thenReturn(Optional.of(cliente));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        Pedido criado = pedidoFacade.criarPedido(visita, "visitante@apex.com");

        assertNotNull(criado);
        assertNull(criado.getAutomovel());
        assertEquals("VISITA_BOX", criado.getTipoServico());
        assertEquals(new BigDecimal("890.00"), criado.getValorTotal());
        assertEquals(new BigDecimal("890.00"), criado.getValorFinal());
        assertEquals("AGUARDANDO_APROVACAO", criado.getStatus());
        verify(pedidoRepository, never()).countAlugueisConflitantes(any(), any(), any());
    }

    @Test
    @DisplayName("Deve calcular FAST_LAP com multiplicador 0.55 sem desconto artificial e aguardar aprovação em FATURA_APEXPAY")
    void deveCalcularFastLapSemDescontoArtificialEAguardarFatura() {
        TrackSlotRepository slotRepo = mock(TrackSlotRepository.class);
        ApexPayFacade apexMock = mock(ApexPayFacade.class);
        PedidoFacade facadeComApex = new PedidoFacade(pedidoRepository, automovelRepository, usuarioRepository, slotRepo, apexMock);

        Automovel carro = new Automovel();
        carro.setId(77L);
        carro.setPrecoPorDia(new BigDecimal("1000.00"));

        Cliente piloto = new Cliente();
        piloto.setId(3L);
        piloto.setEmail("piloto@apex.com");
        piloto.setSaldoCarteira(BigDecimal.ZERO);
        piloto.setTotalDepositadoHistorico(new BigDecimal("60000.00"));
        piloto.setStatusFinanceiro("REGULAR");

        Pedido fastLap = new Pedido();
        fastLap.setAutomovel(carro);
        fastLap.setTipoServico("FAST_LAP");
        fastLap.setFormaPagamento("FATURA_APEXPAY");
        LocalDateTime inicioFast = proximoDiaAberto(1).withHour(14);
        fastLap.setDataInicio(inicioFast);
        fastLap.setDataFim(inicioFast.withHour(15));

        when(automovelRepository.findById(77L)).thenReturn(Optional.of(carro));
        when(pedidoRepository.countAlugueisConflitantes(eq(77L), any(), any())).thenReturn(0L);
        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(piloto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        Pedido criado = facadeComApex.criarPedido(fastLap, "piloto@apex.com");

        assertEquals(new BigDecimal("550.00"), criado.getValorTotal());
        assertEquals(0, criado.getDescontoFidelidade().compareTo(BigDecimal.ZERO));
        assertEquals(new BigDecimal("550.00"), criado.getValorFinal());
        assertEquals("AGUARDANDO_APROVACAO", criado.getStatus());
        assertEquals("FATURA_AGUARDANDO_APROVACAO", criado.getPagamentoStatus());
        verify(apexMock, never()).debitarValorLiquido(any(), any(), any(), any());
    }

    @Test
    @DisplayName("Deve bloquear agendamento na segunda-feira por manutenção de pista FIA")
    void deveRejeitarAgendamentoNaSegundaFeira() {
        Automovel carro = new Automovel();
        carro.setId(88L);

        LocalDate proximaSegunda = LocalDate.now().plusDays(1);
        while (proximaSegunda.getDayOfWeek() != DayOfWeek.MONDAY) {
            proximaSegunda = proximaSegunda.plusDays(1);
        }

        Pedido segunda = new Pedido();
        segunda.setAutomovel(carro);
        segunda.setTipoServico("TRACK_EXPERIENCE");
        segunda.setDataInicio(proximaSegunda.atTime(10, 0));
        segunda.setDataFim(proximaSegunda.atTime(12, 0));

        when(automovelRepository.findById(88L)).thenReturn(Optional.of(carro));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            pedidoFacade.criarPedido(segunda, "cliente@apex.com")
        );
        assertTrue(ex.getMessage().toLowerCase().contains("manuten"));
    }

}