require("dotenv").config();

const criarApp = require("./src/app");
const ConexaoBanco = require("./src/data/ConexaoBanco");
const { aplicarMigracoes } = require("./src/data/migracoes");
const AdminRepository = require("./src/data/AdminRepository");
const AlunoRepository = require("./src/data/AlunoRepository");
const AcompanhamentoRepository = require("./src/data/AcompanhamentoRepository");
const BimestreRepository = require("./src/data/BimestreRepository");
const ConviteRepository = require("./src/data/ConviteRepository");
const ProfessorRepository = require("./src/data/ProfessorRepository");
const ResponsavelRepository = require("./src/data/ResponsavelRepository");
const UsuarioRepository = require("./src/data/UsuarioRepository");
const AcompanhamentoService = require("./src/services/AcompanhamentoService");
const AdminService = require("./src/services/AdminService");
const AlunoService = require("./src/services/AlunoService");
const AutenticacaoService = require("./src/services/AutenticacaoService");
const ProfessorService = require("./src/services/ProfessorService");
const TokenService = require("./src/services/TokenService");

const PORT = Number(process.env.PORT || 3000);

if (!process.env.JWT_SECRET) {
    console.error(
        "JWT_SECRET não definido. Crie o arquivo .env a partir de .env.example antes de iniciar a API."
    );
    process.exit(1);
}

const banco = new ConexaoBanco();

const adminRepository = new AdminRepository(banco);
const alunoRepository = new AlunoRepository(banco);
const acompanhamentoRepository = new AcompanhamentoRepository(banco);
const bimestreRepository = new BimestreRepository(banco);
const professorRepository = new ProfessorRepository(banco);
const responsavelRepository = new ResponsavelRepository(banco);
const usuarioRepository = new UsuarioRepository(banco);

const tokenService = new TokenService(
    process.env.JWT_SECRET,
    process.env.JWT_EXPIRES_IN || "8h"
);

const autenticacaoService = new AutenticacaoService(
    usuarioRepository,
    tokenService,
    {
        professorRepository,
        responsavelRepository,
        conviteRepository: new ConviteRepository(banco)
    }
);

const alunoService = new AlunoService(alunoRepository);

const acompanhamentoService = new AcompanhamentoService(
    acompanhamentoRepository,
    professorRepository,
    {
        alunoRepository,
        bimestreRepository
    }
);

const professorService = new ProfessorService(professorRepository);

const adminService = new AdminService(
    adminRepository,
    acompanhamentoService,
    new ConviteRepository(banco)
);

const origens = String(
    process.env.CORS_ORIGIN || "http://localhost:5173"
)
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean);

const app = criarApp({
    autenticacaoService,
    alunoService,
    acompanhamentoService,
    professorService,
    adminService,
    bimestreRepository,
    config: {
        corsOrigin: origens.includes("*") ? true : origens
    }
});

let servidor = null;

async function iniciar() {
    try {
        await aplicarMigracoes(banco);
    } catch (erro) {
        console.warn(
            "Aviso: não foi possível aplicar a migração de usuario.telefone:",
            erro.message
        );
        console.warn(
            "Se o perfil não salvar o telefone, rode uma vez: ALTER TABLE usuario ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);"
        );
    }

    servidor = app.listen(PORT, () => {
        console.log(`Servidor KFKA iniciado em http://localhost:${PORT}`);
        console.log(`API disponível em http://localhost:${PORT}/api`);
    });
}

iniciar();

async function encerrar(sinal) {
    console.log(`\n${sinal} recebido. Encerrando o servidor...`);

    if (!servidor) {
        await banco.encerrar();
        process.exit(0);
        return;
    }

    servidor.close(async () => {
        await banco.encerrar();
        process.exit(0);
    });
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));
