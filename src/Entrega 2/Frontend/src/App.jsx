import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import ConsentimentoLgpd from "./componentes/ConsentimentoLgpd.jsx";
import LimiteDeErro from "./componentes/LimiteDeErro.jsx";
import RotaProtegida from "./componentes/RotaProtegida.jsx";

// Cada rota carrega seu próprio chunk: o pacote inicial fica só com React,
// Router e o esqueleto das rotas, e a tela abre sob demanda.
function pagina(carregar, nome) {
  return lazy(() =>
    carregar().then((modulo) => ({ default: nome ? modulo[nome] : modulo.default })),
  );
}

const carregarCadastros = () => import("./paginas/admin/Cadastros.jsx");
const carregarEstrutura = () => import("./paginas/admin/Estrutura.jsx");
const carregarRevisao = () => import("./paginas/admin/Revisao.jsx");
const carregarRegistros = () => import("./paginas/professor/Registros.jsx");
const carregarTurmasProfessor = () => import("./paginas/professor/Turmas.jsx");
const carregarRelatoriosFamilia = () => import("./paginas/familia/Relatorios.jsx");

const Auditoria = pagina(() => import("./paginas/admin/Auditoria.jsx"));
const AlunoForm = pagina(carregarCadastros, "AlunoForm");
const Alunos = pagina(carregarCadastros, "Alunos");
const Convites = pagina(carregarCadastros, "Convites");
const ProfessorForm = pagina(carregarCadastros, "ProfessorForm");
const Professores = pagina(carregarCadastros, "Professores");
const ResponsavelForm = pagina(carregarCadastros, "ResponsavelForm");
const Responsaveis = pagina(carregarCadastros, "Responsaveis");
const Disciplinas = pagina(carregarEstrutura, "Disciplinas");
const Periodos = pagina(carregarEstrutura, "Periodos");
const AdminTurmaDetalhe = pagina(carregarEstrutura, "TurmaDetalhe");
const AdminTurmas = pagina(carregarEstrutura, "Turmas");
const Vinculos = pagina(carregarEstrutura, "Vinculos");
const AdminPainel = pagina(() => import("./paginas/admin/Painel.jsx"));
const Relatorios = pagina(() => import("./paginas/admin/Relatorios.jsx"));
const RevisaoDetalhe = pagina(carregarRevisao, "RevisaoDetalhe");
const RevisaoLista = pagina(carregarRevisao, "RevisaoLista");
const Configuracoes = pagina(() => import("./paginas/comuns/Configuracoes.jsx"));
const Perfil = pagina(() => import("./paginas/comuns/Perfil.jsx"));
const HistoricoFamilia = pagina(() => import("./paginas/familia/Historico.jsx"));
const Imprimir = pagina(() => import("./paginas/familia/Imprimir.jsx"));
const PainelFamilia = pagina(() => import("./paginas/familia/Painel.jsx"));
const RelatorioDetalhe = pagina(carregarRelatoriosFamilia, "RelatorioDetalhe");
const RelatoriosFamilia = pagina(carregarRelatoriosFamilia, "RelatoriosFamilia");
const Selecionar = pagina(() => import("./paginas/familia/Selecionar.jsx"));
const ProfessorPainel = pagina(() => import("./paginas/professor/Painel.jsx"));
const RegistroDetalhe = pagina(carregarRegistros, "RegistroDetalhe");
const RegistroForm = pagina(carregarRegistros, "RegistroForm");
const RegistroPrevia = pagina(carregarRegistros, "RegistroPrevia");
const ProfessorRegistros = pagina(carregarRegistros, "Registros");
const ProfessorAlunoDetalhe = pagina(carregarTurmasProfessor, "AlunoDetalhe");
const ProfessorTurmaDetalhe = pagina(carregarTurmasProfessor, "TurmaDetalhe");
const ProfessorTurmas = pagina(carregarTurmasProfessor, "Turmas");
const AcessoNegado = pagina(() => import("./paginas/publico/AcessoNegado.jsx"));
const Cadastro = pagina(() => import("./paginas/publico/Cadastro.jsx"));
const CriarConta = pagina(() => import("./paginas/publico/CriarConta.jsx"));
const Documentacao = pagina(() => import("./paginas/publico/Documentacao.jsx"));
const Entrar = pagina(() => import("./paginas/publico/Entrar.jsx"));
const Inicio = pagina(() => import("./paginas/publico/Inicio.jsx"));
const Login = pagina(() => import("./paginas/publico/Login.jsx"));
const NaoEncontrada = pagina(() => import("./paginas/publico/NaoEncontrada.jsx"));
const Privacidade = pagina(() => import("./paginas/publico/Privacidade.jsx"));
const RecuperarSenha = pagina(() => import("./paginas/publico/RecuperarSenha.jsx"));
const SessaoExpirada = pagina(() => import("./paginas/publico/SessaoExpirada.jsx"));

