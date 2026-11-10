import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "../servicos/api";
import {
  hidratar,
  limparSnapshots,
  restaurarSnapshot,
  salvarSnapshot,
} from "../dados/carregarDados";

const CHAVE = "kfka-sessao";

export const PERFIS = {
  administrador: {
    icone: "shield",
    cor: "#FFC94A",
    titulo: "Sou da coordenação",
    sub: "Administro a escola",
    nome: "coordenação",
    pill: "Coordenação",
    area: "admin",
    destino: "/admin/painel",
  },
  professor: {
    icone: "book",
    cor: "#74C0FC",
    titulo: "Sou professor",
    sub: "Registro o acompanhamento das turmas",
    nome: "professor",
    pill: "Professor",
    area: "professor",
    destino: "/professor/painel",
  },
  responsavel: {
    icone: "family",
    cor: "#5FD4A8",
    titulo: "Sou responsável",
    sub: "Acompanho meus filhos",
    nome: "responsável",
    pill: "Responsável",
    area: "familia",
    destino: "/familia/selecionar",
  },
};

export class ErroAutenticacao extends Error {
  constructor(codigo, extras = {}) {
    super(codigo);
    this.name = "ErroAutenticacao";
    this.codigo = codigo;
    Object.assign(this, extras);
  }
}

// O backend usa códigos com "_"; as telas usam os mesmos códigos do protótipo.
const CODIGOS_API = {
  sem_conta: "sem-conta",
  outro_perfil: "outro-perfil",
  email_em_uso: "email",
};

function paraErroAutenticacao(erro, perfil) {
  if (erro instanceof ErroAutenticacao) return erro;

  return new ErroAutenticacao(CODIGOS_API[erro?.codigo] || erro?.codigo || "erro", {
    perfil: erro?.detalhes?.perfil || perfil,
    mensagem: erro?.message,
  });
}

function lerSessao() {
  try {
    const daAba = sessionStorage.getItem(CHAVE);
    if (daAba) return JSON.parse(daAba);
    const lembrada = localStorage.getItem(CHAVE);
    if (lembrada) return JSON.parse(lembrada);
  } catch {
    /* armazenamento indisponível */
  }
  return null;
}

function persistirSessao(sessao, lembrar) {
  const json = JSON.stringify(sessao);
  try {
    sessionStorage.setItem(CHAVE, json);
    if (lembrar) localStorage.setItem(CHAVE, json);
    else localStorage.removeItem(CHAVE);
  } catch {
    /* fica só na memória */
  }
}

function limparSessaoArmazenada() {
  try {
    sessionStorage.removeItem(CHAVE);
    localStorage.removeItem(CHAVE);
  } catch {
    /* nada a limpar */
  }
}

// Mantém a escolha de "lembrar" feita no login.
function sessaoLembrada() {
  try {
    return Boolean(localStorage.getItem(CHAVE));
  } catch {
    return false;
  }
}

// Converte o usuário devolvido pela API no formato de sessão usado pelas telas.
function enriquecerSessao(usuario) {
  const meta = PERFIS[usuario.perfil] || {};

  return {
    idUsuario: usuario.idUsuario ?? null,
    perfil: usuario.perfil,
    nome: usuario.nome,
    email: usuario.email,
    sub: meta.sub || "",
    cor: meta.cor || "#5FD4A8",
    telefone: usuario.telefone || "",
    profId: usuario.professorId == null ? null : String(usuario.professorId),
    respId: usuario.responsavelId == null ? null : String(usuario.responsavelId),
  };
}

