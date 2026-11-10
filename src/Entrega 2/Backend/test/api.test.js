const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const criarApp = require("../src/app");
const Acompanhamento = require("../src/models/Acompanhamento");
const Usuario = require("../src/models/Usuario");
const AdminService = require("../src/services/AdminService");
const AutenticacaoService = require("../src/services/AutenticacaoService");
const AlunoService = require("../src/services/AlunoService");
const AcompanhamentoService = require("../src/services/AcompanhamentoService");
const ProfessorService = require("../src/services/ProfessorService");
const TokenService = require("../src/services/TokenService");

const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";

class BancoFalso {
    constructor() {
        this.usuarios = [];
        this.proximoUsuario = 1;
        this.alunos = [
            {
                idAluno: 1,
                nome: "Lucas Souza",
                dataNascimento: "2014-03-10",
                matricula: "2026001",
                ativo: true
            },
            {
                idAluno: 2,
                nome: "Júlia Souza",
                dataNascimento: "2013-08-22",
                matricula: "2026002",
                ativo: true
            }
        ];
        this.vinculos = [
            {
                id_vinculo: 100,
                id_professor: 10,
                professor: "Carlos Lima",
                email_professor: "carlos@kfka.com",
                matricula_professor: "P001",
                id_turma: 1,
                turma: "6A",
                ano_serie: "6",
                turno: "Manhã",
                id_disciplina: 1,
                disciplina: "Matemática",
                id_ano_letivo: 1,
                ano_letivo: 2026,
                vinculo_ativo: true
            }
        ];
        this.bimestres = [
            { id: 1, numero: 1 },
            { id: 2, numero: 2 },
            { id: 3, numero: 3 }
        ];
        this.acompanhamentos = [
            {
                id_acompanhamento: 500,
                id_aluno: 1,
                aluno: "Lucas Souza",
                matricula_aluno: "2026001",
                id_turma: 1,
                turma: "6A",
                ano_serie: "6",
                turno: "Manhã",
                id_disciplina: 1,
                disciplina: "Matemática",
                id_professor: 10,
                matricula_professor: "P001",
                id_bimestre: 2,
                bimestre: 2,
                id_ano_letivo: 1,
                ano_letivo: 2026,
                descricao: "Relatório já publicado para a família.",
                media: "8.5",
                situacao_media: "APROVADO",
                status: "PUBLICADO",
                data_criacao: new Date("2026-06-01"),
                data_atualizacao: new Date("2026-06-02")
            }
        ];
        this.proximoAcompanhamento = 501;
        this.historicos = [];
    }

    // UsuarioRepository
    async buscarPorEmail(email) {
        return (
            this.usuarios.find(
                (usuario) =>
                    usuario.email.toLowerCase() === String(email).toLowerCase()
            ) || null
        );
    }

    async buscarUsuarioPorId(id) {
        return (
            this.usuarios.find(
                (usuario) => usuario.idUsuario === Number(id)
            ) || null
        );
    }

    async atualizarPerfil(id, { nome, email, telefone }) {
        const usuario = await this.buscarUsuarioPorId(id);

        if (!usuario) return null;

        usuario.nome = nome;
        usuario.email = email;
        usuario.telefone = telefone;

        return usuario;
    }

    async criarUsuario({ nome, email, senhaHash, perfil }) {
        const usuario = new Usuario(
            this.proximoUsuario++,
            nome,
            email,
            senhaHash,
            perfil,
            true,
            new Date(),
            new Date()
        );

        this.usuarios.push(usuario);

        return usuario;
    }

    // ProfessorRepository
    async buscarPorUsuario(idUsuario) {
        if (Number(idUsuario) !== 2) return null;
        return {
            idProfessor: 10,
            idUsuario: 2,
            nome: "Carlos Lima",
            email: "carlos@kfka.com"
        };
    }

    async listarVinculos(idProfessor) {
        return Number(idProfessor) === 10 ? this.vinculos : [];
    }

