import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Campo from "../../componentes/Campo.jsx";
import Icone from "../../componentes/Icone.jsx";
import LayoutAuth from "../../componentes/LayoutAuth.jsx";
import {
  ErroAutenticacao,
  PERFIS,
  useAutenticacao,
} from "../../contextos/AutenticacaoContexto.jsx";
import { dados } from "../../dados/dados.js";
import { emailValido } from "../../utilitarios/formatadores.js";
import { useTitulo } from "../../utilitarios/useTitulo.js";
import { PilulaPerfil } from "./partes.jsx";

const INTRO = {
  administrador:
    "Para coordenadores e diretores. Você cria o espaço da escola e depois cadastra turmas, professores e responsáveis.",
  professor:
    "Use o código de convite que a coordenação da sua escola enviou por e-mail.",
  responsavel:
    "Use o código de convite que a escola enviou no comunicado do aluno.",
};

const RESTRICAO_CADASTRO = {
  professor:
    "Somente a coordenação da escola cria contas de professores. Peça o convite à coordenação e entre com o e-mail e a senha enviados por ela.",
  administrador:
    "Contas de coordenação são criadas pela própria escola. Fale com a coordenação para receber o acesso.",
};

const PARENTESCOS = ["Mãe", "Pai", "Avó ou avô", "Outro responsável"];

const FORCA = [
  "Senha muito fraca",
  "Senha fraca",
  "Senha média",
  "Senha boa",
  "Senha forte",
];

function nivelDaSenha(valor) {
  if (!valor) return 0;
  return (
    (valor.length >= 8 ? 1 : 0) +
    (/\d/.test(valor) ? 1 : 0) +
    (/[^\w\s]/.test(valor) ? 1 : 0) +
    (/[A-Z]/.test(valor) && /[a-z]/.test(valor) ? 1 : 0)
  );
}

function formatarConvite(valor) {
  const limpo = valor
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return limpo.length > 4 ? `${limpo.slice(0, 4)}-${limpo.slice(4)}` : limpo;
}