// Evita abrir o retrato local quando o JWT já passou do prazo. A assinatura
// continua sendo verificada pelo backend em /auth/me; isto é só uma barreira
// local para não exibir dados de uma sessão vencida.
function tokenExpirado(token) {
  try {
    const parte = token.split(".")[1];
    if (!parte) return true;

    const base64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
    );
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// Com um retrato em sessionStorage, a página abre na hora com os últimos
// dados e revalida /auth/me + hidratar em segundo plano. Sem retrato, mantém
// o bloqueio antigo até a validação terminar.
function estadoInicial() {
  const token = getToken();
  if (!token) {
    return { usuario: null, carregando: false, snapshotRestaurado: false };
  }

  const sessao = lerSessao();
  if (!sessao?.perfil || tokenExpirado(token)) {
    return { usuario: null, carregando: true, snapshotRestaurado: false };
  }

  const snapshotRestaurado = restaurarSnapshot(sessao);
  return {
    usuario: sessao,
    carregando: !snapshotRestaurado,
    snapshotRestaurado,
  };
}

const AutenticacaoContexto = createContext(null);

export function AutenticacaoProvider({ children }) {
  const [inicial] = useState(estadoInicial);
  const [usuario, setUsuario] = useState(inicial.usuario);
  const [carregando, setCarregando] = useState(inicial.carregando);

  // Valida a sessão do token salvo e recarrega os dados do banco. Quando há
  // retrato local, isso roda em segundo plano sem esconder a interface.
  useEffect(() => {
    const token = getToken();

    if (!token) {
      limparSessaoArmazenada();
      limparSnapshots();
      setUsuario(null);
      setCarregando(false);
      return;
    }

    let ativo = true;

    (async () => {
      try {
        const { usuario: dadosUsuario } = await api("/auth/me");
        if (!ativo || getToken() !== token) return;

        const sessao = enriquecerSessao(dadosUsuario);
        await hidratar(sessao);
        if (!ativo || getToken() !== token) return;

        persistirSessao(sessao, sessaoLembrada());
        setUsuario(sessao);
      } catch (erro) {
        // Se o token mudou (logout ou outro login), esta resposta é antiga.
        if (!ativo || getToken() !== token) return;

        // Só encerra a sessão quando o servidor confirma que o token é
        // inválido. Falhas transitórias (rede, 5xx ou requisição abortada
        // por um F5) não podem apagar o token nem o retrato local.
        if (erro?.status === 401) {
          setToken(null);
          limparSessaoArmazenada();
          limparSnapshots();
          setUsuario(null);
          return;
        }

        // Sem retrato não há dados seguros para exibir (o store ainda tem
        // os exemplos do protótipo). Pede login de novo, mas preserva o
        // token para a próxima tentativa.
        if (!inicial.snapshotRestaurado) setUsuario(null);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, []);

  // Salva o retrato ao fechar ou esconder a aba para preservar alterações
  // otimistas que ainda não passaram por uma nova hidratação.
  useEffect(() => {
    if (!usuario?.perfil) return undefined;

    const salvar = () => salvarSnapshot(usuario);
    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === "hidden") salvar();
    };

    window.addEventListener("pagehide", salvar);
    document.addEventListener("visibilitychange", aoTrocarVisibilidade);
    return () => {
      window.removeEventListener("pagehide", salvar);
      document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
    };
  }, [usuario]);

  const entrar = useCallback(async ({ perfil, email, senha, lembrar = true }) => {
    try {
      const { token, usuario: dadosUsuario } = await api("/auth/login", {
        metodo: "POST",
        corpo: { email, senha, perfil },
      });

      setToken(token);
      const sessao = enriquecerSessao(dadosUsuario);
      await hidratar(sessao);
      persistirSessao(sessao, lembrar);
      setUsuario(sessao);
      return sessao;
    } catch (erro) {
      setToken(null);
      throw paraErroAutenticacao(erro, perfil);
    }
  }, []);

  const cadastrar = useCallback(
    async ({ perfil, nome, email, senha, codigoConvite }) => {
      try {
        const corpo = { nome, email, senha, perfil };
        if (codigoConvite) corpo.codigoConvite = codigoConvite;

        const { usuario: dadosUsuario } = await api("/auth/registro", {
          metodo: "POST",
          corpo,
        });

        return enriquecerSessao(dadosUsuario);
      } catch (erro) {
        throw paraErroAutenticacao(erro);
      }
    },
    [],
  );

  const sair = useCallback(() => {
    limparSessaoArmazenada();
    limparSnapshots();
    setToken(null);
    setUsuario(null);
  }, []);

  // Atualiza a sessão depois de editar o próprio perfil.
  const atualizarSessao = useCallback((dadosUsuario) => {
    const sessao = enriquecerSessao(dadosUsuario);
    persistirSessao(sessao, sessaoLembrada());
    setUsuario(sessao);
    return sessao;
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, cadastrar, sair, atualizarSessao }),
    [usuario, carregando, entrar, cadastrar, sair, atualizarSessao],
  );

  return <AutenticacaoContexto.Provider value={valor}>{children}</AutenticacaoContexto.Provider>;
}

export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContexto);
  if (!contexto) {
    throw new Error("useAutenticacao precisa estar dentro de AutenticacaoProvider.");
  }
  return contexto;
}
