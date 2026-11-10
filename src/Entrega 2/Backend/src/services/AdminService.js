const bcrypt = require("bcryptjs");
const { randomInt } = require("crypto");

const ErroAplicacao = require("../errors/ErroAplicacao");
const { perfilParaApi } = require("../utils/perfil");

const CUSTO_HASH = 12;

function naoEncontrado(recurso, mensagem) {
    return new ErroAplicacao(
        `${recurso}_nao_encontrado`,
        mensagem,
        404
    );
}

function conflito(campo, mensagem, codigo = "registro_duplicado") {
    return new ErroAplicacao(codigo, mensagem, 409, {
        [campo]: mensagem
    });
}

function mapearAluno(linha) {
    return {
        id: linha.id_aluno,
        nome: linha.nome,
        dataNascimento: linha.data_nascimento,
        matricula: linha.matricula,
        ativo: linha.ativo,
        idTurma: linha.id_turma ?? null,
        turma: linha.turma ?? null
    };
}

function mapearProfessor(linha) {
    return {
        id: linha.id_professor,
        idUsuario: linha.id_usuario,
        nome: linha.nome,
        email: linha.email,
        matricula: linha.matricula,
        ativo: linha.ativo,
        totalVinculos:
            linha.total_vinculos === undefined
                ? undefined
                : Number(linha.total_vinculos)
    };
}

function mapearResponsavel(linha) {
    return {
        id: linha.id_responsavel,
        idUsuario: linha.id_usuario,
        nome: linha.nome,
        email: linha.email,
        telefone: linha.telefone,
        ativo: linha.ativo,
        totalAlunos:
            linha.total_alunos === undefined
                ? undefined
                : Number(linha.total_alunos),
        alunos:
            linha.alunos === undefined
                ? undefined
                : linha.alunos
    };
}

function mapearTurma(linha) {
    return {
        id: linha.id_turma,
        nome: linha.nome,
        anoSerie: linha.ano_serie,
        turno: linha.turno,
        ativo: linha.ativo,
        totalAlunos:
            linha.total_alunos === undefined
                ? undefined
                : Number(linha.total_alunos)
    };
}

function mapearArea(linha) {
    return {
        id: linha.id_area,
        nome: linha.nome,
        descricao: linha.descricao,
        ativo: linha.ativo
    };
}

function mapearDisciplina(linha) {
    return {
        id: linha.id_disciplina,
        idArea: linha.id_area,
        area: linha.area,
        nome: linha.nome,
        descricao: linha.descricao,
        ativo: linha.ativo
    };
}

function mapearVinculo(linha) {
    return {
        id: linha.id_vinculo,
        idTurma: linha.id_turma,
        turma: linha.turma,
        anoSerie: linha.ano_serie,
        turno: linha.turno,
        idDisciplina: linha.id_disciplina,
        disciplina: linha.disciplina,
        idProfessor: linha.id_professor,
        professor: linha.professor,
        idAnoLetivo: linha.id_ano_letivo,
        anoLetivo: linha.ano_letivo,
        ativo: linha.ativo
    };
}

function mapearAnoLetivo(linha) {
    return {
        id: linha.id_ano_letivo,
        ano: linha.ano,
        dataInicio: linha.data_inicio,
        dataFim: linha.data_fim,
        ativo: linha.ativo
    };
}

function mapearBimestre(linha) {
    return {
        id: linha.id_bimestre,
        idAnoLetivo: linha.id_ano_letivo,
        anoLetivo: linha.ano_letivo,
        numero: linha.numero,
        dataInicio: linha.data_inicio,
        dataFim: linha.data_fim,
        horaInicio: linha.hora_inicio,
        horaFim: linha.hora_fim
    };
}

class AdminService {
    constructor(adminRepository, acompanhamentoService = null, conviteRepository = null) {
        this.adminRepository = adminRepository;
        this.acompanhamentoService = acompanhamentoService;
        this.conviteRepository = conviteRepository;
    }

