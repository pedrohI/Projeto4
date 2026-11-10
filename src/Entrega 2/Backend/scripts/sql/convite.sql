/*
 * Tabela de convites (código que a coordenação gera para o professor
 * criar a própria conta).
 *
 * Rode este arquivo uma única vez conectado como o dono do banco
 * (KFKA_owner no Neon). O usuário da aplicação (kfka_app) só tem
 * USAGE no schema public e não consegue criar a tabela sozinho.
 *
 * É idempotente: pode ser executado de novo sem erro.
 */

CREATE TABLE IF NOT EXISTS convite (
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

-- Bancos criados pela versão anterior da migração, sem a matrícula.
ALTER TABLE convite ADD COLUMN IF NOT EXISTS matricula VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_convite_codigo ON convite(codigo);
CREATE INDEX IF NOT EXISTS idx_convite_usado ON convite(usado);
CREATE INDEX IF NOT EXISTS idx_convite_expiracao ON convite(data_expiracao);
