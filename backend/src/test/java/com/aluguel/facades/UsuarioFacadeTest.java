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
    private com.aluguel.services.EmailService emailService;

    private ClienteFacade clienteFacade;
    private UsuarioFacade usuarioFacade;

    @BeforeEach
    void setUp() {
        clienteFacade = new ClienteFacade(clienteRepository);
        usuarioFacade = new UsuarioFacade(usuarioRepository, clienteRepository, agenteRepository, clienteFacade, emailService);
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
    @DisplayName("Deve solicitar código de recuperação por E-mail com sucesso")
    void deveSolicitarCodigoEmailComSucesso() {
        Usuario mockUser = new Usuario();
        mockUser.setNome("Gabriel Piloto");
        mockUser.setEmail("piloto@apex.com");

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(mockUser));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(mockUser);
        when(emailService.enviarCodigo(eq("piloto@apex.com"), eq("Gabriel Piloto"), anyString())).thenReturn(true);

        Map<String, Object> resp = usuarioFacade.solicitarRecuperacaoSenhaEmail("piloto@apex.com");
        assertTrue((Boolean) resp.get("success"));
        assertNull(resp.get("codigoSandbox"));
        assertEquals("Código de segurança enviado com sucesso para o seu e-mail!", resp.get("message"));
    }

    @Test
    @DisplayName("Deve rejeitar solicitação para e-mail não cadastrado")
    void deveRejeitarSolicitacaoEmailNaoCadastrado() {
        when(usuarioRepository.findByEmail("naoexiste@apex.com")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.solicitarRecuperacaoSenhaEmail("naoexiste@apex.com")
        );
        assertTrue(ex.getMessage().contains("Nenhum piloto encontrado com o e-mail"));
    }

    @Test
    @DisplayName("Deve bloquear nova solicitação em menos de 60 segundos (Rate Limiting)")
    void deveBloquearSolicitacaoEmMenosDe60Segundos() {
        Usuario mockUser = new Usuario();
        mockUser.setEmail("piloto@apex.com");
        mockUser.setCodigoRecuperacaoExpiraEm(java.time.LocalDateTime.now().plusMinutes(9).plusSeconds(30));

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(mockUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.solicitarRecuperacaoSenhaEmail("piloto@apex.com")
        );
        assertTrue(ex.getMessage().contains("Aguarde 60 segundos"));
    }

    @Test
    @DisplayName("Deve redefinir senha por E-mail com código válido")
    void deveRedefinirSenhaEmailComSucesso() {
        Usuario mockUser = new Usuario();
        mockUser.setEmail("piloto@apex.com");
        mockUser.setCodigoRecuperacao("123456");
        mockUser.setCodigoRecuperacaoExpiraEm(java.time.LocalDateTime.now().plusMinutes(5));

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(mockUser));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(mockUser);

        Map<String, Object> resp = usuarioFacade.redefinirSenhaEmail("piloto@apex.com", "123456", "novaSenhaApex123");
        assertTrue((Boolean) resp.get("success"));
        assertNull(mockUser.getCodigoRecuperacao());
    }

    @Test
    @DisplayName("Deve bloquear e invalidar código após 3 tentativas incorretas")
    void deveBloquearAposTresTentativasIncorretas() {
        Usuario mockUser = new Usuario();
        mockUser.setEmail("piloto@apex.com");
        mockUser.setCodigoRecuperacao("123456");
        mockUser.setCodigoRecuperacaoExpiraEm(java.time.LocalDateTime.now().plusMinutes(5));
        mockUser.setTentativasRecuperacao(3); // Já errou 3 vezes

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(mockUser));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(mockUser);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
            usuarioFacade.redefinirSenhaEmail("piloto@apex.com", "999999", "novaSenhaApex123")
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

        when(usuarioRepository.findByEmail("admin@apex.com")).thenReturn(Optional.of(admin));

        IllegalStateException exSolicitar = assertThrows(IllegalStateException.class, () ->
                usuarioFacade.solicitarRecuperacaoSenhaEmail("admin@apex.com")
        );
        assertTrue(exSolicitar.getMessage().contains("conta de Administrador é protegida"));

        IllegalStateException exRedefinir = assertThrows(IllegalStateException.class, () ->
                usuarioFacade.redefinirSenhaEmail("admin@apex.com", "123456", "novaSenha123")
        );
        assertTrue(exRedefinir.getMessage().contains("conta de Administrador é protegida"));
    }

    @Test
    @DisplayName("Deve permitir piloto alterar o próprio e-mail quando disponível")
    void devePermitirPilotoAlterarProprioEmail() {
        Usuario piloto = new Usuario();
        piloto.setId(7L);
        piloto.setNome("Gabriel Piloto");
        piloto.setEmail("antigo@apex.com");
        piloto.setRole("ROLE_CLIENTE");

        when(usuarioRepository.findByEmail("antigo@apex.com")).thenReturn(Optional.of(piloto));
        when(usuarioRepository.findByEmail("novo@apex.com")).thenReturn(Optional.empty(), Optional.of(piloto));
        when(usuarioRepository.update(any(Usuario.class))).thenReturn(piloto);

        Map<String, Object> perfil = usuarioFacade.atualizarPerfil("antigo@apex.com", Map.of("email", "  NOVO@APEX.COM "));

        assertEquals("novo@apex.com", piloto.getEmail());
        assertEquals("novo@apex.com", perfil.get("email"));
    }

    @Test
    @DisplayName("Deve bloquear troca de e-mail para endereço já cadastrado por outro usuário")
    void deveBloquearTrocaEmailDuplicado() {
        Usuario piloto = new Usuario();
        piloto.setId(7L);
        piloto.setEmail("piloto@apex.com");
        piloto.setRole("ROLE_CLIENTE");

        Usuario outro = new Usuario();
        outro.setId(9L);
        outro.setEmail("usado@apex.com");

        when(usuarioRepository.findByEmail("piloto@apex.com")).thenReturn(Optional.of(piloto));
        when(usuarioRepository.findByEmail("usado@apex.com")).thenReturn(Optional.of(outro));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                usuarioFacade.atualizarPerfil("piloto@apex.com", Map.of("email", "usado@apex.com"))
        );
        assertTrue(ex.getMessage().contains("Já existe outra conta cadastrada com este e-mail"));
    }
}