    // =====================================================
    // AUXILIARES
    // =====================================================

    exigirDataFimPosterior(dataInicio, dataFim, campo = "dataFim") {
        if (dataInicio && dataFim && dataFim <= dataInicio) {
            throw new ErroAplicacao(
                "datas_invalidas",
                "A data de fim deve ser posterior à data de início.",
                422,
                { [campo]: "A data de fim deve ser posterior à data de início." }
            );
        }
    }

    exigirHorarioFimPosterior(horaInicio, horaFim, campo = "horaFim") {
        if (horaInicio && horaFim && horaFim <= horaInicio) {
            throw new ErroAplicacao(
                "horarios_invalidos",
                "O horário de fim deve ser posterior ao horário de início.",
                422,
                {
                    [campo]:
                        "O horário de fim deve ser posterior ao horário de início."
                }
            );
        }
    }

    async exigirAluno(idAluno) {
        const aluno = await this.adminRepository.buscarAluno(idAluno);

        if (!aluno) {
            throw naoEncontrado("aluno", "Aluno não encontrado.");
        }

        return aluno;
    }

    async exigirProfessor(idProfessor) {
        const professor =
            await this.adminRepository.buscarProfessor(idProfessor);

        if (!professor) {
            throw naoEncontrado("professor", "Professor não encontrado.");
        }

        return professor;
    }

    async exigirResponsavel(idResponsavel) {
        const responsavel =
            await this.adminRepository.buscarResponsavel(idResponsavel);

        if (!responsavel) {
            throw naoEncontrado(
                "responsavel",
                "Responsável não encontrado."
            );
        }

        return responsavel;
    }

    async exigirTurma(idTurma) {
        const turma = await this.adminRepository.buscarTurma(idTurma);

        if (!turma) {
            throw naoEncontrado("turma", "Turma não encontrada.");
        }

        return turma;
    }

    async exigirArea(idArea) {
        const area = await this.adminRepository.buscarArea(idArea);

        if (!area) {
            throw naoEncontrado("area", "Área não encontrada.");
        }

        return area;
    }

    async exigirDisciplina(idDisciplina) {
        const disciplina =
            await this.adminRepository.buscarDisciplina(idDisciplina);

        if (!disciplina) {
            throw naoEncontrado("disciplina", "Disciplina não encontrada.");
        }

        return disciplina;
    }

    async exigirAnoLetivo(idAnoLetivo) {
        const anoLetivo =
            await this.adminRepository.buscarAnoLetivo(idAnoLetivo);

        if (!anoLetivo) {
            throw naoEncontrado(
                "ano_letivo",
                "Ano letivo não encontrado."
            );
        }

        return anoLetivo;
    }

    async exigirBimestre(idBimestre) {
        const bimestre =
            await this.adminRepository.buscarBimestre(idBimestre);

        if (!bimestre) {
            throw naoEncontrado("bimestre", "Bimestre não encontrado.");
        }

        return bimestre;
    }

    async exigirVinculo(idVinculo) {
        const vinculo =
            await this.adminRepository.buscarVinculo(idVinculo);

        if (!vinculo) {
            throw naoEncontrado("vinculo", "Vínculo não encontrado.");
        }

        return vinculo;
    }

    async verificarEmailDisponivel(email, ignorarIdUsuario = null) {
        if (!email) return;

        const existente =
            await this.adminRepository.buscarUsuarioPorEmail(email);

        if (
            existente &&
            Number(existente.id_usuario) !== Number(ignorarIdUsuario)
        ) {
            throw conflito(
                "email",
                "Já existe uma conta com este e-mail."
            );
        }
    }

    // =====================================================
    // ALUNOS
    // =====================================================

    async listarAlunos(filtros) {
        const linhas = await this.adminRepository.listarAlunos(filtros);
        return linhas.map(mapearAluno);
    }