    async listarProfessores() {
        return [
            {
                id_professor: 10,
                nome: "Carlos Lima",
                email: "carlos@kfka.com",
                matricula: "P001"
            }
        ];
    }

    // ResponsavelRepository
    async buscarResponsavelPorUsuario(idUsuario) {
        if (Number(idUsuario) !== 3) return null;
        return { idResponsavel: 5 };
    }

    // AlunoRepository
    async listarAlunos() {
        return this.alunos;
    }

    async buscarAlunoPorId(id) {
        return (
            this.alunos.find((aluno) => aluno.idAluno === Number(id)) || null
        );
    }

    async listarPorProfessor(idProfessor) {
        return Number(idProfessor) === 10 ? [this.alunos[0]] : [];
    }

    async listarPorResponsavel(idResponsavel) {
        return Number(idResponsavel) === 5 ? [this.alunos[0]] : [];
    }

    async pertenceAoProfessor(idAluno) {
        return Number(idAluno) === 1;
    }

    async pertenceAoResponsavel(idAluno) {
        return Number(idAluno) === 1;
    }

    async verificarMatriculaEmTurma(idAluno, idTurma, idAnoLetivo) {
        return (
            Number(idAluno) === 1 &&
            Number(idTurma) === 1 &&
            Number(idAnoLetivo) === 1
        );
    }

    // AcompanhamentoRepository
    async buscarAcompanhamentoPorId(id) {
        const linha = this.acompanhamentos.find(
            (item) => item.id_acompanhamento === Number(id)
        );

        if (!linha) return null;

        return new Acompanhamento(
            linha.id_acompanhamento,
            linha.id_aluno,
            100,
            linha.id_bimestre,
            linha.descricao,
            linha.media,
            linha.status,
            linha.data_criacao,
            linha.data_atualizacao
        );
    }

    filtrar(filtros = {}) {
        return this.acompanhamentos.filter((linha) => {
            if (
                filtros.idProfessor &&
                linha.id_professor !== Number(filtros.idProfessor)
            ) {
                return false;
            }

            if (
                filtros.idAluno &&
                linha.id_aluno !== Number(filtros.idAluno)
            ) {
                return false;
            }

            if (
                filtros.idBimestre &&
                linha.id_bimestre !== Number(filtros.idBimestre)
            ) {
                return false;
            }

            if (filtros.status && linha.status !== filtros.status) {
                return false;
            }

            if (filtros.idResponsavel) {
                if (Number(filtros.idResponsavel) !== 5) return false;
                if (linha.id_aluno !== 1) return false;
                if (linha.status !== "PUBLICADO") return false;
            }

            return true;
        });
    }

    async listarCompletos(filtros) {
        return this.filtrar(filtros);
    }

    async buscarCompletoPorId(id, filtros = {}) {
        return (
            this.filtrar(filtros).find(
                (linha) => linha.id_acompanhamento === Number(id)
            ) || null
        );
    }

    async existeDuplicado(idAluno, idVinculo, idBimestre) {
        return this.acompanhamentos.some(
            (linha) =>
                linha.id_aluno === Number(idAluno) &&
                linha.id_bimestre === Number(idBimestre)
        );
    }

    async criarAcompanhamento(dados) {
        const id = this.proximoAcompanhamento++;

        this.acompanhamentos.push({
            id_acompanhamento: id,
            id_aluno: dados.idAluno,
            aluno: "Lucas Souza",
            matricula_aluno: "2026001",
            id_turma: 1,
            turma: "6A",
            ano_serie: "6",
            turno: "Manhã",
            id_disciplina: 1,
            disciplina: "Matemática",
            id_professor: 10,
            matricula_professor: "P001",
            id_bimestre: dados.idBimestre,
            bimestre: dados.idBimestre,
            id_ano_letivo: 1,
            ano_letivo: 2026,
            descricao: dados.descricao,
            media: String(dados.media),
            situacao_media: dados.media >= 6 ? "APROVADO" : "RECUPERAÇÃO",
            status: "RASCUNHO",
            data_criacao: new Date(),
            data_atualizacao: new Date()
        });

        return id;
    }