function ScrollAoTopo() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function Carregando() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <p className="text-2">Carregando…</p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollAoTopo />
      <LimiteDeErro>
        <Suspense fallback={<Carregando />}>
          <Routes>
        {/* Público */}
        <Route path="/" element={<Inicio />} />
        <Route path="/entrar" element={<Entrar />} />
        <Route path="/entrar/:perfil" element={<Login />} />
        <Route path="/criar-conta" element={<CriarConta />} />
        <Route path="/criar-conta/:perfil" element={<Cadastro />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/documentacao" element={<Documentacao />} />
        <Route path="/sessao-expirada" element={<SessaoExpirada />} />
        <Route path="/acesso-negado" element={<AcessoNegado />} />

        {/* Coordenação */}
        <Route path="/admin" element={<Navigate to="/admin/painel" replace />} />
        <Route
          path="/admin/painel"
          element={
            <RotaProtegida perfil="administrador">
              <AdminPainel />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/alunos"
          element={
            <RotaProtegida perfil="administrador">
              <Alunos />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/alunos/novo"
          element={
            <RotaProtegida perfil="administrador">
              <AlunoForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/alunos/:id/editar"
          element={
            <RotaProtegida perfil="administrador">
              <AlunoForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/professores"
          element={
            <RotaProtegida perfil="administrador">
              <Professores />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/professores/convites"
          element={
            <RotaProtegida perfil="administrador">
              <Convites />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/professores/novo"
          element={
            <RotaProtegida perfil="administrador">
              <ProfessorForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/professores/:id/editar"
          element={
            <RotaProtegida perfil="administrador">
              <ProfessorForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/responsaveis"
          element={
            <RotaProtegida perfil="administrador">
              <Responsaveis />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/responsaveis/novo"
          element={
            <RotaProtegida perfil="administrador">
              <ResponsavelForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/responsaveis/:id/editar"
          element={
            <RotaProtegida perfil="administrador">
              <ResponsavelForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/turmas"
          element={
            <RotaProtegida perfil="administrador">
              <AdminTurmas />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/turmas/:id"
          element={
            <RotaProtegida perfil="administrador">
              <AdminTurmaDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/disciplinas"
          element={
            <RotaProtegida perfil="administrador">
              <Disciplinas />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/vinculos"
          element={
            <RotaProtegida perfil="administrador">
              <Vinculos />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/periodos"
          element={
            <RotaProtegida perfil="administrador">
              <Periodos />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/revisao"
          element={
            <RotaProtegida perfil="administrador">
              <RevisaoLista />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/revisao/:id"
          element={
            <RotaProtegida perfil="administrador">
              <RevisaoDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/relatorios"
          element={
            <RotaProtegida perfil="administrador">
              <Relatorios />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/auditoria"
          element={
            <RotaProtegida perfil="administrador">
              <Auditoria />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/perfil"
          element={
            <RotaProtegida perfil="administrador">
              <Perfil papel="admin" />
            </RotaProtegida>
          }
        />
        <Route
          path="/admin/configuracoes"
          element={
            <RotaProtegida perfil="administrador">
              <Configuracoes papel="admin" />
            </RotaProtegida>
          }
        />

        {/* Professor */}
        <Route path="/professor" element={<Navigate to="/professor/painel" replace />} />
        <Route
          path="/professor/painel"
          element={
            <RotaProtegida perfil="professor">
              <ProfessorPainel />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/turmas"
          element={
            <RotaProtegida perfil="professor">
              <ProfessorTurmas />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/turmas/:id"
          element={
            <RotaProtegida perfil="professor">
              <ProfessorTurmaDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/alunos/:id"
          element={
            <RotaProtegida perfil="professor">
              <ProfessorAlunoDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/registros"
          element={
            <RotaProtegida perfil="professor">
              <ProfessorRegistros />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/registros/:id"
          element={
            <RotaProtegida perfil="professor">
              <RegistroDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/registro/novo"
          element={
            <RotaProtegida perfil="professor">
              <RegistroForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/registro/:id/editar"
          element={
            <RotaProtegida perfil="professor">
              <RegistroForm />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/registro/:id/previa"
          element={
            <RotaProtegida perfil="professor">
              <RegistroPrevia />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/perfil"
          element={
            <RotaProtegida perfil="professor">
              <Perfil papel="professor" />
            </RotaProtegida>
          }
        />
        <Route
          path="/professor/configuracoes"
          element={
            <RotaProtegida perfil="professor">
              <Configuracoes papel="professor" />
            </RotaProtegida>
          }
        />

        {/* Família */}
        <Route path="/familia" element={<Navigate to="/familia/selecionar" replace />} />
        <Route
          path="/familia/selecionar"
          element={
            <RotaProtegida perfil="responsavel">
              <Selecionar />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/painel"
          element={
            <RotaProtegida perfil="responsavel">
              <PainelFamilia />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/relatorios"
          element={
            <RotaProtegida perfil="responsavel">
              <RelatoriosFamilia />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/relatorios/:id"
          element={
            <RotaProtegida perfil="responsavel">
              <RelatorioDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/historico"
          element={
            <RotaProtegida perfil="responsavel">
              <HistoricoFamilia />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/imprimir/:id"
          element={
            <RotaProtegida perfil="responsavel">
              <Imprimir />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/perfil"
          element={
            <RotaProtegida perfil="responsavel">
              <Perfil papel="familia" />
            </RotaProtegida>
          }
        />
        <Route
          path="/familia/configuracoes"
          element={
            <RotaProtegida perfil="responsavel">
              <Configuracoes papel="familia" />
            </RotaProtegida>
          }
        />

        <Route path="*" element={<NaoEncontrada />} />
          </Routes>
        </Suspense>
        <ConsentimentoLgpd />
      </LimiteDeErro>
    </>
  );
}
