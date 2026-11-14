package com.aluguel.facades;

import com.aluguel.models.*;
import com.aluguel.repositories.*;
import com.aluguel.services.WhatsAppService;
import com.aluguel.utils.CnhValidator;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.mindrot.jbcrypt.BCrypt;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Singleton
public class UsuarioFacade {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final AgenteRepository agenteRepository;
    private final ClienteFacade clienteFacade;
    private final WhatsAppService whatsAppService;

    @Inject
    public UsuarioFacade(UsuarioRepository usuarioRepository,
                         ClienteRepository clienteRepository,
                         AgenteRepository agenteRepository,
                         ClienteFacade clienteFacade,
                         WhatsAppService whatsAppService) {
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.agenteRepository = agenteRepository;
        this.clienteFacade = clienteFacade;
        this.whatsAppService = whatsAppService;
    }

    public UsuarioFacade(UsuarioRepository usuarioRepository,
                         ClienteRepository clienteRepository,
                         AgenteRepository agenteRepository,
                         ClienteFacade clienteFacade) {
        this(usuarioRepository, clienteRepository, agenteRepository, clienteFacade, new WhatsAppService("http://localhost:8085"));
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Usuario registrar(Map<String, Object> data) {
        String rawRole = data.get("role") != null ? data.get("role").toString().trim().toUpperCase() : "CLIENTE";
        if (rawRole.isEmpty()) {
            rawRole = "CLIENTE";
        }
        if (!"CLIENTE".equals(rawRole)) {
            throw new IllegalArgumentException("Perfil de usuário inválido. O cadastro público é exclusivo para Pilotos/Clientes Apex.");
        }
        data.put("role", "CLIENTE");

        String email = (String) data.get("email");
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }
        if (usuarioRepository.findByEmail(email.trim()).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário cadastrado com este e-mail.");
        }

        String cpf = (String) data.get("cpf");
        if (cpf == null || cpf.trim().isEmpty()) {
            throw new IllegalArgumentException("O CPF é obrigatório para clientes.");
        }
        if (clienteRepository.findByCpf(cpf.trim()).isPresent()) {
            throw new IllegalArgumentException("Já existe um cliente cadastrado com este CPF.");
        }

        Cliente c = new Cliente();
        preencherDadosBase(c, data);
        c.setCpf(cpf.trim());
        c.setRg((String) data.get("rg"));
        c.setProfissao((String) data.get("profissao"));

        // Dados opcionais de CNH / data de nascimento no momento do cadastro
        if (data.get("cnhNumero") != null && !data.get("cnhNumero").toString().isBlank()) {
            String cnhLimpa = data.get("cnhNumero").toString().replaceAll("\\D", "");
            if (!CnhValidator.isValid(cnhLimpa)) {
                throw new IllegalArgumentException("Número de CNH inválido pelo algoritmo oficial (Módulo 11).");
            }
            c.setCnhNumero(cnhLimpa);
            c.setCnhCategoria(data.get("cnhCategoria") != null ? data.get("cnhCategoria").toString() : "B");
        }
        if (data.get("dataNascimento") != null && !data.get("dataNascimento").toString().isBlank()) {
            c.setDataNascimento(LocalDate.parse(data.get("dataNascimento").toString()));
        }

        // Lendo e validando rendimentos
        if (data.containsKey("rendimentos") && data.get("rendimentos") != null) {
            List<Map<String, Object>> rendimentosJson = (List<Map<String, Object>>) data.get("rendimentos");
            List<Rendimento> listaRendimentos = new ArrayList<>();

            for (Map<String, Object> item : rendimentosJson) {
                if (item == null) continue;
                Rendimento rendimento = new Rendimento();

                if (item.containsKey("empregadora") && item.get("empregadora") != null) {
                    rendimento.setEmpregadora(item.get("empregadora").toString().trim());
                }

                if (item.containsKey("valor") && item.get("valor") != null) {
                    String valStr = item.get("valor").toString().trim();
                    if (!valStr.isEmpty()) {
                        try {
                            rendimento.setValor(new BigDecimal(valStr));
                        } catch (Exception ignored) {}
                    }
                }

                if ((rendimento.getEmpregadora() != null && !rendimento.getEmpregadora().isEmpty()) ||
                    (rendimento.getValor() != null && rendimento.getValor().compareTo(BigDecimal.ZERO) > 0)) {
                    listaRendimentos.add(rendimento);
                }
            }

            c.setRendimentos(listaRendimentos);
        }

        clienteFacade.validarRegrasDeNegocio(c);
        Cliente salvo = clienteRepository.save(c);

        // Boas-Vindas automáticas no WhatsApp para o novo piloto cadastrado
        if (salvo.getTelefone() != null && !salvo.getTelefone().isBlank()) {
            whatsAppService.enviarBoasVindasAsync(salvo.getTelefone(), salvo.getNome());
        }

        return salvo;
    }

