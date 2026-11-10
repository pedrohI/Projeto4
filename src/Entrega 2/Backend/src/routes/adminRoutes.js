const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const ErroAplicacao = require("../errors/ErroAplicacao");
const { autorizar } = require("../middlewares/autenticacao");
const { validarCampos, validarId } = require("../utils/validacao");

function opcionalId(req, campo) {
    const valor = req.query[campo];

    if (valor === undefined || valor === "") {
        return undefined;
    }

    return validarId(valor, campo);
}

function opcionalBooleano(req, campo) {
    const valor = req.query[campo];

    if (valor === undefined || valor === "") {
        return undefined;
    }

    if (valor === "true" || valor === "1") return true;
    if (valor === "false" || valor === "0") return false;

    throw new ErroAplicacao(
        "parametro_invalido",
        `O parâmetro "${campo}" deve ser true ou false.`,
        400,
        { [campo]: "Use true ou false." }
    );
}

function semObrigatorios(regras) {
    const resultado = {};

    for (const [campo, regra] of Object.entries(regras)) {
        resultado[campo] = { ...regra };
        delete resultado[campo].obrigatorio;
    }

    return resultado;
}

const REGRAS_ALUNO = {
    nome: { tipo: "texto", obrigatorio: true, min: 3, max: 150 },
    dataNascimento: { tipo: "data", obrigatorio: true },
    matricula: { tipo: "texto", obrigatorio: true, min: 1, max: 30 },
    ativo: { tipo: "booleano" }
};

const REGRAS_PROFESSOR = {
    nome: { tipo: "texto", obrigatorio: true, min: 3, max: 150 },
    email: { tipo: "email", obrigatorio: true },
    senha: { tipo: "senha", obrigatorio: true, min: 8 },
    matricula: { tipo: "texto", obrigatorio: true, min: 1, max: 30 },
    ativo: { tipo: "booleano" }
};

const REGRAS_RESPONSAVEL = {
    nome: { tipo: "texto", obrigatorio: true, min: 3, max: 150 },
    email: { tipo: "email", obrigatorio: true },
    senha: { tipo: "senha", obrigatorio: true, min: 8 },
    telefone: { tipo: "texto", max: 20 },
    ativo: { tipo: "booleano" }
};

const REGRAS_TURMA = {
    nome: { tipo: "texto", obrigatorio: true, min: 1, max: 50 },
    anoSerie: { tipo: "texto", obrigatorio: true, min: 1, max: 30 },
    turno: { tipo: "texto", obrigatorio: true, min: 1, max: 20 },
    ativo: { tipo: "booleano" }
};

const REGRAS_AREA = {
    nome: { tipo: "texto", obrigatorio: true, min: 1, max: 60 },
    descricao: { tipo: "texto", max: 255 },
    ativo: { tipo: "booleano" }
};

const REGRAS_DISCIPLINA = {
    idArea: { tipo: "inteiro", obrigatorio: true },
    nome: { tipo: "texto", obrigatorio: true, min: 1, max: 80 },
    descricao: { tipo: "texto", max: 255 },
    ativo: { tipo: "booleano" }
};

const REGRAS_VINCULO = {
    idTurma: { tipo: "inteiro", obrigatorio: true },
    idDisciplina: { tipo: "inteiro", obrigatorio: true },
    idProfessor: { tipo: "inteiro", obrigatorio: true },
    idAnoLetivo: { tipo: "inteiro", obrigatorio: true },
    ativo: { tipo: "booleano" }
};

const REGRAS_ANO_LETIVO = {
    ano: { tipo: "inteiro", obrigatorio: true, min: 2000, max: 2100 },
    dataInicio: { tipo: "data", obrigatorio: true },
    dataFim: { tipo: "data", obrigatorio: true },
    ativo: { tipo: "booleano" }
};

const REGRAS_CONVITE = {
    perfil: {
        tipo: "enum",
        obrigatorio: true,
        valores: ["professor", "responsavel"]
    },
    email: { tipo: "email" },
    matricula: { tipo: "texto", min: 1, max: 30 },
    disciplinaId: { tipo: "inteiro" },
    diasValidade: { tipo: "inteiro", min: 1, max: 90 }
};

const REGRAS_BIMESTRE = {
    idAnoLetivo: { tipo: "inteiro", obrigatorio: true },
    numero: { tipo: "inteiro", obrigatorio: true, min: 1, max: 4 },
    dataInicio: { tipo: "data", obrigatorio: true },
    dataFim: { tipo: "data", obrigatorio: true },
    horaInicio: { tipo: "hora", obrigatorio: true },
    horaFim: { tipo: "hora", obrigatorio: true }
};