    async obterAluno(idAluno) {
        const aluno = await this.exigirAluno(idAluno);
        return mapearAluno(aluno);
    }

    async criarAluno(dados) {
        const matricula = String(dados.matricula || "").trim();
        const existente =
            await this.adminRepository.buscarAlunoPorMatricula(matricula);

        if (existente) {
            throw conflito(
                "matricula",
                "Já existe um aluno com esta matrícula."
            );
        }

        const idAluno = await this.adminRepository.criarAluno({
            ...dados,
            matricula
        });

        return await this.obterAluno(idAluno);
    }

    async atualizarAluno(idAluno, dados) {
        await this.exigirAluno(idAluno);

        if (dados.matricula !== undefined) {
            const matricula = String(dados.matricula).trim();
            const existente =
                await this.adminRepository.buscarAlunoPorMatricula(
                    matricula,
                    idAluno
                );

            if (existente) {
                throw conflito(
                    "matricula",
                    "Já existe um aluno com esta matrícula."
                );
            }

            dados.matricula = matricula;
        }

        await this.adminRepository.atualizarAluno(idAluno, dados);
        return await this.obterAluno(idAluno);
    }

    async definirAtivoAluno(idAluno, ativo) {
        await this.exigirAluno(idAluno);
        await this.adminRepository.definirAtivoAluno(idAluno, ativo);
        return await this.obterAluno(idAluno);
    }

    async listarResponsaveisDoAluno(idAluno) {
        await this.exigirAluno(idAluno);

        const linhas =
            await this.adminRepository.listarResponsaveisDoAluno(idAluno);

        return linhas.map((linha) => ({
            id: linha.id_responsavel,
            nome: linha.nome,
            email: linha.email,
            telefone: linha.telefone,
            tipoRelacao: linha.tipo_relacao,
            autorizado: linha.autorizado,
            dataVinculo: linha.data_vinculo
        }));
    }

    async vincularResponsavel(idAluno, dados) {
        await this.exigirAluno(idAluno);
        await this.exigirResponsavel(dados.idResponsavel);

        const vinculo = await this.adminRepository.vincularResponsavel(
            idAluno,
            dados.idResponsavel,
            dados.tipoRelacao || null
        );

        return {
            idAluno: vinculo.id_aluno,
            idResponsavel: vinculo.id_responsavel,
            tipoRelacao: vinculo.tipo_relacao,
            autorizado: vinculo.autorizado
        };
    }

    async desvincularResponsavel(idAluno, idResponsavel) {
        await this.exigirAluno(idAluno);

        const removido =
            await this.adminRepository.desvincularResponsavel(
                idAluno,
                idResponsavel
            );

        if (!removido) {
            throw naoEncontrado(
                "vinculo",
                "Este responsável não está vinculado ao aluno."
            );
        }

        return { idAluno, idResponsavel };
    }

    async listarMatriculasDoAluno(idAluno) {
        await this.exigirAluno(idAluno);

        const linhas =
            await this.adminRepository.listarMatriculasDoAluno(idAluno);

        return linhas.map((linha) => ({
            idTurma: linha.id_turma,
            turma: linha.turma,
            idAnoLetivo: linha.id_ano_letivo,
            anoLetivo: linha.ano_letivo,
            dataInicio: linha.data_inicio,
            dataFim: linha.data_fim,
            ativo: linha.ativo
        }));
    }

    async matricularAluno(idAluno, dados) {
        await this.exigirAluno(idAluno);
        await this.exigirTurma(dados.idTurma);
        await this.exigirAnoLetivo(dados.idAnoLetivo);

        const matricula = await this.adminRepository.matricularAluno({
            idAluno,
            idTurma: dados.idTurma,
            idAnoLetivo: dados.idAnoLetivo,
            dataInicio: dados.dataInicio
        });

        return {
            idAluno: matricula.id_aluno,
            idTurma: matricula.id_turma,
            idAnoLetivo: matricula.id_ano_letivo,
            dataInicio: matricula.data_inicio,
            ativo: matricula.ativo
        };
    }