    public Map<String, Object> buscarPerfil(String email) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        Map<String, Object> perfil = new HashMap<>();
        perfil.put("id", u.getId());
        perfil.put("nome", u.getNome());
        perfil.put("email", u.getEmail());
        perfil.put("role", u.getRole());
        perfil.put("telefone", u.getTelefone());
        perfil.put("endereco", u.getEndereco());
        perfil.put("cnhNumero", u.getCnhNumero());
        perfil.put("cnhCategoria", u.getCnhCategoria());
        perfil.put("dataNascimento", u.getDataNascimento());
        perfil.put("saldoCarteira", u.getSaldoCarteira() != null ? u.getSaldoCarteira() : BigDecimal.ZERO);
        perfil.put("totalDepositadoHistorico", u.getTotalDepositadoHistorico() != null ? u.getTotalDepositadoHistorico() : BigDecimal.ZERO);
        perfil.put("statusFinanceiro", u.getStatusFinanceiro() != null ? u.getStatusFinanceiro() : "REGULAR");
        perfil.put("inadimplente", u.isInadimplente());
        perfil.put("tierFidelidade", u.getTierFidelidade());
        perfil.put("porcentagemDesconto", u.getFatorDesconto().multiply(new BigDecimal("100")).intValue());

        if (u instanceof Cliente c) {
            perfil.put("cpf", c.getCpf());
            perfil.put("rg", c.getRg());
            perfil.put("profissao", c.getProfissao());
        }