    async atualizarAcompanhamento(id, campos, opcoes) {
        const linha = this.acompanhamentos.find(
            (item) => item.id_acompanhamento === Number(id)
        );

        if (!linha) return null;

        if (campos.descricao !== undefined) linha.descricao = campos.descricao;
        if (campos.media !== undefined) linha.media = String(campos.media);
        if (campos.status !== undefined) linha.status = campos.status;

        if (opcoes && opcoes.registrarHistorico) {
            this.historicos.push({
                id_historico: this.historicos.length + 1,
                usuario: "Carlos Lima",
                perfil: "professor",
                estado_anterior: opcoes.estadoAnterior,
                estado_novo: campos.status,
                data_hora: new Date(),
                observacao: opcoes.observacao
            });
        }

        return this.buscarAcompanhamentoPorId(id);
    }

    async listarHistoricoAcompanhamento() {
        return this.historicos;
    }
}

const banco = new BancoFalso();
let servidor;
let base;

before(async () => {
    const hashAdmin = await bcrypt.hash("Admin@123", 4);
    const hashProf = await bcrypt.hash("Prof@123", 4);
    const hashResp = await bcrypt.hash("Resp@123", 4);

    banco.usuarios.push(
        new Usuario(
            1,
            "Marina Rocha",
            "admin@kfka.com",
            hashAdmin,
            "ADMIN",
            true,
            new Date(),
            new Date()
        ),
        new Usuario(
            2,
            "Carlos Lima",
            "carlos@kfka.com",
            hashProf,
            "PROFESSOR",
            true,
            new Date(),
            new Date()
        ),
        new Usuario(
            3,
            "Ana Souza",
            "ana@kfka.com",
            hashResp,
            "RESPONSAVEL",
            true,
            new Date(),
            new Date()
        )
    );
    banco.proximoUsuario = 4;

    const usuarioRepository = {
        buscarPorEmail: (email) => banco.buscarPorEmail(email),
        buscarPorId: (id) => banco.buscarUsuarioPorId(id),
        criar: (dados) => banco.criarUsuario(dados),
        atualizarPerfil: (id, dados) => banco.atualizarPerfil(id, dados)
    };
    // Professores criados pelo fluxo de convite ficam aqui para que
    // montarUsuarioPublico devolva professorId logo após o cadastro.
    const professoresPorUsuario = new Map();
    const professorRepository = {
        buscarPorUsuario: async (idUsuario) =>
            professoresPorUsuario.get(Number(idUsuario)) ||
            banco.buscarPorUsuario(idUsuario),
        criarPorUsuario: async (idUsuario, matricula) => {
            const registro = {
                idProfessor: 100 + Number(idUsuario),
                idUsuario: Number(idUsuario),
                matricula: matricula || `KFKA-${idUsuario}`
            };

            professoresPorUsuario.set(Number(idUsuario), registro);
            return { idProfessor: registro.idProfessor };
        },
        listarVinculos: (idProfessor) => banco.listarVinculos(idProfessor),
        listar: () => banco.listarProfessores()
    };
    const convites = [];
    let proximoConvite = 1;
    const conviteRepository = {
        buscarPorCodigo: async (codigo) =>
            convites.find((item) => item.codigo === String(codigo).toUpperCase()) ||
            null,
        buscarValido: async (codigo, perfil) => {
            const convite = await conviteRepository.buscarPorCodigo(codigo);

            if (!convite) {
                return {
                    valido: false,
                    motivo: "convite_inexistente",
                    convite: null
                };
            }

            if (convite.usado) {
                return { valido: false, motivo: "convite_ja_usado", convite };
            }

            if (new Date() > convite.dataExpiracao) {
                return { valido: false, motivo: "convite_expirado", convite };
            }

            if (convite.perfil !== perfil) {
                return { valido: false, motivo: "perfil_divergente", convite };
            }

            return { valido: true, motivo: null, convite };
        },
        criar: async (dados) => {
            const convite = {
                idConvite: proximoConvite++,
                codigo: String(dados.codigo).toUpperCase(),
                email: dados.email || null,
                perfil: dados.perfil,
                disciplinaId: dados.disciplinaId || null,
                matricula: dados.matricula || null,
                usado: false,
                dataExpiracao: new Date(dados.dataExpiracao),
                criadoPor: dados.criadoPor,
                dataCriacao: new Date()
            };

            convites.push(convite);
            return convite;
        },
        reservar: async (idConvite) => {
            const convite = convites.find(
                (item) => item.idConvite === Number(idConvite)
            );

            if (!convite || convite.usado) return null;

            convite.usado = true;
            return convite;
        },
        liberar: async (idConvite) => {
            const convite = convites.find(
                (item) => item.idConvite === Number(idConvite)
            );

            if (!convite) return false;

            convite.usado = false;
            return true;
        },
        excluir: async (idConvite) => {
            const indice = convites.findIndex(
                (item) => item.idConvite === Number(idConvite)
            );

            if (indice < 0) return false;

            convites.splice(indice, 1);
            return true;
        },
        listar: async ({ perfil, usado } = {}) =>
            convites.filter(
                (item) =>
                    (perfil === undefined || item.perfil === perfil) &&
                    (usado === undefined || item.usado === usado)
            ),
        contar: async (filtros) => (await conviteRepository.listar(filtros)).length
    };
    const responsaveisCriados = new Map();
    const responsavelRepository = {
        buscarPorUsuario: async (idUsuario) =>
            (await banco.buscarResponsavelPorUsuario(idUsuario)) ||
            responsaveisCriados.get(Number(idUsuario)) ||
            null,
        criarPorUsuario: async (idUsuario) => {
            const registro = { idResponsavel: 50 + Number(idUsuario) };
            responsaveisCriados.set(Number(idUsuario), registro);
            return registro;
        }
    };
    const alunoRepository = {
        listarAlunos: () => banco.listarAlunos(),
        buscarPorId: (id) => banco.buscarAlunoPorId(id),
        listarPorProfessor: (id) => banco.listarPorProfessor(id),
        listarPorResponsavel: (id) => banco.listarPorResponsavel(id),
        pertenceAoProfessor: (id) => banco.pertenceAoProfessor(id),
        pertenceAoResponsavel: (id) => banco.pertenceAoResponsavel(id),
        verificarMatriculaEmTurma: (idAluno, idTurma, idAnoLetivo) =>
            banco.verificarMatriculaEmTurma(
                idAluno,
                idTurma,
                idAnoLetivo
            )
    };
    const acompanhamentoRepository = {
        buscarPorId: (id) => banco.buscarAcompanhamentoPorId(id),
        listarCompletos: (filtros) => banco.listarCompletos(filtros),
        buscarCompletoPorId: (id, filtros) =>
            banco.buscarCompletoPorId(id, filtros),
        existeDuplicado: (idAluno, idVinculo, idBimestre) =>
            banco.existeDuplicado(idAluno, idVinculo, idBimestre),
        criar: (dados) => banco.criarAcompanhamento(dados),
        atualizar: (id, campos, opcoes) =>
            banco.atualizarAcompanhamento(id, campos, opcoes),
        listarHistorico: (id) => banco.listarHistoricoAcompanhamento(id)
    };
    const bimestreRepository = {
        listar: () => banco.bimestres,
        buscarPorId: (id) =>
            banco.bimestres.find((bimestre) => bimestre.id === Number(id)) ||
            null
    };

    const tokenService = new TokenService(SEGREDO, "1h");
    const autenticacaoService = new AutenticacaoService(
        usuarioRepository,
        tokenService,
        {
            professorRepository,
            responsavelRepository,
            conviteRepository
        }
    );
    const alunoService = new AlunoService(alunoRepository);
    const acompanhamentoService = new AcompanhamentoService(
        acompanhamentoRepository,
        professorRepository,
        { alunoRepository, bimestreRepository }
    );
    const professorService = new ProfessorService(professorRepository);

    let professorAdminCriado = null;

    const adminRepository = {
        listarAlunos: async () =>
            banco.alunos.map((aluno) => ({
                id_aluno: aluno.idAluno,
                nome: aluno.nome,
                data_nascimento: aluno.dataNascimento,
                matricula: aluno.matricula,
                ativo: aluno.ativo,
                id_turma: 1,
                turma: "6A"
            })),
        buscarAluno: async (id) => {
            const aluno = banco.alunos.find(
                (item) => item.idAluno === Number(id)
            );

            if (!aluno) return null;

            return {
                id_aluno: aluno.idAluno,
                nome: aluno.nome,
                data_nascimento: aluno.dataNascimento,
                matricula: aluno.matricula,
                ativo: aluno.ativo
            };
        },
        buscarAlunoPorMatricula: async (matricula, ignorarId = null) => {
            const aluno = banco.alunos.find(
                (item) =>
                    item.matricula.toLowerCase() ===
                        String(matricula).toLowerCase() &&
                    Number(item.idAluno) !== Number(ignorarId)
            );

            return aluno ? { id_aluno: aluno.idAluno } : null;
        },
        criarAluno: async (dados) => {
            const id =
                Math.max(...banco.alunos.map((aluno) => aluno.idAluno)) + 1;

            banco.alunos.push({
                idAluno: id,
                nome: dados.nome,
                dataNascimento: dados.dataNascimento,
                matricula: dados.matricula,
                ativo: dados.ativo === undefined ? true : dados.ativo
            });

            return id;
        },
        buscarUsuarioPorEmail: async (email) => {
            const usuario = banco.usuarios.find(
                (item) =>
                    item.email.toLowerCase() === String(email).toLowerCase()
            );

            return usuario
                ? { id_usuario: usuario.idUsuario, email: usuario.email }
                : null;
        },
        buscarProfessorPorMatricula: async () => null,
        criarProfessor: async (dados) => {
            const usuario = await banco.criarUsuario({
                ...dados,
                perfil: "PROFESSOR"
            });

            professorAdminCriado = {
                id_professor: 99,
                id_usuario: usuario.idUsuario,
                nome: dados.nome,
                email: dados.email,
                matricula: dados.matricula,
                ativo: true
            };

            return { idUsuario: usuario.idUsuario, idProfessor: 99 };
        },
        buscarProfessor: async (id) =>
            Number(id) === 99 ? professorAdminCriado : null
    };

    const adminService = new AdminService(
        adminRepository,
        acompanhamentoService,
        conviteRepository
    );

    const app = criarApp({
        autenticacaoService,
        alunoService,
        acompanhamentoService,
        professorService,
        adminService,
        bimestreRepository,
        config: {
            corsOrigin: "http://localhost:5173",
            frontendDist: "/diretorio-que-nao-existe"
        }
    });

    await new Promise((resolver) => {
        servidor = app.listen(0, resolver);
    });

    base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
    await new Promise((resolver) => servidor.close(resolver));
});

