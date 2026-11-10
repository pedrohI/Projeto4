// O código é exibido como "AURO-7K2P" e pode chegar sem o hífen.
function normalizarCodigo(codigo) {
    const limpo = String(codigo ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    if (limpo.length === 8) {
        return `${limpo.slice(0, 4)}-${limpo.slice(4)}`;
    }

    return limpo;
}

class ConviteRepository {
    constructor(banco) {
        this.banco = banco;
    }

    montarConvite(linha) {
        return {
            idConvite: linha.id_convite,
            codigo: linha.codigo,
            email: linha.email,
            perfil: linha.perfil,
            disciplinaId: linha.disciplina_id,
            matricula: linha.matricula,
            usado: linha.usado,
            dataExpiracao: linha.data_expiracao,
            criadoPor: linha.criado_por,
            dataCriacao: linha.data_criacao,
        };
    }

    async buscarPorCodigo(codigo) {
        const sql = `
            SELECT
                id_convite,
                codigo,
                email,
                perfil,
                disciplina_id,
                matricula,
                usado,
                data_expiracao,
                criado_por,
                data_criacao
            FROM convite
            WHERE codigo = $1;
        `;

        const resultado = await this.banco.query(sql, [
            normalizarCodigo(codigo),
        ]);

        if (resultado.rows.length === 0) {
            return null;
        }

        return this.montarConvite(resultado.rows[0]);
    }

    async buscarValido(codigo, perfil) {
        const convite = await this.buscarPorCodigo(codigo);

        if (!convite) {
            return { valido: false, motivo: "convite_inexistente", convite: null };
        }

        if (convite.usado) {
            return { valido: false, motivo: "convite_ja_usado", convite };
        }

        if (new Date() > new Date(convite.dataExpiracao)) {
            return { valido: false, motivo: "convite_expirado", convite };
        }

        if (convite.perfil !== perfil) {
            return { valido: false, motivo: "perfil_divergente", convite };
        }

        return { valido: true, motivo: null, convite };
    }

    async criar({
        codigo,
        email,
        perfil,
        disciplinaId,
        matricula,
        dataExpiracao,
        criadoPor,
    }) {
        const sql = `
            INSERT INTO convite (
                codigo,
                email,
                perfil,
                disciplina_id,
                matricula,
                data_expiracao,
                criado_por
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id_convite,
                codigo,
                email,
                perfil,
                disciplina_id,
                matricula,
                usado,
                data_expiracao,
                criado_por,
                data_criacao;
        `;

        const resultado = await this.banco.query(sql, [
            normalizarCodigo(codigo),
            email || null,
            perfil,
            disciplinaId || null,
            matricula || null,
            dataExpiracao,
            criadoPor,
        ]);

        return this.montarConvite(resultado.rows[0]);
    }

    // Reserva o convite de forma atômica antes de criar a conta. Se duas
    // requisições chegarem com o mesmo código, só uma recebe a linha de volta.
    async reservar(idConvite) {
        const sql = `
            UPDATE convite
            SET usado = TRUE
            WHERE id_convite = $1
              AND usado = FALSE
            RETURNING
                id_convite,
                codigo,
                email,
                perfil,
                disciplina_id,
                matricula,
                usado,
                data_expiracao,
                criado_por,
                data_criacao;
        `;

        const resultado = await this.banco.query(sql, [idConvite]);

        if (resultado.rows.length === 0) {
            return null;
        }

        return this.montarConvite(resultado.rows[0]);
    }

    // Desfaz a reserva quando a criação da conta falha depois dela.
    async liberar(idConvite) {
        const sql = `
            UPDATE convite
            SET usado = FALSE
            WHERE id_convite = $1
            RETURNING id_convite;
        `;

        const resultado = await this.banco.query(sql, [idConvite]);
        return resultado.rows.length > 0;
    }

    async marcarComoUsado(idConvite) {
        return await this.reservar(idConvite);
    }

    async excluir(idConvite) {
        const sql = `
            DELETE FROM convite
            WHERE id_convite = $1
            RETURNING id_convite;
        `;

        const resultado = await this.banco.query(sql, [idConvite]);
        return resultado.rows.length > 0;
    }

    async listar({ perfil, usado, q, pagina = 1, porPagina = 20 } = {}) {
        const condicoes = [];
        const params = [];
        let idx = 1;

        if (perfil) {
            condicoes.push(`perfil = $${idx++}`);
            params.push(perfil);
        }

        if (usado !== undefined) {
            condicoes.push(`usado = $${idx++}`);
            params.push(usado);
        }

        if (q && typeof q === "string") {
            condicoes.push(`(codigo ILIKE $${idx} OR email ILIKE $${idx})`);
            params.push(`%${q}%`);
        }

        const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

        const offset = (pagina - 1) * porPagina;
        params.push(porPagina, offset);

        const sql = `
            SELECT
                id_convite,
                codigo,
                email,
                perfil,
                disciplina_id,
                matricula,
                usado,
                data_expiracao,
                criado_por,
                data_criacao
            FROM convite
            ${where}
            ORDER BY data_criacao DESC
            LIMIT $${idx++} OFFSET $${idx};
        `;

        const resultado = await this.banco.query(sql, params);
        return resultado.rows.map((linha) => this.montarConvite(linha));
    }

    async contar({ perfil, usado, q } = {}) {
        const condicoes = [];
        const params = [];
        let idx = 1;

        if (perfil) {
            condicoes.push(`perfil = $${idx++}`);
            params.push(perfil);
        }

        if (usado !== undefined) {
            condicoes.push(`usado = $${idx++}`);
            params.push(usado);
        }

        if (q && typeof q === "string") {
            condicoes.push(`(codigo ILIKE $${idx} OR email ILIKE $${idx})`);
            params.push(`%${q}%`);
        }

        const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

        const sql = `SELECT COUNT(*) FROM convite ${where};`;

        const resultado = await this.banco.query(sql, params);
        return Number(resultado.rows[0].count);
    }
}

module.exports = ConviteRepository;
module.exports.normalizarCodigo = normalizarCodigo;