function criarAdminRoutes(adminService, autenticar) {
    const router = express.Router();

    router.use(autenticar);
    router.use(autorizar("administrador"));

    const responder = (res, dados, status = 200) =>
        res.status(status).json({ sucesso: true, dados });

    // =====================================================
    // ALUNOS
    // =====================================================

    router.get(
        "/alunos",
        asyncHandler(async (req, res) => {
            const alunos = await adminService.listarAlunos({
                q: typeof req.query.q === "string" ? req.query.q : undefined,
                idTurma: opcionalId(req, "idTurma"),
                ativo: opcionalBooleano(req, "ativo")
            });

            responder(res, alunos);
        })
    );

    router.post(
        "/alunos",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_ALUNO);
            const aluno = await adminService.criarAluno(dados);
            responder(res, aluno, 201);
        })
    );

    router.get(
        "/alunos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterAluno(id));
        })
    );

    const atualizarAluno = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_ALUNO)
        );

        responder(res, await adminService.atualizarAluno(id, dados));
    });

    router.put("/alunos/:id", atualizarAluno);
    router.patch("/alunos/:id", atualizarAluno);

    router.delete(
        "/alunos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.definirAtivoAluno(id, false));
        })
    );

    router.get(
        "/alunos/:id/responsaveis",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.listarResponsaveisDoAluno(id)
            );
        })
    );

    router.post(
        "/alunos/:id/responsaveis",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            const dados = validarCampos(req.body, {
                idResponsavel: { tipo: "inteiro", obrigatorio: true },
                tipoRelacao: { tipo: "texto", max: 40 }
            });

            responder(
                res,
                await adminService.vincularResponsavel(id, dados),
                201
            );
        })
    );

    router.delete(
        "/alunos/:id/responsaveis/:idResponsavel",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            const idResponsavel = validarId(
                req.params.idResponsavel,
                "idResponsavel"
            );

            responder(
                res,
                await adminService.desvincularResponsavel(
                    id,
                    idResponsavel
                )
            );
        })
    );

    router.get(
        "/alunos/:id/matriculas",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.listarMatriculasDoAluno(id));
        })
    );

    router.post(
        "/alunos/:id/matriculas",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            const dados = validarCampos(req.body, {
                idTurma: { tipo: "inteiro", obrigatorio: true },
                idAnoLetivo: { tipo: "inteiro", obrigatorio: true },
                dataInicio: { tipo: "data", obrigatorio: true }
            });

            responder(
                res,
                await adminService.matricularAluno(id, dados),
                201
            );
        })
    );

    router.delete(
        "/alunos/:id/matriculas/:idTurma/:idAnoLetivo",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            const idTurma = validarId(req.params.idTurma, "idTurma");
            const idAnoLetivo = validarId(
                req.params.idAnoLetivo,
                "idAnoLetivo"
            );

            responder(
                res,
                await adminService.desmatricularAluno(
                    id,
                    idTurma,
                    idAnoLetivo
                )
            );
        })
    );

    // =====================================================
    // PROFESSORES
    // =====================================================

    router.get(
        "/professores",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarProfessores());
        })
    );

    router.post(
        "/professores",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_PROFESSOR);
            responder(
                res,
                await adminService.criarProfessor(dados),
                201
            );
        })
    );

    router.get(
        "/professores/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterProfessor(id));
        })
    );

    const atualizarProfessor = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_PROFESSOR)
        );

        responder(
            res,
            await adminService.atualizarProfessor(id, dados)
        );
    });

    router.put("/professores/:id", atualizarProfessor);
    router.patch("/professores/:id", atualizarProfessor);

    router.delete(
        "/professores/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.definirAtivoProfessor(id, false)
            );
        })
    );

    // =====================================================
    // CONVITES (código para o professor criar a própria conta)
    // =====================================================

    router.post(
        "/convites",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_CONVITE);

            responder(
                res,
                await adminService.criarConvite(
                    dados,
                    req.usuario.idUsuario
                ),
                201
            );
        })
    );

    router.get(
        "/convites",
        asyncHandler(async (req, res) => {
            responder(
                res,
                await adminService.listarConvites({
                    perfil: req.query.perfil
                        ? String(req.query.perfil).toLowerCase()
                        : undefined,
                    usado: opcionalBooleano(req, "usado"),
                    q: typeof req.query.q === "string" ? req.query.q : undefined,
                    pagina: Math.max(1, Number(req.query.pagina) || 1),
                    porPagina: Math.min(
                        100,
                        Math.max(1, Number(req.query.porPagina) || 20)
                    )
                })
            );
        })
    );

    router.delete(
        "/convites/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.revogarConvite(id));
        })
    );

    // =====================================================
    // RESPONSÁVEIS
    // =====================================================

    router.get(
        "/responsaveis",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarResponsaveis());
        })
    );

    router.post(
        "/responsaveis",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_RESPONSAVEL);
            responder(
                res,
                await adminService.criarResponsavel(dados),
                201
            );
        })
    );

    router.get(
        "/responsaveis/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterResponsavel(id));
        })
    );

    const atualizarResponsavel = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_RESPONSAVEL)
        );

        responder(
            res,
            await adminService.atualizarResponsavel(id, dados)
        );
    });

    router.put("/responsaveis/:id", atualizarResponsavel);
    router.patch("/responsaveis/:id", atualizarResponsavel);

    router.delete(
        "/responsaveis/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.definirAtivoResponsavel(id, false)
            );
        })
    );

    router.get(
        "/responsaveis/:id/alunos",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.listarAlunosDoResponsavel(id)
            );
        })
    );

    // =====================================================
    // TURMAS
    // =====================================================

    router.get(
        "/turmas",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarTurmas());
        })
    );

    router.post(
        "/turmas",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_TURMA);
            responder(res, await adminService.criarTurma(dados), 201);
        })
    );

    router.get(
        "/turmas/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterTurma(id));
        })
    );

    const atualizarTurma = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_TURMA)
        );

        responder(res, await adminService.atualizarTurma(id, dados));
    });

    router.put("/turmas/:id", atualizarTurma);
    router.patch("/turmas/:id", atualizarTurma);

    router.delete(
        "/turmas/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.definirAtivoTurma(id, false));
        })
    );

    router.get(
        "/turmas/:id/alunos",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            const idAnoLetivo = opcionalId(req, "idAnoLetivo");

            responder(
                res,
                await adminService.listarAlunosDaTurma(id, idAnoLetivo)
            );
        })
    );

    router.get(
        "/turmas/:id/vinculos",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.listarVinculosDaTurma(id)
            );
        })
    );

    // =====================================================
    // ÁREAS
    // =====================================================

    router.get(
        "/areas",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarAreas());
        })
    );

    router.post(
        "/areas",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_AREA);
            responder(res, await adminService.criarArea(dados), 201);
        })
    );

    router.get(
        "/areas/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterArea(id));
        })
    );

    const atualizarArea = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_AREA)
        );

        responder(res, await adminService.atualizarArea(id, dados));
    });

    router.put("/areas/:id", atualizarArea);
    router.patch("/areas/:id", atualizarArea);

    router.delete(
        "/areas/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.definirAtivoArea(id, false));
        })
    );

    // =====================================================
    // DISCIPLINAS
    // =====================================================

    router.get(
        "/disciplinas",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarDisciplinas());
        })
    );

    router.post(
        "/disciplinas",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_DISCIPLINA);
            responder(
                res,
                await adminService.criarDisciplina(dados),
                201
            );
        })
    );

    router.get(
        "/disciplinas/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterDisciplina(id));
        })
    );

    const atualizarDisciplina = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_DISCIPLINA)
        );

        responder(
            res,
            await adminService.atualizarDisciplina(id, dados)
        );
    });

    router.put("/disciplinas/:id", atualizarDisciplina);
    router.patch("/disciplinas/:id", atualizarDisciplina);

    router.delete(
        "/disciplinas/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.definirAtivoDisciplina(id, false)
            );
        })
    );

    // =====================================================
    // VÍNCULOS
    // =====================================================

    router.get(
        "/vinculos",
        asyncHandler(async (req, res) => {
            responder(
                res,
                await adminService.listarVinculos({
                    idTurma: opcionalId(req, "idTurma"),
                    idProfessor: opcionalId(req, "idProfessor"),
                    idDisciplina: opcionalId(req, "idDisciplina"),
                    idAnoLetivo: opcionalId(req, "idAnoLetivo"),
                    ativo: opcionalBooleano(req, "ativo")
                })
            );
        })
    );

    router.post(
        "/vinculos",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_VINCULO);
            responder(
                res,
                await adminService.criarVinculo(dados),
                201
            );
        })
    );

    router.get(
        "/vinculos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterVinculo(id));
        })
    );

    const atualizarVinculo = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_VINCULO)
        );

        responder(res, await adminService.atualizarVinculo(id, dados));
    });

    router.put("/vinculos/:id", atualizarVinculo);
    router.patch("/vinculos/:id", atualizarVinculo);

    router.delete(
        "/vinculos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.definirAtivoVinculo(id, false)
            );
        })
    );

    // =====================================================
    // ANOS LETIVOS
    // =====================================================

    router.get(
        "/anos-letivos",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarAnosLetivos());
        })
    );

    router.post(
        "/anos-letivos",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_ANO_LETIVO);
            responder(
                res,
                await adminService.criarAnoLetivo(dados),
                201
            );
        })
    );

    router.get(
        "/anos-letivos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterAnoLetivo(id));
        })
    );

    const atualizarAnoLetivo = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_ANO_LETIVO)
        );

        responder(
            res,
            await adminService.atualizarAnoLetivo(id, dados)
        );
    });

    router.put("/anos-letivos/:id", atualizarAnoLetivo);
    router.patch("/anos-letivos/:id", atualizarAnoLetivo);

    router.delete(
        "/anos-letivos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(
                res,
                await adminService.definirAtivoAnoLetivo(id, false)
            );
        })
    );

    // =====================================================
    // BIMESTRES
    // =====================================================

    router.get(
        "/bimestres",
        asyncHandler(async (req, res) => {
            responder(
                res,
                await adminService.listarBimestres({
                    idAnoLetivo: opcionalId(req, "idAnoLetivo")
                })
            );
        })
    );

    router.post(
        "/bimestres",
        asyncHandler(async (req, res) => {
            const dados = validarCampos(req.body, REGRAS_BIMESTRE);
            responder(
                res,
                await adminService.criarBimestre(dados),
                201
            );
        })
    );

    router.get(
        "/bimestres/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.obterBimestre(id));
        })
    );

    const atualizarBimestre = asyncHandler(async (req, res) => {
        const id = validarId(req.params.id, "id");
        const dados = validarCampos(
            req.body,
            semObrigatorios(REGRAS_BIMESTRE)
        );

        responder(
            res,
            await adminService.atualizarBimestre(id, dados)
        );
    });

    router.put("/bimestres/:id", atualizarBimestre);
    router.patch("/bimestres/:id", atualizarBimestre);

    router.delete(
        "/bimestres/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");
            responder(res, await adminService.excluirBimestre(id));
        })
    );

    // =====================================================
    // TAGS
    // =====================================================

    router.get(
        "/tags",
        asyncHandler(async (req, res) => {
            responder(res, await adminService.listarTags());
        })
    );

    // =====================================================
    // REVISÃO / PUBLICAÇÃO DE ACOMPANHAMENTOS
    // =====================================================

    router.patch(
        "/acompanhamentos/:id",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");

            const dados = validarCampos(req.body, {
                descricao: {
                    tipo: "texto",
                    min: 1,
                    max: 2000
                },
                media: {
                    tipo: "numero",
                    min: 0,
                    max: 10
                }
            });

            responder(
                res,
                await adminService.ajustarAcompanhamento(
                    req.usuario,
                    id,
                    dados
                )
            );
        })
    );

    router.patch(
        "/acompanhamentos/:id/status",
        asyncHandler(async (req, res) => {
            const id = validarId(req.params.id, "id");

            const dados = validarCampos(req.body, {
                status: {
                    tipo: "enum",
                    obrigatorio: true,
                    valores: [
                        "em_revisao",
                        "devolvido",
                        "publicado",
                        "cancelado"
                    ]
                },
                observacao: { tipo: "texto", max: 500 }
            });

            responder(
                res,
                await adminService.alterarStatusAcompanhamento(
                    req.usuario,
                    id,
                    dados
                )
            );
        })
    );

    // =====================================================
    // AUDITORIA
    // =====================================================

    router.get(
        "/auditoria",
        asyncHandler(async (req, res) => {
            const limite = Number(req.query.limite || 200);

            if (
                !Number.isInteger(limite) ||
                limite <= 0 ||
                limite > 500
            ) {
                throw new ErroAplicacao(
                    "parametro_invalido",
                    'O parâmetro "limite" deve ser um inteiro entre 1 e 500.',
                    400,
                    { limite: "Use um valor entre 1 e 500." }
                );
            }

            responder(
                res,
                await adminService.listarAuditoria({
                    idAcompanhamento: opcionalId(
                        req,
                        "idAcompanhamento"
                    ),
                    idUsuario: opcionalId(req, "idUsuario"),
                    limite
                })
            );
        })
    );

    return router;
}

module.exports = criarAdminRoutes;
