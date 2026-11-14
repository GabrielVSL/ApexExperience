package com.aluguel.facades;

import com.aluguel.models.Agente;
import com.aluguel.models.Cliente;
import com.aluguel.models.Usuario;
import com.aluguel.repositories.AgenteRepository;
import com.aluguel.repositories.ClienteRepository;
import com.aluguel.repositories.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioFacadeTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private AgenteRepository agenteRepository;

    @Mock
    private com.aluguel.services.WhatsAppService whatsAppService;

    private ClienteFacade clienteFacade;
    private UsuarioFacade usuarioFacade;

    @BeforeEach
    void setUp() {
        clienteFacade = new ClienteFacade(clienteRepository);
        usuarioFacade = new UsuarioFacade(usuarioRepository, clienteRepository, agenteRepository, clienteFacade, whatsAppService);
    }

    @Test
    @DisplayName("Deve registrar um cliente com até 3 rendimentos com sucesso")
    void deveRegistrarClienteComSucesso() {
        Map<String, Object> data = new HashMap<>();
        data.put("role", "CLIENTE");
        data.put("nome", "Gabriel Teste");
        data.put("email", "gabriel@test.com");
        data.put("password", "senha123");
        data.put("cpf", "123.456.789-00");
        data.put("rg", "MG-12.345.678");
        data.put("profissao", "Engenheiro de Software");
        data.put("rendimentos", List.of(
            Map.of("empregadora", "Tech Corp", "valor", "8000.00"),
            Map.of("empregadora", "Freelance", "valor", "2500.00")
        ));

        when(usuarioRepository.findByEmail("gabriel@test.com")).thenReturn(Optional.empty());
        when(clienteRepository.findByCpf("123.456.789-00")).thenReturn(Optional.empty());
        when(clienteRepository.save(any(Cliente.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario usuario = usuarioFacade.registrar(data);

        assertNotNull(usuario);
        assertTrue(usuario instanceof Cliente);
        Cliente cliente = (Cliente) usuario;
        assertEquals("Gabriel Teste", cliente.getNome());
        assertEquals("gabriel@test.com", cliente.getEmail());
        assertEquals("ROLE_CLIENTE", cliente.getRole());
        assertEquals("123.456.789-00", cliente.getCpf());
        assertEquals(2, cliente.getRendimentos().size());
        verify(clienteRepository, times(1)).save(any(Cliente.class));
    }

    @Test
    @DisplayName("Deve rejeitar perfil inválido")
    void deveRejeitarPerfilInvalido() {
        Map<String, Object> data = new HashMap<>();
        data.put("role", "SUPER_ADMIN"); // Inválido
        data.put("email", "admin@rentcars.com");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.registrar(data)
        );
        assertTrue(ex.getMessage().contains("Perfil de usuário inválido"));
    }

    @Test
    @DisplayName("Deve rejeitar cadastro com e-mail duplicado")
    void deveRejeitarEmailDuplicado() {
        Map<String, Object> data = new HashMap<>();
        data.put("role", "CLIENTE");
        data.put("email", "duplicado@rentcars.com");

        when(usuarioRepository.findByEmail("duplicado@rentcars.com")).thenReturn(Optional.of(new Cliente()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.registrar(data)
        );
        assertTrue(ex.getMessage().contains("Já existe um usuário cadastrado com este e-mail"));
    }

    @Test
    @DisplayName("Deve rejeitar cliente com CPF duplicado")
    void deveRejeitarCpfDuplicado() {
        Map<String, Object> data = new HashMap<>();
        data.put("role", "CLIENTE");
        data.put("email", "novo@rentcars.com");
        data.put("cpf", "111.222.333-44");

        when(usuarioRepository.findByEmail("novo@rentcars.com")).thenReturn(Optional.empty());
        when(clienteRepository.findByCpf("111.222.333-44")).thenReturn(Optional.of(new Cliente()));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.registrar(data)
        );
        assertTrue(ex.getMessage().contains("Já existe um cliente cadastrado com este CPF"));
    }

    @Test
    @DisplayName("Deve rejeitar cliente com mais de 3 rendimentos")
    void deveRejeitarMaisDeTresRendimentos() {
        Map<String, Object> data = new HashMap<>();
        data.put("role", "CLIENTE");
        data.put("nome", "Cliente Investidor");
        data.put("email", "investidor@rentcars.com");
        data.put("password", "senha123");
        data.put("cpf", "999.888.777-66");
        data.put("rg", "MG-99.888.777");
        data.put("rendimentos", List.of(
            Map.of("empregadora", "Empresa A", "valor", "1000.00"),
            Map.of("empregadora", "Empresa B", "valor", "2000.00"),
            Map.of("empregadora", "Empresa C", "valor", "3000.00"),
            Map.of("empregadora", "Empresa D", "valor", "4000.00") // 4 rendimentos: excede o limite
        ));

        when(usuarioRepository.findByEmail("investidor@rentcars.com")).thenReturn(Optional.empty());
        when(clienteRepository.findByCpf("999.888.777-66")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.registrar(data)
        );
        assertTrue(ex.getMessage().contains("no máximo 3 rendimentos"));
    }

    @Test
    @DisplayName("Deve rejeitar tentativa pública de cadastro de EMPRESA ou BANCO")
    void deveRejeitarCadastroCorporativoPublico() {
        Map<String, Object> data = new HashMap<>();
        data.put("role", "EMPRESA");
        data.put("nome", "Locadora Alpha");
        data.put("email", "contato@alpha.com");
        data.put("password", "senha123");
        data.put("cnpj", "12.345.678/0001-90");

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.registrar(data)
        );
        assertTrue(ex.getMessage().contains("exclusivo para Pilotos/Clientes"));
    }

    @Test
    @DisplayName("Deve solicitar código de recuperação via WhatsApp com sucesso")
    void deveSolicitarCodigoWhatsAppComSucesso() {
        Usuario mockUser = new Usuario();
        mockUser.setEmail("piloto@apex.com");
        mockUser.setTelefone("11987654321");

        when(usuarioRepository.findByTelefone("11987654321")).thenReturn(Optional.of(mockUser));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(mockUser);
        when(whatsAppService.enviarCodigo(eq("11987654321"), anyString())).thenReturn(true);

        Map<String, Object> resp = usuarioFacade.solicitarRecuperacaoSenhaWhatsApp("(11) 98765-4321");
        assertTrue((Boolean) resp.get("success"));
        assertNull(resp.get("codigoSandbox"));
        assertEquals("Código de segurança enviado com sucesso para o seu WhatsApp!", resp.get("message"));
    }

    @Test
    @DisplayName("Deve rejeitar solicitação para telefone não cadastrado")
    void deveRejeitarSolicitacaoTelefoneNaoCadastrado() {
        when(usuarioRepository.findByTelefone("11999999999")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.solicitarRecuperacaoSenhaWhatsApp("(11) 99999-9999")
        );
        assertTrue(ex.getMessage().contains("Nenhum piloto encontrado com o WhatsApp"));
    }

    @Test
    @DisplayName("Deve bloquear nova solicitação em menos de 60 segundos (Rate Limiting)")
    void deveBloquearSolicitacaoEmMenosDe60Segundos() {
        Usuario mockUser = new Usuario();
        mockUser.setTelefone("11987654321");
        mockUser.setCodigoRecuperacaoExpiraEm(java.time.LocalDateTime.now().plusMinutes(9).plusSeconds(30));

        when(usuarioRepository.findByTelefone("11987654321")).thenReturn(Optional.of(mockUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.solicitarRecuperacaoSenhaWhatsApp("11987654321")
        );
        assertTrue(ex.getMessage().contains("Aguarde 60 segundos"));
    }

    @Test
    @DisplayName("Deve redefinir senha via WhatsApp com código válido")
    void deveRedefinirSenhaWhatsAppComSucesso() {
        Usuario mockUser = new Usuario();
        mockUser.setEmail("piloto@apex.com");
        mockUser.setTelefone("11987654321");
        mockUser.setCodigoRecuperacao("123456");
        mockUser.setCodigoRecuperacaoExpiraEm(java.time.LocalDateTime.now().plusMinutes(5));

        when(usuarioRepository.findByTelefone("11987654321")).thenReturn(Optional.of(mockUser));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(mockUser);

        Map<String, Object> resp = usuarioFacade.redefinirSenhaWhatsApp("11987654321", "123456", "novaSenhaApex123");
        assertTrue((Boolean) resp.get("success"));
        assertNull(mockUser.getCodigoRecuperacao());
    }

    @Test
    @DisplayName("Deve bloquear e invalidar código após 3 tentativas incorretas")
    void deveBloquearAposTresTentativasIncorretas() {
        Usuario mockUser = new Usuario();
        mockUser.setTelefone("11987654321");
        mockUser.setCodigoRecuperacao("123456");
        mockUser.setCodigoRecuperacaoExpiraEm(java.time.LocalDateTime.now().plusMinutes(5));
        mockUser.setTentativasRecuperacao(3); // Já errou 3 vezes

        when(usuarioRepository.findByTelefone("11987654321")).thenReturn(Optional.of(mockUser));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(mockUser);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.redefinirSenhaWhatsApp("11987654321", "999999", "novaSenhaApex123")
        );
        assertTrue(ex.getMessage().contains("Limite de 3 tentativas excedido"));
        assertNull(mockUser.getCodigoRecuperacao());
    }

    @Test
    @DisplayName("Deve bloquear redefinição de senha para conta de Administrador")
    void deveBloquearRedefinicaoDeSenhaParaAdmin() {
        Usuario admin = new Usuario();
        admin.setEmail("admin@apex.com");
        admin.setRole("ROLE_ADMIN");
        admin.setTelefone("11999999999");

        when(usuarioRepository.findByTelefone("11999999999")).thenReturn(Optional.of(admin));

        IllegalStateException exSolicitar = assertThrows(IllegalStateException.class, () ->
                usuarioFacade.solicitarRecuperacaoSenhaWhatsApp("11999999999")
        );
        assertTrue(exSolicitar.getMessage().contains("conta de Administrador é protegida"));

        IllegalStateException exRedefinir = assertThrows(IllegalStateException.class, () ->
                usuarioFacade.redefinirSenhaWhatsApp("11999999999", "123456", "novaSenha123")
        );
        assertTrue(exRedefinir.getMessage().contains("conta de Administrador é protegida"));
    }
}