async function requisitar(caminho, opcoes = {}) {
    const resposta = await fetch(`${base}${caminho}`, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...(opcoes.headers || {})
        }
    });

    const corpo = await resposta.json();

    return { status: resposta.status, corpo };
}

async function login(email, senha, perfil) {
    const resposta = await requisitar("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha, perfil })
    });

    assert.equal(resposta.status, 200);
    return resposta.corpo.dados.token;
}

test("GET /api/status é público", async () => {
    const resposta = await requisitar("/api/status");

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.dados.status, "Funcionando");
});

test("rota protegida exige token", async () => {
    const resposta = await requisitar("/api/alunos");

    assert.equal(resposta.status, 401);
    assert.equal(resposta.corpo.erro.codigo, "token_ausente");
});

test("perfil gravado em maiúsculas é normalizado na API", async () => {
    const resposta = await requisitar("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: "admin@kfka.com",
            senha: "Admin@123",
            perfil: "administrador"
        })
    });

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.dados.usuario.perfil, "administrador");

    const token = resposta.corpo.dados.token;
    const me = await requisitar("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(me.status, 200);
    assert.equal(me.corpo.dados.usuario.perfil, "administrador");
});

test("usuário atualiza o próprio perfil e o telefone persiste", async () => {
    const token = await login("carlos@kfka.com", "Prof@123", "professor");
    const resposta = await requisitar("/api/auth/perfil", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            nome: "Carlos Lima",
            email: "carlos@kfka.com",
            telefone: "(11) 98888-7777"
        })
    });

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.dados.usuario.telefone, "(11) 98888-7777");

    const me = await requisitar("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(me.status, 200);
    assert.equal(me.corpo.dados.usuario.telefone, "(11) 98888-7777");
});