    async desmatricularAluno(idAluno, idTurma, idAnoLetivo) {
        await this.exigirAluno(idAluno);

        const removida =
            await this.adminRepository.desmatricularAluno(
                idAluno,
                idTurma,
                idAnoLetivo
            );

        if (!removida) {
            throw naoEncontrado(
                "matricula",
                "Matrícula não encontrada para este aluno, turma e ano letivo."
            );
        }

        return {
            idAluno,
            idTurma,
            idAnoLetivo
        };
    }

    // =====================================================
    // PROFESSORES
    // =====================================================

    async listarProfessores() {
        const linhas = await this.adminRepository.listarProfessores();
        return linhas.map(mapearProfessor);
    }

    async obterProfessor(idProfessor) {
        const professor = await this.exigirProfessor(idProfessor);
        return mapearProfessor(professor);
    }

    async criarProfessor(dados) {
        await this.verificarEmailDisponivel(dados.email);

        const matricula = String(dados.matricula || "").trim();
        const existente =
            await this.adminRepository.buscarProfessorPorMatricula(matricula);

        if (existente) {
            throw conflito(
                "matricula",
                "Já existe um professor com esta matrícula."
            );
        }

        const senhaHash = await bcrypt.hash(dados.senha, CUSTO_HASH);

        const criado = await this.adminRepository.criarProfessor({
            nome: dados.nome,
            email: dados.email,
            matricula,
            senhaHash
        });

        return await this.obterProfessor(criado.idProfessor);
    }

    async atualizarProfessor(idProfessor, dados) {
        const atual = await this.exigirProfessor(idProfessor);

        if (dados.email !== undefined) {
            await this.verificarEmailDisponivel(
                dados.email,
                atual.id_usuario
            );
        }

        if (dados.matricula !== undefined) {
            const matricula = String(dados.matricula).trim();
            const existente =
                await this.adminRepository.buscarProfessorPorMatricula(
                    matricula,
                    idProfessor
                );

            if (existente) {
                throw conflito(
                    "matricula",
                    "Já existe um professor com esta matrícula."
                );
            }

            dados.matricula = matricula;
        }

        if (dados.senha !== undefined) {
            dados.senhaHash = await bcrypt.hash(dados.senha, CUSTO_HASH);
            delete dados.senha;
        }

        await this.adminRepository.atualizarProfessor(idProfessor, dados);
        return await this.obterProfessor(idProfessor);
    }

    async definirAtivoProfessor(idProfessor, ativo) {
        await this.exigirProfessor(idProfessor);
        await this.adminRepository.definirAtivoProfessor(
            idProfessor,
            ativo
        );
        return await this.obterProfessor(idProfessor);
    }

    // =====================================================
    // RESPONSÁVEIS
    // =====================================================

    async listarResponsaveis() {
        const linhas = await this.adminRepository.listarResponsaveis();
        return linhas.map(mapearResponsavel);
    }

    async obterResponsavel(idResponsavel) {
        const responsavel = await this.exigirResponsavel(idResponsavel);
        return mapearResponsavel(responsavel);
    }

    async criarResponsavel(dados) {
        await this.verificarEmailDisponivel(dados.email);

        const senhaHash = await bcrypt.hash(dados.senha, CUSTO_HASH);

        const criado = await this.adminRepository.criarResponsavel({
            nome: dados.nome,
            email: dados.email,
            telefone: dados.telefone,
            senhaHash
        });

        return await this.obterResponsavel(criado.idResponsavel);
    }

    async atualizarResponsavel(idResponsavel, dados) {
        const atual = await this.exigirResponsavel(idResponsavel);

        if (dados.email !== undefined) {
            await this.verificarEmailDisponivel(
                dados.email,
                atual.id_usuario
            );
        }

        if (dados.senha !== undefined) {
            dados.senhaHash = await bcrypt.hash(dados.senha, CUSTO_HASH);
            delete dados.senha;
        }

        await this.adminRepository.atualizarResponsavel(
            idResponsavel,
            dados
        );

        return await this.obterResponsavel(idResponsavel);
    }