        return perfil;
    }

    @Transactional
    public Map<String, Object> atualizarPerfil(String email, Map<String, Object> payload) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        if ("ROLE_ADMIN".equalsIgnoreCase(u.getRole()) || "admin@apex.com".equalsIgnoreCase(u.getEmail())) {
            throw new IllegalStateException("O perfil de Administrador é protegido para demonstração e não pode ser editado.");
        }

        if (payload != null) {
            if (payload.containsKey("nome") && payload.get("nome") != null) {
                String nome = payload.get("nome").toString().trim();
                if (nome.length() >= 3) {
                    u.setNome(nome);
                }
            }
            if (payload.containsKey("telefone") && payload.get("telefone") != null) {
                u.setTelefone(payload.get("telefone").toString().replaceAll("\\D", ""));
            }
            if (payload.containsKey("endereco") && payload.get("endereco") != null) {
                u.setEndereco(payload.get("endereco").toString().trim());
            }
        }

        usuarioRepository.update(u);
        return buscarPerfil(email);
    }

    @Transactional
    public Map<String, Object> alterarSenhaAutenticado(String email, String senhaAtual, String novaSenha, String codigoWhatsApp) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        if ("ROLE_ADMIN".equalsIgnoreCase(u.getRole()) || "admin@apex.com".equalsIgnoreCase(u.getEmail())) {
            throw new IllegalStateException("A conta de Administrador é protegida para demonstração pública e sua senha não pode ser alterada.");
        }

        if (novaSenha == null || novaSenha.trim().length() < 6) {
            throw new IllegalArgumentException("A nova senha deve ter no mínimo 6 caracteres.");
        }

        boolean verificado = false;
        if (senhaAtual != null && !senhaAtual.isBlank()) {
            if (BCrypt.checkpw(senhaAtual, u.getSenha())) {
                verificado = true;
            } else {
                throw new IllegalArgumentException("Senha atual incorreta. Digite sua senha atual correta para autorizar a alteração.");
            }
        } else if (codigoWhatsApp != null && !codigoWhatsApp.isBlank()) {
            if (u.getCodigoRecuperacao() != null &&
                    u.getCodigoRecuperacao().equals(codigoWhatsApp.trim()) &&
                    u.getCodigoRecuperacaoExpiraEm() != null &&
                    LocalDateTime.now().isBefore(u.getCodigoRecuperacaoExpiraEm())) {
                verificado = true;
                u.setCodigoRecuperacao(null);
                u.setCodigoRecuperacaoExpiraEm(null);
            } else {
                throw new IllegalArgumentException("Código de verificação do WhatsApp inválido ou expirado.");
            }
        }

        if (!verificado) {
            throw new IllegalArgumentException("Para alterar a senha com segurança, confirme sua Senha Atual ou valide com o Código do WhatsApp.");
        }

        u.setSenha(BCrypt.hashpw(novaSenha.trim(), BCrypt.gensalt()));
        usuarioRepository.update(u);
        return Map.of("message", "Senha alterada com sucesso mediante validação de segurança.");
    }

    @Transactional
    public Map<String, Object> atualizarHabilitacao(String email, String cnhNumero, String cnhCategoria, String dataNascimento) {
        Usuario u = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        if (cnhNumero == null || !CnhValidator.isValid(cnhNumero)) {
            throw new IllegalArgumentException("CNH inválida pelo algoritmo oficial (Módulo 11). Para testes utilize: " + CnhValidator.CNH_TESTE_OFICIAL);
        }
        String cnhLimpa = cnhNumero.replaceAll("\\D", "");
        u.setCnhNumero(cnhLimpa);
        u.setCnhCategoria(cnhCategoria != null && !cnhCategoria.isBlank() ? cnhCategoria.toUpperCase() : "B");

        if (dataNascimento != null && !dataNascimento.isBlank()) {
            LocalDate nascimento = LocalDate.parse(dataNascimento);
            long idade = ChronoUnit.YEARS.between(nascimento, LocalDate.now());
            if (idade < 21) {
                throw new IllegalArgumentException("Idade mínima de 21 anos exigida para pilotagem em pista.");
            }
            u.setDataNascimento(nascimento);
        }

        usuarioRepository.update(u);
        return buscarPerfil(email);
    }

    @Transactional
    public Map<String, Object> solicitarRecuperacaoSenhaWhatsApp(String telefone) {
        return solicitarRecuperacaoSenhaWhatsApp(telefone, null);
    }

    @Transactional
    public Map<String, Object> solicitarRecuperacaoSenhaWhatsApp(String telefone, String clientIp) {
        if (telefone == null || telefone.trim().isEmpty()) {
            throw new IllegalArgumentException("O número de WhatsApp é obrigatório.");
        }
        String cleanPhone = telefone.replaceAll("\\D", "");
        if (cleanPhone.length() < 10) {
            throw new IllegalArgumentException("Número de WhatsApp inválido. Digite DDD + número (ex: 11987654321).");
        }

        // Validação de cota e proteção anti-spam prévia (IP, Teto por Telefone e Teto Global)
        whatsAppService.validarLimitesAntiSpam(cleanPhone, clientIp);

        // Busca estrita pelo piloto titular do telefone informado (Sem falhas de fallback ou sobrescrita)
        Usuario usuario = usuarioRepository.findByTelefone(cleanPhone)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Nenhum piloto encontrado com o WhatsApp " + telefone + ". Verifique se o número foi cadastrado com o DDD."
                ));

        // 🔒 PROTEÇÃO DE SEGURANÇA: A senha de administrador é fixa para demonstração e não pode ser redefinida
        if ("ROLE_ADMIN".equalsIgnoreCase(usuario.getRole()) || "admin@apex.com".equalsIgnoreCase(usuario.getEmail())) {
            throw new IllegalStateException("A conta de Administrador é protegida para demonstração pública e sua senha não pode ser redefinida.");
        }

        // Rate Limiting: Bloqueia novo envio em menos de 60 segundos
        if (usuario.getCodigoRecuperacaoExpiraEm() != null &&
                usuario.getCodigoRecuperacaoExpiraEm().isAfter(LocalDateTime.now().plusMinutes(9))) {
            throw new IllegalArgumentException("Aguarde 60 segundos antes de solicitar um novo código no WhatsApp.");
        }

        // Gera código de segurança numérico de 6 dígitos
        String codigo = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        usuario.setCodigoRecuperacao(codigo);
        usuario.setCodigoRecuperacaoExpiraEm(LocalDateTime.now().plusMinutes(10));
        usuario.setTentativasRecuperacao(0);
        usuarioRepository.update(usuario);

        // Disparo real via WhatsApp (Meta Cloud API ou Gateway local)
        boolean enviado = whatsAppService.enviarCodigo(cleanPhone, codigo);
        if (!enviado) {
            throw new IllegalStateException("Não foi possível entregar a mensagem no WhatsApp. Verifique se o número está ativo ou se o gateway está conectado.");
        }

        // Registra o disparo na cota anti-spam
        whatsAppService.registrarEnvio(cleanPhone, clientIp);

        // Resposta 100% segura: O código OTP NUNCA é devolvido na API
        return Map.of(
                "success", true,
                "message", "Código de segurança enviado com sucesso para o seu WhatsApp!"
        );
    }

    @Transactional
    public Map<String, Object> redefinirSenhaWhatsApp(String telefone, String codigo, String novaSenha) {
        if (telefone == null || telefone.trim().isEmpty()) {
            throw new IllegalArgumentException("O número de telefone é obrigatório.");
        }
        String cleanPhone = telefone.replaceAll("\\D", "");
        if (codigo == null || codigo.trim().isEmpty()) {
            throw new IllegalArgumentException("O código de verificação é obrigatório.");
        }
        if (novaSenha == null || novaSenha.trim().length() < 6) {
            throw new IllegalArgumentException("A nova senha deve ter no mínimo 6 caracteres.");
        }

        Usuario usuario = usuarioRepository.findByTelefone(cleanPhone)
                .orElseThrow(() -> new IllegalArgumentException("Nenhum piloto encontrado com este WhatsApp."));

        // 🔒 PROTEÇÃO DE SEGURANÇA: A senha de administrador é fixa para demonstração e não pode ser redefinida
        if ("ROLE_ADMIN".equalsIgnoreCase(usuario.getRole()) || "admin@apex.com".equalsIgnoreCase(usuario.getEmail())) {
            throw new IllegalStateException("A conta de Administrador é protegida para demonstração pública e sua senha não pode ser alterada.");
        }

        if (usuario.getCodigoRecuperacaoExpiraEm() == null || usuario.getCodigoRecuperacaoExpiraEm().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("O código de verificação expirou. Solicite um novo código via WhatsApp.");
        }

        // Bloqueio de Força Bruta: Máximo de 3 tentativas por código gerado
        int tentativas = usuario.getTentativasRecuperacao() != null ? usuario.getTentativasRecuperacao() : 0;
        if (tentativas >= 3) {
            usuario.setCodigoRecuperacao(null);
            usuario.setCodigoRecuperacaoExpiraEm(null);
            usuario.setTentativasRecuperacao(0);
            usuarioRepository.update(usuario);
            throw new IllegalArgumentException("Limite de 3 tentativas excedido. Por segurança, solicite um novo código no WhatsApp.");
        }

        if (usuario.getCodigoRecuperacao() == null || !usuario.getCodigoRecuperacao().equals(codigo.trim())) {
            usuario.setTentativasRecuperacao(tentativas + 1);
            usuarioRepository.update(usuario);
            int restantes = 3 - (tentativas + 1);
            throw new IllegalArgumentException("Código de segurança incorreto. Você tem mais " + restantes + " tentativa(s).");
        }

        // Sucesso: redefine senha, anula código e reseta contador
        usuario.setSenha(BCrypt.hashpw(novaSenha.trim(), BCrypt.gensalt()));
        usuario.setCodigoRecuperacao(null);
        usuario.setCodigoRecuperacaoExpiraEm(null);
        usuario.setTentativasRecuperacao(0);
        usuarioRepository.update(usuario);

        return Map.of(
                "success", true,
                "message", "Senha redefinida com sucesso! Você já pode entrar com sua nova senha."
        );
    }

    private void preencherDadosBase(Usuario u, Map<String, Object> data) {
        String nome = (String) data.get("nome");
        if (nome == null || nome.trim().isEmpty()) {
            throw new IllegalArgumentException("O nome / razão social é obrigatório.");
        }
        u.setNome(nome.trim());
        u.setEmail(((String) data.get("email")).trim());
        u.setEndereco((String) data.get("endereco"));
        u.setRole("ROLE_" + data.get("role"));

        if (data.containsKey("telefone") && data.get("telefone") != null) {
            String telLimpo = data.get("telefone").toString().replaceAll("\\D", "");
            if (!telLimpo.isEmpty()) {
                u.setTelefone(telLimpo);
            }
        }

        String senhaPura = (String) data.get("password");
        if (senhaPura == null || senhaPura.trim().length() < 6) {
            throw new IllegalArgumentException("A senha deve ter no mínimo 6 caracteres.");
        }
        String senhaHasheada = BCrypt.hashpw(senhaPura, BCrypt.gensalt());
        u.setSenha(senhaHasheada);
    }
}