test("administrador lista todos os alunos", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");
    const resposta = await requisitar("/api/alunos", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.dados.length, 2);
    assert.equal(resposta.corpo.dados[0].senhaHash, undefined);
});

test("cadastro cria responsável, grava hash e permite login", async () => {
    const cadastro = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Novo Responsável",
            email: "novo@kfka.com",
            senha: "Senha@123",
            perfil: "responsavel"
        })
    });

    assert.equal(cadastro.status, 201);
    assert.equal(cadastro.corpo.dados.usuario.email, "novo@kfka.com");
    assert.ok(cadastro.corpo.dados.usuario.responsavelId);

    const salvo = banco.usuarios.find(
        (usuario) => usuario.email === "novo@kfka.com"
    );
    assert.notEqual(salvo.senhaHash, "Senha@123");
    assert.equal(await bcrypt.compare("Senha@123", salvo.senhaHash), true);

    const token = await login("novo@kfka.com", "Senha@123", "responsavel");
    assert.ok(token);
});

test("cadastro duplicado retorna 409", async () => {
    const resposta = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Outra Pessoa",
            email: "novo@kfka.com",
            senha: "Senha@123"
        })
    });

    assert.equal(resposta.status, 409);
    assert.equal(resposta.corpo.erro.codigo, "email_em_uso");
});

