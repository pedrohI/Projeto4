const bcrypt = require("bcryptjs");
const ErroAplicacao = require("../errors/ErroAplicacao");
const {
    perfilParaApi,
    perfilParaBanco
} = require("../utils/perfil");

const PERFIS_PUBLICOS = ["responsavel"];

class AutenticacaoService {
    constructor(
        usuarioRepository,
        tokenService = null,
        opcoes = {}
    ) {
        this.usuarioRepository = usuarioRepository;
        this.tokenService = tokenService;
        this.professorRepository = opcoes.professorRepository || null;
        this.responsavelRepository = opcoes.responsavelRepository || null;
        this.conviteRepository = opcoes.conviteRepository || null;
    }

    async montarUsuarioPublico(usuario) {
        const perfil = perfilParaApi(usuario.perfil);

        const dados = {
            idUsuario: usuario.idUsuario,
            nome: usuario.nome,
            email: usuario.email,
            perfil,
            ativo: usuario.ativo,
            telefone: usuario.telefone ?? null,
            professorId: null,
            responsavelId: null
        };

        if (perfil === "professor" && this.professorRepository) {
            const professor = await this.professorRepository.buscarPorUsuario(
                usuario.idUsuario
            );
            dados.professorId = professor ? professor.idProfessor : null;
        }

        if (perfil === "responsavel" && this.responsavelRepository) {
            const responsavel =
                await this.responsavelRepository.buscarPorUsuario(
                    usuario.idUsuario
                );
            dados.responsavelId = responsavel
                ? responsavel.idResponsavel
                : null;
        }

        return dados;
    }

    // Contas antigas de responsável podem existir só em "usuario".
    // Cria o registro em "responsavel" na primeira autenticação.
    async garantirResponsavel(usuario) {
        if (!this.responsavelRepository) return;
        if (perfilParaApi(usuario.perfil) !== "responsavel") return;

        const existente =
            await this.responsavelRepository.buscarPorUsuario(
                usuario.idUsuario
            );

        if (existente) return;

        try {
            await this.responsavelRepository.criarPorUsuario(
                usuario.idUsuario
            );
        } catch (erro) {
            // Outra requisição pode ter criado o registro ao mesmo tempo.
            if (!erro || erro.code !== "23505") throw erro;
        }
    }

    // Atualização dos próprios dados (nome, e-mail e telefone).
    async atualizarPerfil(idUsuario, dados) {
        const usuario = await this.usuarioRepository.buscarPorId(idUsuario);

        if (!usuario) {
            throw new ErroAplicacao("sem_conta", "Conta não encontrada.", 404);
        }

        const nome = dados.nome === undefined ? usuario.nome : dados.nome;
        const email = dados.email === undefined ? usuario.email : dados.email;
        const telefone = dados.telefone
            ? String(dados.telefone).trim()
            : null;

        if (
            String(email).toLowerCase() !==
            String(usuario.email).toLowerCase()
        ) {
            const existente = await this.usuarioRepository.buscarPorEmail(email);

            if (existente && existente.idUsuario !== usuario.idUsuario) {
                throw new ErroAplicacao(
                    "email_em_uso",
                    "Já existe uma conta com este e-mail.",
                    409,
                    { email: "Já existe uma conta com este e-mail." }
                );
            }
        }

        const atualizado = await this.usuarioRepository.atualizarPerfil(
            idUsuario,
            { nome, email, telefone }
        );

        if (!atualizado) {
            throw new ErroAplicacao("sem_conta", "Conta não encontrada.", 404);
        }

        // Mantém a tabela usada pelo backoffice em sincronia.
        if (
            perfilParaApi(atualizado.perfil) === "responsavel" &&
            this.responsavelRepository &&
            this.responsavelRepository.atualizarTelefonePorUsuario
        ) {
            await this.responsavelRepository.atualizarTelefonePorUsuario(
                idUsuario,
                telefone
            );
        }

        return await this.montarUsuarioPublico(atualizado);
    }

