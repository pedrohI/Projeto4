/*
 * Ajustes idempotentes de esquema executados na inicialização do servidor.
 * Assim o sistema funciona sem precisar rodar SQL manualmente.
 */

async function garantirTelefoneUsuario(banco) {
    const coluna = await banco.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'usuario'
          AND column_name = 'telefone';
    `);

    if (coluna.rows.length === 0) {
        try {
            await banco.query(`
                ALTER TABLE usuario
                ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
            `);
        } catch (erro) {
            console.warn(
                "Aviso: não foi possível criar usuario.telefone:",
                erro.message
            );
            console.warn(
                "Rode uma vez como dono do banco: ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);"
            );
            return;
        }
    }

    // Aproveita o telefone já cadastrado na tabela responsavel.
    await banco.query(`
        UPDATE usuario u
        SET telefone = r.telefone
        FROM responsavel r
        WHERE r.id_usuario = u.id_usuario
          AND u.telefone IS NULL
          AND r.telefone IS NOT NULL;
    `);
}

async function permitirRascunhoSemConteudo(banco) {
    const colunas = await banco.query(`
        SELECT column_name, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'acompanhamento'
          AND column_name IN ('descricao', 'media');
    `);

    const pendentes = colunas.rows
        .filter((linha) => linha.is_nullable === "NO")
        .map((linha) => linha.column_name);

    if (pendentes.length === 0) {
        return;
    }

    try {
        await banco.query(
            "ALTER TABLE acompanhamento ALTER COLUMN descricao DROP NOT NULL;"
        );
        await banco.query(
            "ALTER TABLE acompanhamento ALTER COLUMN media DROP NOT NULL;"
        );
    } catch (erro) {
        console.warn(
            "Aviso: não foi possível permitir rascunhos sem descrição/média:",
            erro.message
        );
        console.warn(
            "Rode uma vez como dono do banco:"
        );
        console.warn(
            "ALTER TABLE acompanhamento ALTER COLUMN descricao DROP NOT NULL;"
        );
        console.warn(
            "ALTER TABLE acompanhamento ALTER COLUMN media DROP NOT NULL;"
        );
    }
}

async function garantirConvite(banco) {
    const tabela = await banco.query(`
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'convite';
    `);

    if (tabela.rows.length === 0) {
        try {
            await banco.query(`
                CREATE TABLE convite (
                    id_convite SERIAL PRIMARY KEY,
                    codigo VARCHAR(9) NOT NULL UNIQUE,
                    email VARCHAR(255),
                    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('professor', 'responsavel')),
                    disciplina_id BIGINT REFERENCES disciplina(id_disciplina),
                    matricula VARCHAR(30),
                    usado BOOLEAN NOT NULL DEFAULT FALSE,
                    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
                    criado_por BIGINT NOT NULL REFERENCES usuario(id_usuario),
                    data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            `);
            await banco.query(`
                CREATE INDEX idx_convite_codigo ON convite(codigo);
                CREATE INDEX idx_convite_usado ON convite(usado);
                CREATE INDEX idx_convite_expiracao ON convite(data_expiracao);
            `);
        } catch (erro) {
            console.warn(
                "Aviso: não foi possível criar tabela convite:",
                erro.message
            );
            console.warn(
                "Rode uma vez como dono do banco: scripts/sql/convite.sql"
            );
            return;
        }
    }

    // Bancos criados antes da matrícula opcional no convite.
    try {
        await banco.query(`
            ALTER TABLE convite
            ADD COLUMN IF NOT EXISTS matricula VARCHAR(30);
        `);
    } catch (erro) {
        // O usuário da aplicação pode não ser dono da tabela; o
        // scripts/sql/convite.sql traz o comando para rodar como dono.
        console.warn(
            "Aviso: não foi possível criar convite.matricula:",
            erro.message
        );
        console.warn(
            "Rode uma vez como dono do banco: ALTER TABLE convite ADD COLUMN IF NOT EXISTS matricula VARCHAR(30);"
        );
    }
}

async function aplicarMigracoes(banco) {
    await garantirTelefoneUsuario(banco);
    await permitirRascunhoSemConteudo(banco);
    await garantirConvite(banco);
}

module.exports = { aplicarMigracoes };