test("cadastro público de administrador é bloqueado", async () => {
    const resposta = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Administrador Indevido",
            email: "invasor@kfka.com",
            senha: "Senha@123",
            perfil: "administrador"
        })
    });

    assert.equal(resposta.status, 403);
    assert.equal(resposta.corpo.erro.codigo, "perfil_nao_permitido");
});

test("login no perfil errado retorna 403 com o perfil correto", async () => {
    const resposta = await requisitar("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: "carlos@kfka.com",
            senha: "Prof@123",
            perfil: "responsavel"
        })
    });

    assert.equal(resposta.status, 403);
    assert.equal(resposta.corpo.erro.codigo, "outro_perfil");
    assert.equal(resposta.corpo.erro.detalhes.perfil, "professor");
});

test("responsável recebe apenas acompanhamentos publicados", async () => {
    const token = await login("ana@kfka.com", "Resp@123", "responsavel");
    const resposta = await requisitar("/api/acompanhamentos", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.dados.length, 1);
    assert.equal(resposta.corpo.dados[0].status, "publicado");
});

test("professor cria, detalha e envia acompanhamento", async () => {
    const token = await login("carlos@kfka.com", "Prof@123", "professor");

    const criacao = await requisitar("/api/acompanhamentos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            idAluno: 1,
            idVinculo: 100,
            idBimestre: 3,
            descricao: "Participou ativamente das atividades do bimestre.",
            media: 8.2
        })
    });

    assert.equal(criacao.status, 201);
    assert.equal(criacao.corpo.dados.status, "rascunho");

    const id = criacao.corpo.dados.id;
    const envio = await requisitar(`/api/acompanhamentos/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "enviado" })
    });

    assert.equal(envio.status, 200);
    assert.equal(envio.corpo.dados.status, "enviado");
    assert.equal(banco.historicos.length, 1);

    const detalhe = await requisitar(`/api/acompanhamentos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.corpo.dados.aluno.nome, "Lucas Souza");
});