    async definirAtivoResponsavel(idResponsavel, ativo) {
        await this.exigirResponsavel(idResponsavel);
        await this.adminRepository.definirAtivoResponsavel(
            idResponsavel,
            ativo
        );
        return await this.obterResponsavel(idResponsavel);
    }

    async listarAlunosDoResponsavel(idResponsavel) {
        await this.exigirResponsavel(idResponsavel);

        const linhas =
            await this.adminRepository.listarAlunosDoResponsavel(
                idResponsavel
            );

        return linhas.map((linha) => ({
            id: linha.id_aluno,
            nome: linha.nome,
            matricula: linha.matricula,
            ativo: linha.ativo,
            tipoRelacao: linha.tipo_relacao,
            autorizado: linha.autorizado
        }));
    }

    // =====================================================
    // TURMAS
    // =====================================================

    async listarTurmas() {
        const linhas = await this.adminRepository.listarTurmas();
        return linhas.map(mapearTurma);
    }

    async obterTurma(idTurma) {
        const turma = await this.exigirTurma(idTurma);
        return mapearTurma(turma);
    }

    async criarTurma(dados) {
        const idTurma = await this.adminRepository.criarTurma(dados);
        return await this.obterTurma(idTurma);
    }

    async atualizarTurma(idTurma, dados) {
        await this.exigirTurma(idTurma);
        await this.adminRepository.atualizarTurma(idTurma, dados);
        return await this.obterTurma(idTurma);
    }

    async definirAtivoTurma(idTurma, ativo) {
        await this.exigirTurma(idTurma);
        await this.adminRepository.definirAtivoTurma(idTurma, ativo);
        return await this.obterTurma(idTurma);
    }

    async listarAlunosDaTurma(idTurma, idAnoLetivo) {
        await this.exigirTurma(idTurma);

        const linhas = await this.adminRepository.listarAlunosDaTurma(
            idTurma,
            idAnoLetivo
        );

        return linhas.map((linha) => ({
            id: linha.id_aluno,
            nome: linha.nome,
            matricula: linha.matricula,
            ativo: linha.ativo,
            idAnoLetivo: linha.id_ano_letivo,
            anoLetivo: linha.ano_letivo,
            dataInicio: linha.data_inicio,
            dataFim: linha.data_fim,
            matriculaAtiva: linha.matricula_ativa
        }));
    }

    async listarVinculosDaTurma(idTurma) {
        await this.exigirTurma(idTurma);

        const linhas =
            await this.adminRepository.listarVinculosDaTurma(idTurma);

        return linhas.map(mapearVinculo);
    }

    // =====================================================
    // TAGS
    // =====================================================

    async listarTags() {
        return await this.adminRepository.listarTags();
    }

    // =====================================================
    // ÁREAS
    // =====================================================

    async listarAreas() {
        const linhas = await this.adminRepository.listarAreas();
        return linhas.map(mapearArea);
    }

    async obterArea(idArea) {
        const area = await this.exigirArea(idArea);
        return mapearArea(area);
    }

    async criarArea(dados) {
        const idArea = await this.adminRepository.criarArea(dados);
        return await this.obterArea(idArea);
    }

    async atualizarArea(idArea, dados) {
        await this.exigirArea(idArea);
        await this.adminRepository.atualizarArea(idArea, dados);
        return await this.obterArea(idArea);
    }

    async definirAtivoArea(idArea, ativo) {
        await this.exigirArea(idArea);
        await this.adminRepository.definirAtivoArea(idArea, ativo);
        return await this.obterArea(idArea);
    }

    // =====================================================
    // DISCIPLINAS
    // =====================================================

