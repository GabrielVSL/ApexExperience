package com.aluguel.facades;

import com.aluguel.models.Cliente;
import com.aluguel.models.TransacaoApexPay;
import com.aluguel.models.Usuario;
import com.aluguel.repositories.TransacaoApexPayRepository;
import com.aluguel.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Testes do Motor Financeiro ApexPay - Gateway Sandbox, Juros e Inadimplência")
class ApexPayEngineTest {

    private UsuarioRepository usuarioRepository;
    private TransacaoApexPayRepository transacaoRepository;
    private ApexPayFacade facade;

    @BeforeEach
    void setUp() {
        usuarioRepository = Mockito.mock(UsuarioRepository.class);
        transacaoRepository = Mockito.mock(TransacaoApexPayRepository.class);
        facade = new ApexPayFacade(usuarioRepository, transacaoRepository);
    }

    @Test
    @DisplayName("Deve creditar saldo no sandbox ApexPay sem aplicar tiers ou descontos artificiais")
    void deveCreditarSaldoSemTierArtificial() {
        Cliente cliente = new Cliente();
        cliente.setEmail("piloto@apex.com");
        cliente.setSaldoCarteira(BigDecimal.ZERO);
        cliente.setTotalDepositadoHistorico(BigDecimal.ZERO);

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(cliente));
        when(transacaoRepository.save(any(TransacaoApexPay.class))).thenAnswer(i -> i.getArgument(0));

        facade.depositar("piloto@apex.com", new BigDecimal("12000.00"), "Depósito Inicial");
        assertEquals(new BigDecimal("12000.00"), cliente.getSaldoCarteira());
        assertEquals("CONTA_VERIFICADA", cliente.getTierFidelidade());
        assertEquals(BigDecimal.ZERO, cliente.getFatorDesconto());

        facade.depositar("piloto@apex.com", new BigDecimal("40000.00"), "Recarga Adicional");
        assertEquals(new BigDecimal("52000.00"), cliente.getSaldoCarteira());
        assertEquals("CONTA_VERIFICADA", cliente.getTierFidelidade());
        assertEquals(BigDecimal.ZERO, cliente.getFatorDesconto());
    }

    @Test
    @DisplayName("Deve debitar o valor integral da reserva sem desconto de fidelidade")
    void deveDebitarValorIntegralSemDesconto() {
        Cliente cliente = new Cliente();
        cliente.setEmail("piloto@apex.com");
        cliente.setSaldoCarteira(new BigDecimal("20000.00"));
        cliente.setTotalDepositadoHistorico(new BigDecimal("60000.00"));

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(cliente));
        when(transacaoRepository.save(any(TransacaoApexPay.class))).thenAnswer(i -> i.getArgument(0));

        TransacaoApexPay transacao = facade.debitarReserva("piloto@apex.com", new BigDecimal("10000.00"), "APX-TEST-001", "Reserva Spa");

        assertEquals(new BigDecimal("10000.00"), transacao.getValor());
        assertEquals(new BigDecimal("10000.00"), cliente.getSaldoCarteira());
    }

    @Test
    @DisplayName("Deve bloquear débito e novas reservas se o cliente estiver inadimplente")
    void deveBloquearReservaParaInadimplente() {
        Cliente devedor = new Cliente();
        devedor.setEmail("devedor@apex.com");
        devedor.setSaldoCarteira(new BigDecimal("-1500.00"));
        devedor.setStatusFinanceiro("INADIMPLENTE");

        when(usuarioRepository.findByEmail("devedor@apex.com")).thenReturn(Optional.of(devedor));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                facade.debitarReserva("devedor@apex.com", new BigDecimal("2000.00"), "APX-TEST-002", "Tentativa Inválida")
        );
        assertTrue(ex.getMessage().contains("inadimplente"));
    }

    @Test
    @DisplayName("Deve calcular e aplicar juros diários sobre saldo devedor")
    void deveCalcularJurosDiarios() {
        Cliente devedor = new Cliente();
        devedor.setEmail("devedor@apex.com");
        devedor.setSaldoCarteira(new BigDecimal("-1000.00"));
        devedor.setStatusFinanceiro("INADIMPLENTE");

        when(usuarioRepository.findByEmail("devedor@apex.com")).thenReturn(Optional.of(devedor));
        when(transacaoRepository.save(any(TransacaoApexPay.class))).thenAnswer(i -> i.getArgument(0));

        // Juros de 0.1% sobre 1000.00 = R$ 1.00 de acréscimo à dívida
        TransacaoApexPay transacaoJuros = facade.aplicarJurosInadimplencia("devedor@apex.com");

        assertEquals(new BigDecimal("1.00"), transacaoJuros.getValor());
        assertEquals(new BigDecimal("-1001.00"), devedor.getSaldoCarteira());
    }
}