test("validação devolve 422 com detalhes por campo", async () => {
    const token = await login("carlos@kfka.com", "Prof@123", "professor");

    const resposta = await requisitar("/api/acompanhamentos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            idAluno: 1,
            idVinculo: 100,
            idBimestre: 3,
            descricao: "Curta",
            media: 11
        })
    });

    assert.equal(resposta.status, 422);
    assert.equal(resposta.corpo.erro.codigo, "dados_invalidos");
    assert.ok(resposta.corpo.erro.detalhes.descricao);
    assert.ok(resposta.corpo.erro.detalhes.media);
});

test("professor vê os próprios vínculos", async () => {
    const token = await login("carlos@kfka.com", "Prof@123", "professor");
    const resposta = await requisitar("/api/professores/me/vinculos", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(resposta.status, 200);
    assert.equal(resposta.corpo.dados[0].turma.nome, "6A");
});

test("rotas administrativas exigem perfil administrador", async () => {
    const token = await login("carlos@kfka.com", "Prof@123", "professor");

    const resposta = await requisitar("/api/admin/alunos", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(resposta.status, 403);
    assert.equal(resposta.corpo.erro.codigo, "acesso_negado");
});

test("administrador lista e cria alunos pelo backoffice", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");

    const lista = await requisitar("/api/admin/alunos", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(lista.status, 200);
    assert.equal(lista.corpo.dados.length, 2);

    const criado = await requisitar("/api/admin/alunos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            nome: "Aluno do Backoffice",
            dataNascimento: "2015-01-20",
            matricula: "2026999"
        })
    });

    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.dados.nome, "Aluno do Backoffice");
    assert.equal(criado.corpo.dados.matricula, "2026999");

    const detalhe = await requisitar(
        `/api/admin/alunos/${criado.corpo.dados.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    assert.equal(detalhe.status, 200);
    assert.equal(detalhe.corpo.dados.id, criado.corpo.dados.id);
});

test("backoffice valida campos e impede matrícula duplicada", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");

    const invalido = await requisitar("/api/admin/alunos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nome: "A" })
    });

    assert.equal(invalido.status, 422);
    assert.ok(invalido.corpo.erro.detalhes.dataNascimento);
    assert.ok(invalido.corpo.erro.detalhes.matricula);

    const duplicado = await requisitar("/api/admin/alunos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            nome: "Outro Aluno",
            dataNascimento: "2015-02-10",
            matricula: "2026001"
        })
    });

    assert.equal(duplicado.status, 409);
    assert.equal(duplicado.corpo.erro.codigo, "registro_duplicado");
    assert.ok(duplicado.corpo.erro.detalhes.matricula);
});

test("administrador cria professor que consegue autenticar", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");

    const criado = await requisitar("/api/admin/professores", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            nome: "Novo Professor",
            email: "novo.professor@kfka.com",
            senha: "Senha@123",
            matricula: "PROF999"
        })
    });

    assert.equal(criado.status, 201);
    assert.equal(criado.corpo.dados.email, "novo.professor@kfka.com");

    const autenticado = await requisitar("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: "novo.professor@kfka.com",
            senha: "Senha@123",
            perfil: "professor"
        })
    });

    assert.equal(autenticado.status, 200);
    assert.equal(autenticado.corpo.dados.usuario.perfil, "professor");
    assert.equal(autenticado.corpo.dados.usuario.senhaHash, undefined);
});

test("administrador gera convite e professor cria a própria conta", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");

    const conviteCriado = await requisitar("/api/admin/convites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            perfil: "professor",
            email: "professor.convite@kfka.com",
            matricula: "PROF900",
            diasValidade: 7
        })
    });

    assert.equal(conviteCriado.status, 201);

    const convite = conviteCriado.corpo.dados;
    assert.match(convite.codigo, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    assert.equal(convite.perfil, "professor");
    assert.equal(convite.matricula, "PROF900");
    assert.equal(convite.usado, false);

    const cadastro = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Professor Convidado",
            email: "professor.convite@kfka.com",
            senha: "Senha@123",
            perfil: "professor",
            codigoConvite: convite.codigo
        })
    });

    assert.equal(cadastro.status, 201);
    assert.equal(cadastro.corpo.dados.usuario.perfil, "professor");
    assert.ok(cadastro.corpo.dados.usuario.professorId);

    const tokenProfessor = await login(
        "professor.convite@kfka.com",
        "Senha@123",
        "professor"
    );
    assert.ok(tokenProfessor);

    const repetido = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Outra Pessoa",
            email: "outra.pessoa@kfka.com",
            senha: "Senha@123",
            perfil: "professor",
            codigoConvite: convite.codigo
        })
    });

    assert.equal(repetido.status, 403);
    assert.equal(repetido.corpo.erro.codigo, "convite_invalido");
    assert.equal(repetido.corpo.erro.detalhes.codigo, "convite_ja_usado");

    const lista = await requisitar("/api/admin/convites?perfil=professor", {
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(lista.status, 200);
    assert.ok(
        lista.corpo.dados.dados.some(
            (item) => item.id === convite.id && item.usado
        )
    );
});

test("convite de e-mail específico só vale para o endereço informado", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");

    const conviteCriado = await requisitar("/api/admin/convites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            perfil: "professor",
            email: "titular@kfka.com"
        })
    });

    const codigo = conviteCriado.corpo.dados.codigo;

    const recusado = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Pessoa Errada",
            email: "invasor@kfka.com",
            senha: "Senha@123",
            perfil: "professor",
            codigoConvite: codigo
        })
    });

    assert.equal(recusado.status, 403);
    assert.equal(recusado.corpo.erro.codigo, "convite_invalido");
    assert.equal(recusado.corpo.erro.detalhes.codigo, "email_divergente");

    // O convite continua disponível para o titular.
    const aceito = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Pessoa Titular",
            email: "titular@kfka.com",
            senha: "Senha@123",
            perfil: "professor",
            codigoConvite: codigo
        })
    });

    assert.equal(aceito.status, 201);
    assert.ok(aceito.corpo.dados.usuario.professorId);
});

test("cadastro de professor sem convite é bloqueado", async () => {
    const resposta = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Professor Sem Código",
            email: "sem.convite@kfka.com",
            senha: "Senha@123",
            perfil: "professor"
        })
    });

    assert.equal(resposta.status, 403);
    assert.equal(resposta.corpo.erro.codigo, "perfil_nao_permitido");
});

test("administrador revoga convite e o código deixa de valer", async () => {
    const token = await login("admin@kfka.com", "Admin@123", "administrador");

    const conviteCriado = await requisitar("/api/admin/convites", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ perfil: "professor" })
    });

    const convite = conviteCriado.corpo.dados;

    const revogado = await requisitar(`/api/admin/convites/${convite.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(revogado.status, 200);
    assert.equal(revogado.corpo.dados.revogado, true);

    const cadastro = await requisitar("/api/auth/registro", {
        method: "POST",
        body: JSON.stringify({
            nome: "Professor Revogado",
            email: "revogado@kfka.com",
            senha: "Senha@123",
            perfil: "professor",
            codigoConvite: convite.codigo
        })
    });

    assert.equal(cadastro.status, 403);
    assert.equal(cadastro.corpo.erro.codigo, "convite_invalido");
    assert.equal(cadastro.corpo.erro.detalhes.codigo, "convite_inexistente");
});
