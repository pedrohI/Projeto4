const Professor = require("../models/Professor");

class ProfessorRepository {
    constructor(banco) {
        this.banco = banco;
    }

    async buscarPorId(idProfessor) {
        const sql = `
            SELECT
                p.id_professor,
                p.matricula,
                p.data_cadastro,

                u.id_usuario,
                u.nome,
                u.email,
                u.senha_hash,
                u.perfil,
                u.ativo,
                u.data_criacao,
                u.data_atualizacao

            FROM professor p

            JOIN usuario u
                ON u.id_usuario = p.id_usuario

            WHERE p.id_professor = $1;
        `;

        const resultado =
            await this.banco.query(sql, [idProfessor]);

        if (resultado.rows.length === 0) {
            return null;
        }

        const linha = resultado.rows[0];

        return new Professor(
            linha.id_usuario,
            linha.nome,
            linha.email,
            linha.senha_hash,
            linha.perfil,
            linha.ativo,
            linha.data_criacao,
            linha.data_atualizacao,
            linha.id_professor,
            linha.matricula,
            linha.data_cadastro
        );
    }

    async listar() {
        const sql = `
            SELECT DISTINCT
                id_professor,
                professor AS nome,
                email_professor AS email,
                matricula_professor AS matricula
            FROM vw_professor_turmas_disciplinas
            ORDER BY professor;
        `;

        const resultado = await this.banco.query(sql);

        return resultado.rows;
    }

    async buscarPorUsuario(idUsuario) {
        const sql = `
            SELECT
                p.id_professor,
                p.matricula,
                p.data_cadastro,
                u.id_usuario,
                u.nome,
                u.email,
                u.senha_hash,
                u.perfil,
                u.ativo,
                u.data_criacao,
                u.data_atualizacao
            FROM professor p
            JOIN usuario u ON u.id_usuario = p.id_usuario
            WHERE u.id_usuario = $1;
        `;

        const resultado = await this.banco.query(sql, [idUsuario]);

        if (resultado.rows.length === 0) {
            return null;
        }

        const linha = resultado.rows[0];

        return new Professor(
            linha.id_usuario,
            linha.nome,
            linha.email,
            linha.senha_hash,
            linha.perfil,
            linha.ativo,
            linha.data_criacao,
            linha.data_atualizacao,
            linha.id_professor,
            linha.matricula,
            linha.data_cadastro
        );
    }

    async listarVinculos(idProfessor) {
        const sql = `
            SELECT
                id_vinculo,
                id_professor,
                professor,
                id_turma,
                turma,
                ano_serie,
                turno,
                id_disciplina,
                disciplina,
                id_ano_letivo,
                ano_letivo,
                vinculo_ativo
            FROM vw_professor_turmas_disciplinas
            WHERE id_professor = $1
            ORDER BY turma, disciplina;
        `;

        const resultado =
            await this.banco.query(sql, [idProfessor]);

        return resultado.rows;
    }

    async criarPorUsuario(idUsuario, matricula = null) {
        const sql = `
            INSERT INTO professor (idadius, matricula)
            VALUES ($1, $2)
            RETURNING id_professor;
        `;

        const resultado = await this.banco.query(sql, [idUsuario, matricula || null]);

        return {
            idProfessor: resultado.rows[0].id_professor,
        };
    }
}

module.exports = ProfessorRepository;