    async listarDisciplinas() {
        const linhas = await this.adminRepository.listarDisciplinas();
        return linhas.map(mapearDisciplina);
    }

    async obterDisciplina(idDisciplina) {
        const disciplina = await this.exigirDisciplina(idDisciplina);
        return mapearDisciplina(disciplina);
    }

    async criarDisciplina(dados) {
        await this.exigirArea(dados.idArea);
        const idDisciplina =
            await this.adminRepository.criarDisciplina(dados);
        return await this.obterDisciplina(idDisciplina);
    }

    async atualizarDisciplina(idDisciplina, dados) {
        await this.exigirDisciplina(idDisciplina);

        if (dados.idArea !== undefined) {
            await this.exigirArea(dados.idArea);
        }

        await this.adminRepository.atualizarDisciplina(
            idDisciplina,
            dados
        );

        return await this.obterDisciplina(idDisciplina);
    }

    async definirAtivoDisciplina(idDisciplina, ativo) {
        await this.exigirDisciplina(idDisciplina);
        await this.adminRepository.definirAtivoDisciplina(
            idDisciplina,
            ativo
        );
        return await this.obterDisciplina(idDisciplina);
    }

    // =====================================================
    // VÍNCULOS
    // =====================================================

    async listarVinculos(filtros) {
        const linhas = await this.adminRepository.listarVinculos(filtros);
        return linhas.map(mapearVinculo);
    }

    async obterVinculo(idVinculo) {
        const vinculo = await this.exigirVinculo(idVinculo);
        return mapearVinculo(vinculo);
    }

    async criarVinculo(dados) {
        await this.exigirTurma(dados.idTurma);
        await this.exigirDisciplina(dados.idDisciplina);
        await this.exigirProfessor(dados.idProfessor);
        await this.exigirAnoLetivo(dados.idAnoLetivo);

        const idVinculo =
            await this.adminRepository.criarVinculo(dados);

        return await this.obterVinculo(idVinculo);
    }

    async atualizarVinculo(idVinculo, dados) {
        await this.exigirVinculo(idVinculo);

        if (dados.idTurma !== undefined) {
            await this.exigirTurma(dados.idTurma);
        }
        if (dados.idDisciplina !== undefined) {
            await this.exigirDisciplina(dados.idDisciplina);
        }
        if (dados.idProfessor !== undefined) {
            await this.exigirProfessor(dados.idProfessor);
        }
        if (dados.idAnoLetivo !== undefined) {
            await this.exigirAnoLetivo(dados.idAnoLetivo);
        }

        await this.adminRepository.atualizarVinculo(idVinculo, dados);
        return await this.obterVinculo(idVinculo);
    }

    async definirAtivoVinculo(idVinculo, ativo) {
        await this.exigirVinculo(idVinculo);
        await this.adminRepository.definirAtivoVinculo(idVinculo, ativo);
        return await this.obterVinculo(idVinculo);
    }

    // =====================================================
    // ANOS LETIVOS
    // =====================================================

    async listarAnosLetivos() {
        const linhas = await this.adminRepository.listarAnosLetivos();
        return linhas.map(mapearAnoLetivo);
    }

    async obterAnoLetivo(idAnoLetivo) {
        const anoLetivo = await this.exigirAnoLetivo(idAnoLetivo);
        return mapearAnoLetivo(anoLetivo);
    }

    async criarAnoLetivo(dados) {
        this.exigirDataFimPosterior(dados.dataInicio, dados.dataFim);

        const idAnoLetivo =
            await this.adminRepository.criarAnoLetivo(dados);

        return await this.obterAnoLetivo(idAnoLetivo);
    }

    async atualizarAnoLetivo(idAnoLetivo, dados) {
        const atual = await this.exigirAnoLetivo(idAnoLetivo);

        this.exigirDataFimPosterior(
            dados.dataInicio ?? atual.data_inicio,
            dados.dataFim ?? atual.data_fim
        );

        await this.adminRepository.atualizarAnoLetivo(
            idAnoLetivo,
            dados
        );

        return await this.obterAnoLetivo(idAnoLetivo);
    }

