package com.aluguel.services;

import com.aluguel.facades.PedidoFacade;
import com.aluguel.models.Automovel;
import com.aluguel.models.Circuito;
import com.aluguel.models.Cliente;
import com.aluguel.models.Pedido;
import com.aluguel.models.TrackSlot;
import com.aluguel.queue.ReservaMensagem;
import com.aluguel.queue.ReservaQueueEngine;
import com.aluguel.repositories.PedidoRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Testes do Motor de QR Code Criptográfico (FIA Pass) e Preservação na Fila")
class QrCodePassServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @Mock
    private PedidoFacade pedidoFacade;

    private QrCodePassService service;

    @BeforeEach
    void setUp() {
        service = new QrCodePassService(pedidoRepository, "segredo-teste-hmac-256-bits-apex-racing");
    }

    private Pedido criarPedidoAprovado() {
        Cliente cliente = new Cliente();
        cliente.setId(7L);
        cliente.setNome("Carlos Sainz");
        cliente.setEmail("carlos@apex.com");
        cliente.setCnhNumero("05571264802");
        cliente.setStatusConta("ATIVO");

        Circuito circuito = new Circuito("interlagos", "Autódromo de Interlagos", "Brasil", "América do Sul",
                new BigDecimal("4.309"), 15, "1:07.281", 30);

        Automovel auto = new Automovel();
        auto.setId(1L);
        auto.setMarca("Porsche");
        auto.setModelo("911 GT3 RS (992)");
        auto.setPlaca("GT39E92");
        auto.setMatricula("POR-GT3RS-2024");
        auto.setCircuito(circuito);

        TrackSlot slot = new TrackSlot(circuito, LocalDate.now().plusDays(2), "MANHA", 12);

        Pedido p = new Pedido();
        p.setId(42L);
        p.setTrackingCode("APX-4242");
        p.setCliente(cliente);
        p.setAutomovel(auto);
        p.setTrackSlot(slot);
        p.setTipoServico("TRACK_EXPERIENCE");
        p.setDataInicio(LocalDateTime.now().plusDays(2).withHour(8).withMinute(0).withSecond(0).withNano(0));
        p.setDataFim(LocalDateTime.now().plusDays(2).withHour(12).withMinute(0).withSecond(0).withNano(0));
        p.setValorTotal(new BigDecimal("3850.00"));
        p.setValorFinal(new BigDecimal("3850.00"));
        p.setPagamentoStatus("PAGO_CARTEIRA");
        p.setStatus("APROVADO");
        return p;
    }

    @Test
    @DisplayName("Deve gerar payload JSON completo e assinatura HMAC-SHA256 verificável")
    void deveGerarEValidarQrCodeAutentico() {
        Pedido pedido = criarPedidoAprovado();
        service.gerarOuAtualizarQrCode(pedido);

        assertNotNull(pedido.getQrCodePayload());
        assertNotNull(pedido.getQrCodeAssinatura());
        assertNotNull(pedido.getQrCodeGeradoEm());
        assertTrue(pedido.getQrCodePayload().contains("APEX-FIA-PASS-V2"));
        assertTrue(pedido.getQrCodePayload().contains("Carlos Sainz"));
        assertTrue(pedido.getQrCodePayload().contains("05571264802"));
        assertTrue(pedido.getQrCodePayload().contains("GT39E92"));

        when(pedidoRepository.findById(42L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> resultado = service.validarQrCode(pedido.getQrCodePayload(), true);

        assertEquals(Boolean.TRUE, resultado.get("valido"));
        assertEquals(Boolean.TRUE, resultado.get("assinaturaVerificada"));
        assertEquals(Boolean.TRUE, resultado.get("liberadoPitlane"));
        assertNotNull(pedido.getCheckInRealizadoEm());
        verify(pedidoRepository, times(1)).update(pedido);
    }

    @Test
    @DisplayName("Deve rejeitar QR Code adulterado mesmo mantendo pedidoId legítimo")
    void deveRejeitarQrCodeAdulterado() {
        Pedido pedido = criarPedidoAprovado();
        service.gerarOuAtualizarQrCode(pedido);
        String payloadAdulterado = pedido.getQrCodePayload().replace("carlos@apex.com", "hacker@apex.com");

        when(pedidoRepository.findById(42L)).thenReturn(Optional.of(pedido));

        Map<String, Object> resultado = service.validarQrCode(payloadAdulterado, true);

        assertEquals(Boolean.FALSE, resultado.get("valido"));
        assertEquals(Boolean.FALSE, resultado.get("liberadoPitlane"));
        assertTrue(resultado.get("mensagem").toString().contains("Assinatura HMAC-SHA256 inválida"));
        assertNull(pedido.getCheckInRealizadoEm());
    }

    @Test
    @DisplayName("Deve executar task em lote e gerar QR Codes ausentes para todas as sessões")
    void deveExecutarTaskEmLoteParaGerarQrCodes() {
        Pedido p1 = criarPedidoAprovado();
        Pedido p2 = criarPedidoAprovado();
        p2.setId(43L);
        p2.setTrackingCode("APX-4343");
        p2.setStatus("AGUARDANDO_APROVACAO");

        when(pedidoRepository.findAll()).thenReturn(List.of(p1, p2));
        when(pedidoRepository.update(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        Map<String, Object> relatorio = service.executarTaskGeracaoQrCodes();

        assertEquals(2, relatorio.get("totalSessoes"));
        assertEquals(2, relatorio.get("qrCodesGeradosOuAtualizados"));
        assertNotNull(p1.getQrCodePayload());
        assertNotNull(p2.getQrCodePayload());
        verify(pedidoRepository, times(2)).update(any(Pedido.class));
    }

    @Test
    @DisplayName("Deve preservar formaPagamento, valorTotal e CNH na fila assíncrona ReservaQueueEngine")
    void devePreservarCamposNaFilaAssincrona() throws Exception {
        ReservaQueueEngine engine = new ReservaQueueEngine(pedidoFacade, 2, "apex.reservas.dlq");
        try {
            ReservaMensagem msg = new ReservaMensagem();
            msg.setEmailCliente("carlos@apex.com");
            msg.setAutomovelId(1L);
            msg.setTipoServico("TRACK_EXPERIENCE");
            msg.setSlotId(10L);
            msg.setDataInicio(LocalDateTime.now().plusDays(1));
            msg.setDataFim(LocalDateTime.now().plusDays(1).plusHours(4));
            msg.setFormaPagamento("CARTEIRA_APEXPAY");
            msg.setValorTotal(new BigDecimal("3850.00"));
            msg.setCnhInformada("05571264802");

            engine.enfileirar(msg);

            verify(pedidoFacade, timeout(2000).times(1)).criarPedido(argThat(p ->
                    "CARTEIRA_APEXPAY".equals(p.getFormaPagamento())
                            && new BigDecimal("3850.00").compareTo(p.getValorTotal()) == 0
                            && "05571264802".equals(p.getCnhInformada())
            ), eq("carlos@apex.com"));
        } finally {
            engine.encerrar();
        }
    }
}