export default function Cadastro() {
  const { perfil } = useParams();
  const { cadastrar } = useAutenticacao();
  const dadosPerfil = PERFIS[perfil];

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [escola, setEscola] = useState("");
  const [cargo, setCargo] = useState("");
  const [convite, setConvite] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [parentesco, setParentesco] = useState("Mãe");
  const [senha, setSenha] = useState("");
  const [termos, setTermos] = useState(false);
  const [lgpd, setLgpd] = useState(false);
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [criada, setCriada] = useState(null);

  useTitulo(dadosPerfil ? `Criar conta de ${dadosPerfil.nome}` : "Criar conta");

  if (!dadosPerfil) return <Navigate to="/criar-conta" replace />;

  const nivel = nivelDaSenha(senha);

  function validar() {
    const novos = {};

    if (nome.trim().length < 3)
      novos.nome = "Informe seu nome completo (pelo menos 3 letras).";
    if (!email.trim()) novos.email = "Preencha este campo.";
    else if (!emailValido(email))
      novos.email = "Informe um e-mail válido, como nome@escola.edu.br.";

    if (perfil === "administrador") {
      if (escola.trim().length < 3)
        novos.escola = "Informe o nome da escola (pelo menos 3 letras).";
      if (!cargo) novos.cargo = "Selecione o seu cargo.";
    } else {
      if (!convite.trim()) novos.convite = "Informe o código de convite.";
      else if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i.test(convite))
        novos.convite = "O código tem 8 letras ou números, como AURO-7K2P.";
      if (perfil === "professor" && !disciplina)
        novos.disciplina = "Selecione a disciplina principal.";
    }

    if (senha.length < 8) novos.senha = "Use pelo menos 8 caracteres.";
    if (!termos) novos.termos = "Aceite os termos para criar a conta.";
    if (perfil === "responsavel" && !lgpd)
      novos.lgpd =
        "Sem esta autorização a família não consegue ver os relatórios.";

    setErros(novos);

    const ordem = [
      "nome",
      "email",
      "escola",
      "cargo",
      "convite",
      "disciplina",
      "senha",
      "termos",
      "lgpd",
    ];
    const primeiro = ordem.find((campo) => novos[campo]);
    if (primeiro) document.getElementById(primeiro)?.focus();

    return !primeiro;
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (!validar()) return;

    const disciplinaEscolhida = dados.disciplinas.find(
      (item) => item.id === disciplina,
    );
    const sub =
      perfil === "administrador"
        ? cargo
        : perfil === "professor"
          ? disciplinaEscolhida?.nome || "Professor"
          : `Responsável · ${parentesco}`;

    try {
      setEnviando(true);
      await cadastrar({
        perfil,
        nome: nome.trim().replace(/\s+/g, " "),
        email: email.trim(),
        sub,
        senha,
        codigoConvite: perfil === "administrador" ? undefined : convite.trim(),
      });
      setCriada(email.trim());
    } catch (erro) {
      if (erro instanceof ErroAutenticacao && erro.codigo === "email") {
        setErros((atuais) => ({
          ...atuais,
          email:
            "Já existe uma conta com este e-mail. Use “Entrar” ou outro endereço.",
        }));
        document.getElementById("email")?.focus();
      } else if (
        erro instanceof ErroAutenticacao &&
        erro.codigo === "convite_invalido"
      ) {
        setErros((atuais) => ({
          ...atuais,
          convite:
            "Código inválido, já usado ou expirado. Confira com a coordenação.",
        }));
        document.getElementById("convite")?.focus();
      } else if (
        erro instanceof ErroAutenticacao &&
        erro.codigo === "perfil_nao_permitido"
      ) {
        setErros((atuais) => ({
          ...atuais,
          geral:
            RESTRICAO_CADASTRO[perfil] ||
            erro.mensagem ||
            "Não foi possível criar a conta agora. Tente novamente.",
        }));
      } else {
        setErros((atuais) => ({
          ...atuais,
          geral: "Não foi possível criar a conta agora. Tente novamente.",
        }));
      }
    } finally {
      setEnviando(false);
    }
  }

  if (criada) {
    return (
      <LayoutAuth>
        <div className="sucesso stack-lg">
          <span className="sucesso-ico" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" />
              <path d="M15 27l7 7 15-16" pathLength="1" />
            </svg>
          </span>
          <div className="stack-sm">
            <PilulaPerfil perfil={perfil} />
            <h1 id="page-title" tabIndex={-1}>
              Conta criada
            </h1>
            <p className="text-2">
              {perfil === "administrador" ? (
                <>
                  O espaço da <b>{escola.trim()}</b> está criado e você é a
                  pessoa administradora. O próximo passo é abrir o bimestre e
                  cadastrar as turmas.
                </>
              ) : perfil === "professor" ? (
                "A coordenação vai confirmar as suas turmas e disciplinas. Até lá, você já pode entrar e conhecer o painel."
              ) : (
                "A escola vai confirmar o vínculo com o aluno do código informado. Você recebe um e-mail quando o primeiro relatório for publicado."
              )}
            </p>
          </div>
          <Link
            className="btn btn-primary btn-lg btn-block"
            to={`/entrar/${perfil}?email=${encodeURIComponent(criada)}`}
          >
            Entrar agora <Icone nome="chevron-right" />
          </Link>
          <p className="text-2" style={{ fontSize: "0.875rem", margin: 0 }}>
            Enviamos uma confirmação para <b>{criada}</b>.
          </p>
        </div>
      </LayoutAuth>
    );
  }

  return (
    <LayoutAuth>
      <Link to="/criar-conta" className="voltar">
        <Icone nome="chevron-left" className="icon-sm" /> Trocar perfil
      </Link>

      <div className="stack-sm">
        <PilulaPerfil perfil={perfil} />
        <h1 id="page-title" tabIndex={-1}>
          Criar conta de {dadosPerfil.nome}
        </h1>
        <p className="text-2">{INTRO[perfil]}</p>
      </div>

      {erros.geral && (
        <div className="alert danger" role="alert">
          <Icone nome="alert" />
          <div>{erros.geral}</div>
        </div>
      )}

      <form
        className="stack cadastro"
        id="cadastro-form"
        noValidate
        onSubmit={enviar}
      >
        <h2 className="form-secao">Seus dados</h2>
        <Campo
          id="nome"
          label="Nome completo"
          valor={nome}
          aoMudar={setNome}
          obrigatorio
          icone="user"
          erro={erros.nome}
          autoComplete="name"
        />
        <Campo
          id="email"
          label="E-mail"
          tipo="email"
          valor={email}
          aoMudar={setEmail}
          obrigatorio
          icone="mail"
          placeholder="nome@email.com"
          erro={erros.email}
          autoComplete="email"
          inputMode="email"
        />

        <h2 className="form-secao">
          {perfil === "administrador" ? "A escola" : "Vínculo com a escola"}
        </h2>

        {perfil === "administrador" ? (
          <>
            <Campo
              id="escola"
              label="Nome da escola"
              valor={escola}
              aoMudar={setEscola}
              obrigatorio
              icone="cap"
              placeholder="Ex.: Escola Municipal Aurora"
              erro={erros.escola}
              autoComplete="organization"
            />
            <Campo
              id="cargo"
              label="Seu cargo"
              valor={cargo}
              aoMudar={setCargo}
              obrigatorio
              opcoes={[
                ["", "Selecione"],
                ["Coordenação pedagógica", "Coordenação pedagógica"],
                ["Direção", "Direção"],
                ["Secretaria escolar", "Secretaria escolar"],
              ]}
              erro={erros.cargo}
            />
          </>
        ) : (
          <>
            <Campo
              id="convite"
              label="Código de convite"
              valor={convite}
              aoMudar={(valor) => setConvite(formatarConvite(valor))}
              obrigatorio
              icone="link"
              placeholder="AURO-7K2P"
              erro={erros.convite}
              autoComplete="off"
              maxLength={9}
              dica={
                perfil === "professor"
                  ? "Ele liga a sua conta à escola. Não recebeu? Fale com a coordenação."
                  : "Está no comunicado da escola. Um código por aluno."
              }
            />
            {perfil === "professor" ? (
              <Campo
                id="disciplina"
                label="Disciplina principal"
                valor={disciplina}
                aoMudar={setDisciplina}
                obrigatorio
                opcoes={[
                  ["", "Selecione"],
                  ...dados.disciplinas.map((item) => [item.id, item.nome]),
                ]}
                erro={erros.disciplina}
              />
            ) : (
              <fieldset
                className={`field${erros.parentesco ? " has-error" : ""}`}
              >
                <legend>
                  Parentesco
                  <span className="req" aria-hidden="true">
                    *
                  </span>
                </legend>
                <div className="opcoes">
                  {PARENTESCOS.map((opcao) => (
                    <label className="opcao" key={opcao}>
                      <input
                        type="radio"
                        name="parentesco"
                        value={opcao}
                        checked={parentesco === opcao}
                        onChange={() => setParentesco(opcao)}
                      />
                      <span>{opcao}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </>
        )}

        <h2 className="form-secao">Senha</h2>
        <Campo
          id="senha"
          label="Crie uma senha"
          tipo="password"
          valor={senha}
          aoMudar={setSenha}
          obrigatorio
          icone="lock"
          erro={erros.senha}
          dica="Pelo menos 8 caracteres. Misture letras, números e um símbolo."
          autoComplete="new-password"
        />
        <div className="forca">
          <div className="strength" data-nivel={nivel} aria-hidden="true">
            {[0, 1, 2, 3].map((indice) => (
              <span
                key={indice}
                className={indice < nivel ? "on" : undefined}
              />
            ))}
          </div>
          <span className="forca-txt" id="forca-txt" aria-live="polite">
            {senha ? FORCA[nivel] : ""}
          </span>
        </div>

        <div className={`field${erros.termos ? " has-error" : ""}`}>
          <label className="check check-longo" htmlFor="termos">
            <input
              type="checkbox"
              id="termos"
              checked={termos}
              onChange={(evento) => setTermos(evento.target.checked)}
            />
            <span>
              Li e aceito os{" "}
              <Link to="/privacidade">
                termos de uso e a política de privacidade
              </Link>
              .
            </span>
          </label>
          <span className="error-msg" role="alert">
            <Icone nome="alert" className="icon-sm" />
            <span>{erros.termos}</span>
          </span>
        </div>

        {perfil === "responsavel" && (
          <div className={`field${erros.lgpd ? " has-error" : ""}`}>
            <label className="check check-longo" htmlFor="lgpd">
              <input
                type="checkbox"
                id="lgpd"
                checked={lgpd}
                onChange={(evento) => setLgpd(evento.target.checked)}
              />
              <span>
                Autorizo a escola a tratar os dados de acompanhamento dos alunos
                vinculados a mim, conforme a LGPD.
              </span>
            </label>
            <span className="error-msg" role="alert">
              <Icone nome="alert" className="icon-sm" />
              <span>{erros.lgpd}</span>
            </span>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg btn-block"
          type="submit"
          disabled={enviando}
        >
          {enviando ? "Criando conta…" : "Criar conta"}{" "}
          <Icone nome="chevron-right" />
        </button>
      </form>

      <p className="auth-rodape">
        Já tem conta? <Link to={`/entrar/${perfil}`}>Entrar</Link>
      </p>
    </LayoutAuth>
  );
}