    async definirAtivoAnoLetivo(idAnoLetivo, ativo) {
        await this.exigirAnoLetivo(idAnoLetivo);
        await this.adminRepository.definirAtivoAnoLetivo(
            idAnoLetivo,
            ativo
        );
        return await this.obterAnoLetivo(idAnoLetivo);
    }

    // =====================================================
    // BIMESTRES
    // =====================================================

    async listarBimestres(filtros) {
        const linhas = await this.adminRepository.listarBimestres(filtros);
        return linhas.map(mapearBimestre);
    }

    async obterBimestre(idBimestre) {
        const bimestre = await this.exigirBimestre(idBimestre);
        return mapearBimestre(bimestre);
    }

    async validarPeriodoBimestre(idAnoLetivo, periodo) {
        const anoLetivo = await this.exigirAnoLetivo(idAnoLetivo);

        this.exigirDataFimPosterior(periodo.dataInicio, periodo.dataFim);
        this.exigirHorarioFimPosterior(
            periodo.horaInicio,
            periodo.horaFim
        );

        if (
            periodo.dataInicio < anoLetivo.data_inicio ||
            periodo.dataFim > anoLetivo.data_fim
        ) {
            throw new ErroAplicacao(
                "datas_fora_do_ano_letivo",
                "O período do bimestre deve estar dentro do ano letivo.",
                422,
                {
                    dataInicio:
                        "O período do bimestre deve estar dentro do ano letivo."
                }
            );
        }
    }

    async criarBimestre(dados) {
        await this.validarPeriodoBimestre(
            dados.idAnoLetivo,
            dados
        );

        const idBimestre =
            await this.adminRepository.criarBimestre(dados);

        return await this.obterBimestre(idBimestre);
    }

    async atualizarBimestre(idBimestre, dados) {
        const atual = await this.exigirBimestre(idBimestre);

        await this.validarPeriodoBimestre(
            dados.idAnoLetivo ?? atual.id_ano_letivo,
            {
                dataInicio: dados.dataInicio ?? atual.data_inicio,
                dataFim: dados.dataFim ?? atual.data_fim,
                horaInicio: dados.horaInicio ?? atual.hora_inicio,
                horaFim: dados.horaFim ?? atual.hora_fim
            }
        );

        await this.adminRepository.atualizarBimestre(idBimestre, dados);
        return await this.obterBimestre(idBimestre);
    }

    async excluirBimestre(idBimestre) {
        await this.exigirBimestre(idBimestre);
        await this.adminRepository.excluirBimestre(idBimestre);
        return { id: idBimestre };
    }

    // =====================================================
    // ACOMPANHAMENTOS (REVISÃO / PUBLICAÇÃO)
    // =====================================================

    async alterarStatusAcompanhamento(usuario, idAcompanhamento, dados) {
        if (!this.acompanhamentoService) {
            throw new ErroAplicacao(
                "servico_indisponivel",
                "O serviço de acompanhamentos não está disponível.",
                500
            );
        }

        return await this.acompanhamentoService.alterarStatus(
            usuario,
            idAcompanhamento,
            dados.status,
            dados.observacao || null
        );
    }

    async ajustarAcompanhamento(usuario, idAcompanhamento, dados) {
        if (!this.acompanhamentoService) {
            throw new ErroAplicacao(
                "servico_indisponivel",
                "O serviço de acompanhamentos não está disponível.",
                500
            );
        }

        return await this.acompanhamentoService.ajustarConteudo(
            usuario,
            idAcompanhamento,
            dados
        );
    }

    // =====================================================
    // AUDITORIA
    // =====================================================