    async validarCredenciais(email, senha, perfilSolicitado = null) {
        const usuario = await this.usuarioRepository.buscarPorEmail(email);

        if (usuario === null) {
            throw new ErroAplicacao(
                "sem_conta",
                "Não encontramos uma conta com este e-mail.",
                401
            );
        }

        if (!usuario.estaAtivo()) {
            throw new ErroAplicacao(
                "usuario_inativo",
                "Esta conta está inativa. Procure a coordenação.",
                403
            );
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

        if (!senhaValida) {
            throw new ErroAplicacao("senha", "Senha incorreta.", 401);
        }

        if (
            perfilSolicitado &&
            perfilParaApi(perfilSolicitado) !==
                perfilParaApi(usuario.perfil)
        ) {
            throw new ErroAplicacao(
                "outro_perfil",
                "Este e-mail pertence a outro perfil.",
                403,
                { perfil: perfilParaApi(usuario.perfil) }
            );
        }

        return usuario;
    }

    // Mantido para os scripts de teste antigos.
    async autenticar(email, senha) {
        return this.validarCredenciais(email, senha);
    }

    async login(email, senha, perfilSolicitado = null) {
        if (!this.tokenService) {
            throw new Error("TokenService não configurado.");
        }

        const usuario = await this.validarCredenciais(
            email,
            senha,
            perfilSolicitado
        );

        const token = this.tokenService.emitir(usuario);
        const publico = await this.montarUsuarioPublico(usuario);

        // Reaproveita a consulta feita por montarUsuarioPublico. Só cria o
        // registro de responsável quando ele realmente não existe (contas
        // legadas), evitando uma segunda consulta em todo login.
        if (publico.perfil === "responsavel" && publico.responsavelId == null) {
            await this.garantirResponsavel(usuario);
            return {
                token,
                usuario: await this.montarUsuarioPublico(usuario)
            };
        }

        return { token, usuario: publico };
    }

    async registrar({ nome, email, senha, perfil, codigoConvite }) {
        const perfilNormalizado = perfilParaApi(
            perfil || "responsavel"
        );

        const convite = await this.validarConvite(codigoConvite, perfilNormalizado);

        if (!PERFIS_PUBLICOS.includes(perfilNormalizado)) {
            throw new ErroAplicacao(
                "perfil_nao_permitido",
                "O cadastro público cria apenas contas de responsável. Coordenação e professores são cadastrados pela escola.",
                403,
                { perfil: "Use apenas responsavel." }
            );
        }

        const existente = await this.usuarioRepository.buscarPorEmail(email);

        if (existente) {
            throw new ErroAplicacao(
                "email_em_uso",
                "Já existe uma conta com este e-mail.",
                409,
                { email: "Já existe uma conta com este e-mail." }
            );
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        try {
            const usuario = await this.usuarioRepository.criar({
                nome,
                email,
                senhaHash,
                perfil: perfilParaBanco(perfilNormalizado)
            });

            await this.garantirResponsavel(usuario);

            return await this.montarUsuarioPublico(usuario);
        } catch (erro) {
            if (erro && erro.code === "23505") {
                throw new ErroAplicacao(
                    "email_em_uso",
                    "Já existe uma conta com este e-mail.",
                    409,
                    { email: "Já existe uma conta com este e-mail." }
                );
            }

            throw erro;
        }
    }

    async autenticarToken(token) {
        if (!this.tokenService) {
            throw new Error("TokenService não configurado.");
        }

        const conteudo = this.tokenService.verificar(token);
        const usuario = await this.usuarioRepository.buscarPorId(
            Number(conteudo.sub)
        );

        if (!usuario || !usuario.estaAtivo()) {
            throw new ErroAplicacao(
                "token_invalido",
                "Sessão inválida ou expirada. Entre novamente.",
                401
            );
        }

        const publico = await this.montarUsuarioPublico(usuario);

        // O registro em "responsavel" já é garantido no login e no cadastro.
        // Tokens antigos de contas legadas ainda recebem a garantia aqui, sem
        // custo extra no caminho normal (responsavelId já preenchido).
        if (publico.perfil === "responsavel" && publico.responsavelId == null) {
            await this.garantirResponsavel(usuario);
            return await this.montarUsuarioPublico(usuario);
        }

        return publico;
    }
}

module.exports = AutenticacaoService;