    async listarAuditoria(filtros) {
        const linhas = await this.adminRepository.listarAuditoria(filtros);

        return linhas.map((linha) => ({
            id: linha.id_historico,
            idAcompanhamento: linha.id_acompanhamento,
            aluno: linha.aluno,
            disciplina: linha.disciplina,
            usuario: linha.usuario,
            perfil: perfilParaApi(linha.perfil),
            estadoAnterior: linha.estado_anterior,
            estadoNovo: linha.estado_novo,
            dataHora: linha.data_hora,
            observacao: linha.observacao
        }));
    }

    // =====================================================
    // CONVITES (código de acesso a contas de professor/responsável)
    // =====================================================

    mapearConvite(convite) {
        return {
            id: convite.idConvite,
            codigo: convite.codigo,
            email: convite.email,
            perfil: convite.perfil,
            disciplinaId: convite.disciplinaId,
            matricula: convite.matricula,
            usado: convite.usado,
            expirado: new Date(convite.dataExpiracao) <= new Date(),
            dataExpiracao: convite.dataExpiracao,
            criadoPor: convite.criadoPor,
            dataCriacao: convite.dataCriacao,
        };
    }

    exigirConviteRepository() {
        if (!this.conviteRepository) {
            throw new ErroAplicacao(
                "convite_indisponivel",
                "A geração de convites não está configurada nesta instalação.",
                503
            );
        }

        return this.conviteRepository;
    }

    async criarConvite(dados, criadoPor) {
        const conviteRepository = this.exigirConviteRepository();
        const perfil = perfilParaApi(dados.perfil);

        if (!["professor", "responsavel"].includes(perfil)) {
            throw new ErroAplicacao(
                "perfil_invalido",
                "O convite deve ser para professor ou responsável.",
                422,
                { perfil: "Use professor ou responsavel." }
            );
        }

        const dias = Number(dados.diasValidade) || 7;
        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + dias);

        // O código é único no banco. Se houver colisão, tenta outro.
        let convite = null;

        for (let tentativa = 0; tentativa < 5 && !convite; tentativa++) {
            try {
                convite = await conviteRepository.criar({
                    codigo: this.gerarCodigoConvite(),
                    email: dados.email || null,
                    perfil,
                    disciplinaId: dados.disciplinaId || null,
                    matricula: dados.matricula || null,
                    dataExpiracao: dataExpiracao.toISOString(),
                    criadoPor,
                });
            } catch (erro) {
                if (!erro || erro.code !== "23505") throw erro;
            }
        }

        if (!convite) {
            throw new ErroAplicacao(
                "convite_nao_gerado",
                "Não foi possível gerar um código único. Tente novamente.",
                503
            );
        }

        return this.mapearConvite(convite);
    }

    async listarConvites(filtros = {}) {
        const conviteRepository = this.exigirConviteRepository();
        const { pagina = 1, porPagina = 20, perfil, usado, q } = filtros;

        const [linhas, total] = await Promise.all([
            conviteRepository.listar({ perfil, usado, q, pagina, porPagina }),
            conviteRepository.contar({ perfil, usado, q }),
        ]);

        return {
            dados: linhas.map((linha) => this.mapearConvite(linha)),
            paginacao: {
                pagina: Number(pagina),
                porPagina: Number(porPagina),
                total,
                totalPaginas: Math.ceil(total / Number(porPagina)) || 1,
            },
        };
    }

    async revogarConvite(idConvite) {
        const conviteRepository = this.exigirConviteRepository();
        const removido = await conviteRepository.excluir(idConvite);

        if (!removido) {
            throw naoEncontrado(
                "convite",
                "Convite não encontrado."
            );
        }

        return { id: Number(idConvite), revogado: true };
    }

    gerarCodigoConvite() {
        // Sem O/0 e I/1 para o código não ser confundido ao ser lido.
        const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let codigo = "";

        for (let indice = 0; indice < 8; indice++) {
            codigo += alfabeto[randomInt(alfabeto.length)];
        }

        return `${codigo.slice(0, 4)}-${codigo.slice(4)}`;
    }
}

module.exports = AdminService;
