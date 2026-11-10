import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Avatar from "../../componentes/Avatar.jsx";
import Campo from "../../componentes/Campo.jsx";
import EmptyState from "../../componentes/EmptyState.jsx";
import Icone from "../../componentes/Icone.jsx";
import LayoutApp from "../../componentes/LayoutApp.jsx";
import Modal from "../../componentes/Modal.jsx";
import PageHead from "../../componentes/PageHead.jsx";
import { useAviso } from "../../contextos/AvisoContexto.jsx";
import {
  mapAluno,
  mapProfessor,
  mapResponsavel,
} from "../../dados/carregarDados.js";
import { api, dados } from "../../dados/dados.js";
import { api as apiServidor } from "../../servicos/api.js";
import { emailValido } from "../../utilitarios/formatadores.js";
import { useTitulo } from "../../utilitarios/useTitulo.js";

const dataHojeISO = () => {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
};

const paraISO = (valor) => {
  const texto = String(valor || "").trim();
  const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : "";
};

function anoLetivoAtual() {
  const aberto = dados.bimestres.find((bimestre) => bimestre.status === "aberto");
  return (aberto || dados.bimestres[0])?.idAnoLetivo || "";
}

function proximaMatricula() {
  const usadas = new Set(dados.alunos.map((aluno) => aluno.ra));
  let numero = 400 + dados.alunos.length + 1;
  let ra = `2026-${String(numero).padStart(4, "0")}`;
  while (usadas.has(ra)) {
    numero += 1;
    ra = `2026-${String(numero).padStart(4, "0")}`;
  }
  return ra;
}

function AbasCadastro({ ativa }) {
  const itens = [
    ["alunos", "Alunos", dados.alunos.length],
    ["professores", "Professores", dados.professores.length],
    ["responsaveis", "Responsáveis", dados.responsaveis.length],
  ];
  return (
    <nav className="tabs" aria-label="Cadastros">
      {itens.map(([chave, rotulo, total]) => (
        <Link key={chave} to={`/admin/${chave}`} aria-current={ativa === chave ? "page" : undefined}>
          {rotulo}
          <span className="n">{total}</span>
        </Link>
      ))}
    </nav>
  );
}

function CabecalhoLista({ titulo, lead, children }) {
  return (
    <PageHead
      crumbs={[{ label: "Estrutura escolar" }, { label: titulo }]}
      title={titulo}
      lead={lead}
      actions={children}
    />
  );
}

/* ============================ ALUNOS ============================ */

export function Alunos() {
  useTitulo("Alunos");
  const { avisar } = useAviso();
  const [params] = useSearchParams();
  const [versao, setVersao] = useState(0);
  const [q, setQ] = useState(params.get("q") || "");
  const [turma, setTurma] = useState("");
  const [situacao, setSituacao] = useState("");
  const [importar, setImportar] = useState(false);

  useEffect(() => setQ(params.get("q") || ""), [params]);

  const lista = useMemo(
    () =>
      dados.alunos.filter(
        (aluno) =>
          (!q ||
            aluno.nome.toLowerCase().includes(q.toLowerCase()) ||
            aluno.ra.includes(q)) &&
          (!turma || aluno.turma === turma) &&
          (situacao === "" || String(Number(aluno.ativo)) === situacao),
      ),
    [q, turma, situacao, versao],
  );

  async function alternarAtivo(aluno, ativo) {
    const anterior = aluno.ativo;

    // Reflete a mudança na hora e confirma no servidor em seguida; esperar a
    // recarga completa dos dados dava a impressão de sistema travado.
    aluno.ativo = ativo;
    setVersao((valor) => valor + 1);

    try {
      const atualizado = await apiServidor(`/admin/alunos/${aluno.id}`, {
        metodo: "PATCH",
        corpo: { ativo },
      });

      aluno.ativo = atualizado?.ativo ?? ativo;
      setVersao((valor) => valor + 1);
      avisar(
        `${aluno.nome} ${ativo ? "ativado" : "inativado"}`,
        "Alteração gravada no banco de dados.",
        ativo ? "ok" : "warn",
      );
    } catch (erro) {
      aluno.ativo = anterior;
      setVersao((valor) => valor + 1);
      avisar("Não foi possível alterar a situação", erro.message, "err");
    }
  }

  function limpar() {
    setQ("");
    setTurma("");
    setSituacao("");
  }

  return (
    <LayoutApp papel="admin" ativo="alunos">
      <CabecalhoLista
        titulo="Alunos"
        lead="Cadastre, edite, ative ou inative alunos e mantenha os vínculos com responsáveis."
      >
        <button type="button" className="btn btn-secondary" onClick={() => setImportar(true)}>
          <Icone nome="upload" /> Importar planilha
        </button>
        <Link className="btn btn-primary" to="/admin/alunos/novo">
          <Icone nome="plus" /> Novo aluno
        </Link>
      </CabecalhoLista>

      <section className="card">
        <AbasCadastro ativa="alunos" />
        <div className="toolbar" role="search">
          <div className="search">
            <label className="sr-only" htmlFor="f-q">
              Buscar alunos
            </label>
            <Icone nome="search" />
            <input
              id="f-q"
              className="input"
              type="search"
              value={q}
              onChange={(evento) => setQ(evento.target.value)}
              placeholder="Buscar por nome ou RA"
            />
          </div>
          <label className="sr-only" htmlFor="f-turma">
            Turma
          </label>
          <select
            id="f-turma"
            className="select"
            style={{ width: "auto" }}
            value={turma}
            onChange={(evento) => setTurma(evento.target.value)}
          >
            <option value="">Todas as turmas</option>
            {dados.turmas.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="f-sit">
            Situação
          </label>
          <select
            id="f-sit"
            className="select"
            style={{ width: "auto" }}
            value={situacao}
            onChange={(evento) => setSituacao(evento.target.value)}
          >
            <option value="">Todas as situações</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </select>
        </div>

        {lista.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Responsáveis</th>
                  <th>Situação</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lista.map((aluno) => {
                  const responsaveis = api.respDoAluno(aluno.id);
                  return (
                    <tr key={aluno.id}>
                      <td className="cell-main">
                        <div className="cell-person">
                          <Avatar nome={aluno.nome} cor={aluno.cor} tamanho="sm" />
                          <span>
                            <b>{aluno.nome}</b>
                            <small className="mono">RA {aluno.ra}</small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Turma">
                        <Link to={`/admin/turmas/${aluno.turma}`}>
                          {api.turma(aluno.turma)?.nome}
                        </Link>
                      </td>
                      <td data-label="Responsáveis">
                        {responsaveis.length ? (
                          <>
                            <span
                              className="avatar-stack"
                              title={responsaveis.map((item) => item.nome).join(", ")}
                            >
                              {responsaveis.map((item) => (
                                <Avatar key={item.id} nome={item.nome} cor="#C9E7F5" tamanho="sm" />
                              ))}
                            </span>
                            <span className="sr-only">
                              {responsaveis.map((item) => item.nome).join(", ")}
                            </span>
                          </>
                        ) : (
                          <span className="status nao-lido">Sem responsável</span>
                        )}
                      </td>
                      <td data-label="Situação">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={aluno.ativo}
                            onChange={(evento) => alternarAtivo(aluno, evento.target.checked)}
                          />
                          <span className="track" aria-hidden="true" />
                          <span>{aluno.ativo ? "Ativo" : "Inativo"}</span>
                        </label>
                      </td>
                      <td className="actions">
                        <Link className="btn btn-ghost btn-sm" to={`/admin/alunos/${aluno.id}/editar`}>
                          <Icone nome="edit" className="icon-sm" /> Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icone="search"
            titulo="Nenhum aluno encontrado"
            texto="Revise o termo de busca ou limpe os filtros para ver todos os alunos."
            acoes={
              <button type="button" className="btn btn-secondary" onClick={limpar}>
                Limpar filtros
              </button>
            }
          />
        )}
      </section>

      <Modal
        aberto={importar}
        aoFechar={() => setImportar(false)}
        titulo="Importar alunos por planilha"
        texto="Interface demonstrativa — nenhum arquivo é processado."
        icone="upload"
        tom="ico-ok"
        rodape={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setImportar(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setImportar(false);
                avisar(
                  "Importação simulada concluída",
                  "482 registros seriam criados; 4 linhas com erro ignoradas.",
                  "ok",
                );
              }}
            >
              <Icone nome="upload" /> Importar 482 registros
            </button>
          </>
        }
      >
        <div className="dropzone">
          <Icone nome="upload" className="icon-lg" />
          <b>Arraste o arquivo aqui ou clique para escolher</b>
          <small>.xlsx ou .csv · até 5 MB</small>
        </div>
        <div className="alert neutral">
          <Icone nome="sheet" />
          <div>
            <b>alunos_6ano_2026.xlsx · 486 linhas</b>
            482 válidas · 4 com erro (turma inexistente ou RA duplicado)
          </div>
        </div>
      </Modal>
    </LayoutApp>
  );
}

export function AlunoForm() {
  useTitulo("Aluno");
  const { id } = useParams();
  const navegar = useNavigate();
  const { avisar } = useAviso();
  const aluno = id ? api.aluno(id) : null;
  const [versao, setVersao] = useState(0);
  const [form, setForm] = useState(() => ({
    nome: aluno?.nome || "",
    nasc: aluno?.nasc || "",
    ra: aluno?.ra || proximaMatricula(),
    turma: aluno?.turma || "",
    ativo: aluno?.ativo ?? true,
    consentimento: Boolean(aluno),
  }));
  const [respIds, setRespIds] = useState(() => (aluno ? api.respDoAluno(aluno.id).map((r) => r.id) : []));
  const [selecionado, setSelecionado] = useState("");
  const [erros, setErros] = useState({});
  const [inativando, setInativando] = useState(false);

  // Recarrega os vínculos reais do aluno direto da API.
  useEffect(() => {
    if (!id) return undefined;

    let ativo = true;

    (async () => {
      try {
        const lista = await apiServidor(`/admin/alunos/${id}/responsaveis`);
        if (ativo) setRespIds(lista.map((item) => String(item.id)));
      } catch {
        /* mantém a lista local */
      }
    })();

    return () => {
      ativo = false;
    };
  }, [id]);

  if (id && !aluno) return <Navigate to="/admin/alunos" replace />;

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: "" }));
  }

  async function vincular() {
    if (!selecionado) return;

    if (aluno) {
      try {
        await apiServidor(`/admin/alunos/${aluno.id}/responsaveis`, {
          metodo: "POST",
          corpo: { idResponsavel: Number(selecionado) },
        });
      } catch (erro) {
        avisar("Não foi possível vincular", erro.message, "err");
        return;
      }

      // Mantém o store local coerente sem recarregar todos os dados.
      const responsavel = api.resp(selecionado);
      if (responsavel && !responsavel.alunos.includes(aluno.id)) {
        responsavel.alunos.push(aluno.id);
      }
    }

    setRespIds((atuais) => (atuais.includes(selecionado) ? atuais : [...atuais, selecionado]));
    setSelecionado("");
    setVersao((valor) => valor + 1);
    avisar("Responsável vinculado", "Agora ele pode ver os relatórios publicados.", "ok");
  }

  async function remover(idResp) {
    const anteriores = respIds;

    // Some com o vínculo da tela imediatamente; se a API falhar, ele volta.
    setRespIds((atuais) => atuais.filter((item) => item !== idResp));
    setVersao((valor) => valor + 1);

    if (aluno) {
      try {
        await apiServidor(`/admin/alunos/${aluno.id}/responsaveis/${idResp}`, {
          metodo: "DELETE",
        });
      } catch (erro) {
        setRespIds(anteriores);
        setVersao((valor) => valor + 1);
        avisar("Não foi possível remover o vínculo", erro.message, "err");
        return;
      }

      const responsavel = api.resp(idResp);
      if (responsavel) {
        responsavel.alunos = responsavel.alunos.filter((id) => id !== aluno.id);
      }
    }

    avisar("Vínculo removido", "O responsável não vê mais os relatórios deste aluno.", "warn");
  }

  async function salvar(evento) {
    evento.preventDefault();
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome completo.";
    if (!form.nasc.trim()) novosErros.nasc = "Informe a data de nascimento.";
    if (!form.turma) novosErros.turma = "Selecione a turma.";
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      avisar("Revise os campos destacados", "Há informações obrigatórias faltando.", "err");
      return;
    }

    const nascISO = paraISO(form.nasc);
    if (!nascISO) {
      setErros((atual) => ({ ...atual, nasc: "Use o formato dd/mm/aaaa." }));
      avisar("Data inválida", "Informe a data de nascimento no formato dd/mm/aaaa.", "err");
      return;
    }

    const idTurma = Number(form.turma);
    const idAnoLetivo = Number(anoLetivoAtual());
    if (!idAnoLetivo) {
      avisar(
        "Ano letivo não encontrado",
        "Recarregue a página para atualizar os períodos letivos.",
        "err",
      );
      return;
    }

    const corpo = {
      nome: form.nome.trim(),
      dataNascimento: nascISO,
      matricula: form.ra,
      ativo: form.ativo,
    };

    try {
      if (!aluno) {
        const criado = await apiServidor("/admin/alunos", { metodo: "POST", corpo });
        await apiServidor(`/admin/alunos/${criado.id}/matriculas`, {
          metodo: "POST",
          corpo: { idTurma, idAnoLetivo, dataInicio: dataHojeISO() },
        });
        for (const idResp of respIds) {
          await apiServidor(`/admin/alunos/${criado.id}/responsaveis`, {
            metodo: "POST",
            corpo: { idResponsavel: Number(idResp) },
          });
        }

        const novo = mapAluno({ ...criado, idTurma }, dados.alunos.length);
        dados.alunos.push(novo);

        // Os vínculos já foram criados acima; reflete no store local.
        respIds.forEach((idResp) => {
          const responsavel = api.resp(idResp);
          if (responsavel && !responsavel.alunos.includes(novo.id)) {
            responsavel.alunos.push(novo.id);
          }
        });
      } else {
        const turmaAnterior = aluno.turma;
        const atualizado = await apiServidor(`/admin/alunos/${aluno.id}`, {
          metodo: "PUT",
          corpo,
        });

        aluno.nome = atualizado.nome ?? corpo.nome;
        aluno.nasc = form.nasc;
        aluno.ra = atualizado.matricula ?? corpo.matricula;
        aluno.ativo = atualizado.ativo ?? corpo.ativo;
        aluno.turma = String(atualizado.idTurma ?? idTurma);

        if (String(form.turma) !== String(turmaAnterior)) {
          const matriculas = await apiServidor(`/admin/alunos/${aluno.id}/matriculas`);
          for (const matricula of matriculas.filter((item) => item.ativo)) {
            await apiServidor(
              `/admin/alunos/${aluno.id}/matriculas/${matricula.idTurma}/${matricula.idAnoLetivo}`,
              { metodo: "DELETE" },
            );
          }
          await apiServidor(`/admin/alunos/${aluno.id}/matriculas`, {
            metodo: "POST",
            corpo: { idTurma, idAnoLetivo, dataInicio: dataHojeISO() },
          });
        }
      }

      avisar(
        aluno ? "Aluno atualizado" : "Aluno cadastrado",
        "Os dados foram gravados no banco de dados.",
        "ok",
      );
      navegar("/admin/alunos");
    } catch (erro) {
      avisar("Não foi possível salvar o aluno", erro.message, "err");
    }
  }

  async function inativar() {
    if (!aluno || inativando) return;
    setInativando(true);

    try {
      await apiServidor(`/admin/alunos/${aluno.id}`, { metodo: "DELETE" });
      aluno.ativo = false;
      avisar("Aluno inativado", "Relatórios já publicados continuam no histórico.", "warn");
      navegar("/admin/alunos");
    } catch (erro) {
      avisar("Não foi possível inativar o aluno", erro.message, "err");
    } finally {
      setInativando(false);
    }
  }

  const responsaveis = respIds.map((idResp) => api.resp(idResp)).filter(Boolean);

  return (
    <LayoutApp papel="admin" ativo="alunos">
      <PageHead
        crumbs={[{ label: "Alunos", to: "/admin/alunos" }, { label: aluno ? aluno.nome : "Novo aluno" }]}
        title={aluno ? "Editar aluno" : "Novo aluno"}
        lead="Campos com * são obrigatórios."
      />

      <form className="card stack-lg" style={{ maxWidth: 880 }} onSubmit={salvar} noValidate>
        <section className="form-section">
          <header>
            <h3>Dados pessoais</h3>
            <p>Informações básicas de identificação.</p>
          </header>
          <div className="form-grid">
            <Campo
              label="Nome completo"
              valor={form.nome}
              obrigatorio
              className="span-2"
              erro={erros.nome}
              aoMudar={(valor) => atualizar("nome", valor)}
            />
            <Campo
              label="Data de nascimento"
              valor={form.nasc}
              obrigatorio
              placeholder="dd/mm/aaaa"
              icone="calendar"
              erro={erros.nasc}
              aoMudar={(valor) => atualizar("nasc", valor)}
            />
            <Campo label="RA (registro do aluno)" valor={form.ra} disabled dica="Gerado automaticamente." />
          </div>
        </section>

        <section className="form-section">
          <header>
            <h3>Matrícula</h3>
            <p>Turma do ano letivo de 2026.</p>
          </header>
          <div className="form-grid">
            <Campo
              label="Turma"
              valor={form.turma}
              obrigatorio
              opcoes={[["", "Selecione"], ...dados.turmas.map((item) => [item.id, item.nome])]}
              erro={erros.turma}
              aoMudar={(valor) => atualizar("turma", valor)}
            />
            <div className="field">
              <span className="field-label">Situação</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(evento) => atualizar("ativo", evento.target.checked)}
                />
                <span className="track" aria-hidden="true" />
                <span>Aluno ativo</span>
              </label>
            </div>
          </div>
        </section>

        <section className="form-section">
          <header>
            <h3>Responsáveis autorizados</h3>
            <p>Somente responsáveis vinculados poderão ver os relatórios publicados deste aluno.</p>
          </header>
          <div className="tag-group" key={versao}>
            {responsaveis.length ? (
              responsaveis.map((responsavel) => (
                <span className="pill-person" key={responsavel.id}>
                  <Avatar nome={responsavel.nome} cor="#C9E7F5" tamanho="sm" />
                  {responsavel.nome} · {responsavel.parentesco}
                  <button
                    type="button"
                    aria-label={`Remover vínculo com ${responsavel.nome}`}
                    onClick={() => remover(responsavel.id)}
                  >
                    <Icone nome="x" className="icon-sm" />
                  </button>
                </span>
              ))
            ) : (
              <span className="muted">Nenhum responsável vinculado ainda.</span>
            )}
          </div>
          <div className="row">
            <label className="sr-only" htmlFor="add-resp">
              Adicionar responsável
            </label>
            <select
              id="add-resp"
              className="select"
              style={{ maxWidth: 340 }}
              value={selecionado}
              onChange={(evento) => setSelecionado(evento.target.value)}
            >
              <option value="">Selecione um responsável cadastrado</option>
              {dados.responsaveis.map((responsavel) => (
                <option key={responsavel.id} value={responsavel.id}>
                  {responsavel.nome} ({responsavel.email})
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary" onClick={vincular}>
              <Icone nome="plus" /> Vincular
            </button>
            <Link className="btn btn-ghost" to="/admin/responsaveis/novo">
              Cadastrar novo responsável
            </Link>
          </div>
        </section>

        <section className="form-section">
          <header>
            <h3>Privacidade (LGPD)</h3>
          </header>
          <label className="check">
            <input
              type="checkbox"
              checked={form.consentimento}
              onChange={(evento) => atualizar("consentimento", evento.target.checked)}
            />
            Termo de consentimento assinado pelo responsável
          </label>
        </section>

        <div className="form-actions">
          {aluno && (
            <button
              type="button"
              className="btn btn-danger spacer"
              onClick={inativar}
              disabled={inativando}
            >
              <Icone nome="power" /> {inativando ? "Inativando…" : "Inativar aluno"}
            </button>
          )}
          <Link className="btn btn-secondary" to="/admin/alunos">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primary">
            <Icone nome="check" /> Salvar aluno
          </button>
        </div>
      </form>
    </LayoutApp>
  );
}

/* ============================ PROFESSORES ============================ */

export function Professores() {
  useTitulo("Professores");
  return (
    <LayoutApp papel="admin" ativo="professores">
      <CabecalhoLista
        titulo="Professores"
        lead="Cadastre professores e veja em quais turmas e disciplinas cada um está vinculado."
      >
        <Link className="btn btn-secondary" to="/admin/professores/convites">
          <Icone nome="link" /> Convites
        </Link>
        <Link className="btn btn-primary" to="/admin/professores/novo">
          <Icone nome="plus" /> Novo professor
        </Link>
      </CabecalhoLista>

      <section className="card">
        <AbasCadastro ativa="professores" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Professor</th>
                <th>Disciplinas</th>
                <th>Turmas</th>
                <th>Situação</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.professores.map((professor) => {
                const vinculos = api.vinculosDoProf(professor.id);
                const turmas = [...new Set(vinculos.map((item) => api.turma(item.turma).nome))];
                return (
                  <tr key={professor.id}>
                    <td className="cell-main">
                      <div className="cell-person">
                        <Avatar nome={professor.nome} cor={professor.cor} tamanho="sm" />
                        <span>
                          <b>{professor.nome}</b>
                          <small>{professor.email}</small>
                        </span>
                      </div>
                    </td>
                    <td data-label="Disciplinas">
                      <span className="tag-group">
                        {professor.disc.map((idDisc) => (
                          <span className="tag t-neutro" key={idDisc}>
                            {api.disc(idDisc)?.nome || idDisc}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td data-label="Turmas">
                      {turmas.join(", ") || <span className="muted">Sem vínculo</span>}
                    </td>
                    <td data-label="Situação">
                      {professor.ativo ? (
                        <span className="status publicado">
                          <Icone nome="check" /> Ativo
                        </span>
                      ) : (
                        <span className="status cancelado">
                          <Icone nome="ban" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="actions">
                      <Link
                        className="btn btn-ghost btn-sm"
                        to={`/admin/professores/${professor.id}/editar`}
                      >
                        <Icone nome="edit" className="icon-sm" /> Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutApp>
  );
}

/* ============================ CONVITES ============================ */

function dataCurta(valor) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

function situacaoConvite(convite) {
  if (convite.usado) {
    return { rotulo: "Usado", classe: "cancelado", icone: "check" };
  }
  if (convite.expirado) {
    return { rotulo: "Expirado", classe: "cancelado", icone: "ban" };
  }
  return { rotulo: "Disponível", classe: "publicado", icone: "check" };
}

export function Convites() {
  useTitulo("Convites de professor");
  const { avisar } = useAviso();
  const [form, setForm] = useState({
    email: "",
    matricula: "",
    diasValidade: "7",
  });
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [gerado, setGerado] = useState(null);
  const [convites, setConvites] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregarConvites = useCallback(async () => {
    try {
      const resposta = await apiServidor(
        "/admin/convites?perfil=professor&porPagina=50",
      );
      setConvites(resposta.dados || []);
    } catch (erro) {
      avisar("Não foi possível carregar os convites", erro.message, "err");
    } finally {
      setCarregando(false);
    }
  }, [avisar]);

  useEffect(() => {
    carregarConvites();
  }, [carregarConvites]);

  async function gerar(evento) {
    evento.preventDefault();
    if (enviando) return;

    const novos = {};
    if (form.email.trim() && !emailValido(form.email)) {
      novos.email = "Informe um e-mail válido ou deixe em branco.";
    }
    setErros(novos);
    if (Object.keys(novos).length > 0) return;

    setEnviando(true);

    try {
      const corpo = {
        perfil: "professor",
        diasValidade: Number(form.diasValidade),
      };
      if (form.email.trim()) corpo.email = form.email.trim();
      if (form.matricula.trim()) corpo.matricula = form.matricula.trim();

      const convite = await apiServidor("/admin/convites", {
        metodo: "POST",
        corpo,
      });

      setGerado(convite.codigo);
      setForm({ email: "", matricula: "", diasValidade: form.diasValidade });
      await carregarConvites();
      avisar(
        "Convite gerado",
        `Válido até ${dataCurta(convite.dataExpiracao)}.`,
        "ok",
      );
    } catch (erro) {
      avisar("Não foi possível gerar o convite", erro.message, "err");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar(codigo) {
    try {
      await navigator.clipboard.writeText(codigo);
      avisar("Código copiado", codigo, "ok");
    } catch {
      avisar("Copie o código", codigo, "info");
    }
  }

  async function revogar(convite) {
    if (enviando) return;

    setEnviando(true);

    try {
      await apiServidor(`/admin/convites/${convite.id}`, { metodo: "DELETE" });
      setConvites((atuais) =>
        atuais.filter((item) => item.id !== convite.id),
      );
      avisar("Convite revogado", convite.codigo, "info");
    } catch (erro) {
      avisar("Não foi possível revogar o convite", erro.message, "err");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutApp papel="admin" ativo="professores">
      <PageHead
        crumbs={[
          { label: "Estrutura escolar" },
          { label: "Professores", to: "/admin/professores" },
          { label: "Convites" },
        ]}
        title="Convites de professor"
        lead="Gere um código para o professor criar a própria conta. Cada convite vale uma vez, para o e-mail e o prazo escolhidos."
        actions={
          <Link className="btn btn-secondary" to="/admin/professores">
            <Icone nome="chevron-left" /> Voltar
          </Link>
        }
      />

      {gerado && (
        <div className="alert success" role="status">
          <Icone nome="check" />
          <div>
            <b>Código {gerado}</b>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => copiar(gerado)}
              >
                Copiar código
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card">
        <h2>Criar convite</h2>
        <form className="stack" onSubmit={gerar} noValidate>
          <div className="form-grid">
            <Campo
              id="convite-email"
              label="E-mail do professor"
              tipo="email"
              valor={form.email}
              aoMudar={(valor) =>
                setForm((atual) => ({ ...atual, email: valor }))
              }
              placeholder="nome@escola.edu.br"
              dica="Opcional. Com e-mail, o código só vale para este endereço."
              erro={erros.email}
              inputMode="email"
              autoComplete="off"
            />
            <Campo
              id="convite-matricula"
              label="Matrícula"
              valor={form.matricula}
              aoMudar={(valor) =>
                setForm((atual) => ({ ...atual, matricula: valor }))
              }
              placeholder="P001"
              dica="Opcional. Sem matrícula, o sistema gera uma automaticamente."
              maxLength={30}
              autoComplete="off"
            />
            <Campo
              id="convite-validade"
              label="Validade"
              valor={form.diasValidade}
              aoMudar={(valor) =>
                setForm((atual) => ({ ...atual, diasValidade: valor }))
              }
              opcoes={[
                ["3", "3 dias"],
                ["7", "7 dias"],
                ["15", "15 dias"],
                ["30", "30 dias"],
              ]}
            />
          </div>
          <div className="row">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={enviando}
            >
              <Icone nome="link" /> Gerar código
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Últimos convites</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Para</th>
                <th>Validade</th>
                <th>Situação</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {convites.map((convite) => {
                const situacao = situacaoConvite(convite);
                return (
                  <tr key={convite.id}>
                    <td className="cell-main">
                      <b>{convite.codigo}</b>
                    </td>
                    <td data-label="Para">
                      {convite.email || (
                        <span className="muted">Qualquer e-mail</span>
                      )}
                      {convite.matricula && (
                        <>
                          <br />
                          <small>Matrícula {convite.matricula}</small>
                        </>
                      )}
                    </td>
                    <td data-label="Validade">
                      {dataCurta(convite.dataExpiracao)}
                    </td>
                    <td data-label="Situação">
                      <span className={`status ${situacao.classe}`}>
                        <Icone nome={situacao.icone} /> {situacao.rotulo}
                      </span>
                    </td>
                    <td className="actions">
                      {!convite.usado && (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => copiar(convite.codigo)}
                          >
                            <Icone nome="file" className="icon-sm" /> Copiar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => revogar(convite)}
                            disabled={enviando}
                          >
                            <Icone nome="ban" className="icon-sm" /> Revogar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!carregando && convites.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Nenhum convite gerado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutApp>
  );
}

export function ProfessorForm() {
  useTitulo("Professor");
  const { id } = useParams();
  const navegar = useNavigate();
  const { avisar } = useAviso();
  const professor = id ? api.prof(id) : null;
  const [form, setForm] = useState(() => ({
    nome: professor?.nome || "",
    email: professor?.email || "",
    matricula: professor?.matricula || "",
    senha: "",
    ativo: professor?.ativo ?? true,
  }));
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (id && !professor) return <Navigate to="/admin/professores" replace />;

  const vinculos = professor ? api.vinculosDoProf(professor.id) : [];

  async function salvar(evento) {
    evento.preventDefault();
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome completo.";
    if (!form.email.includes("@")) novosErros.email = "Informe um e-mail válido.";
    if (!form.matricula.trim()) novosErros.matricula = "Informe a matrícula.";
    if (!professor && form.senha.length < 8) {
      novosErros.senha = "A senha inicial deve ter ao menos 8 caracteres.";
    }
    if (professor && form.senha && form.senha.length < 8) {
      novosErros.senha = "A nova senha deve ter ao menos 8 caracteres.";
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      avisar("Revise os campos destacados", "Há informações obrigatórias faltando.", "err");
      return;
    }

    setEnviando(true);

    try {
      if (professor) {
        const corpo = {
          nome: form.nome.trim(),
          email: form.email.trim(),
          matricula: form.matricula.trim(),
          ativo: form.ativo,
        };
        if (form.senha) corpo.senha = form.senha;

        const atualizado = await apiServidor(`/admin/professores/${professor.id}`, {
          metodo: "PUT",
          corpo,
        });

        professor.nome = atualizado.nome ?? corpo.nome;
        professor.email = atualizado.email ?? corpo.email;
        professor.matricula = atualizado.matricula ?? corpo.matricula;
        professor.ativo = atualizado.ativo ?? corpo.ativo;
        avisar("Professor atualizado", "Os dados foram salvos no banco.", "ok");
      } else {
        const criado = await apiServidor("/admin/professores", {
          metodo: "POST",
          corpo: {
            nome: form.nome.trim(),
            email: form.email.trim(),
            matricula: form.matricula.trim(),
            senha: form.senha,
            ativo: form.ativo,
          },
        });

        // A criação sempre nasce ativa; o DELETE desativa a conta.
        if (!form.ativo) {
          await apiServidor(`/admin/professores/${criado.id}`, { metodo: "DELETE" });
        }

        dados.professores.push(
          mapProfessor({ ...criado, ativo: form.ativo }, dados.professores.length),
        );

        avisar(
          "Professor cadastrado",
          "A conta já pode entrar com o e-mail e a senha informados.",
          "ok",
        );
      }

      navegar("/admin/professores");
    } catch (erro) {
      avisar("Não foi possível salvar o professor", erro.message, "err");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutApp papel="admin" ativo="professores">
      <PageHead
        crumbs={[
          { label: "Professores", to: "/admin/professores" },
          { label: professor ? professor.nome : "Novo professor" },
        ]}
        title={professor ? "Editar professor" : "Novo professor"}
        lead="Campos com * são obrigatórios."
      />
      <div className="grid-main-side">
        <form className="card stack-lg" onSubmit={salvar} noValidate>
          <section className="form-section">
            <header>
              <h3>Identificação</h3>
            </header>
            <div className="form-grid">
              <Campo
                label="Nome completo"
                valor={form.nome}
                obrigatorio
                className="span-2"
                erro={erros.nome}
                aoMudar={(valor) => setForm((atual) => ({ ...atual, nome: valor }))}
              />
              <Campo
                label="E-mail institucional"
                tipo="email"
                valor={form.email}
                obrigatorio
                icone="mail"
                dica="Usado para login e recuperação de senha."
                erro={erros.email}
                aoMudar={(valor) => setForm((atual) => ({ ...atual, email: valor }))}
              />
              <Campo
                label="Matrícula"
                valor={form.matricula}
                obrigatorio
                placeholder="Ex.: PROF-2026-01"
                erro={erros.matricula}
                aoMudar={(valor) => setForm((atual) => ({ ...atual, matricula: valor }))}
              />
            </div>
          </section>

          <section className="form-section">
            <header>
              <h3>Acesso</h3>
            </header>
            <div className="form-grid">
              <Campo
                label={professor ? "Nova senha" : "Senha inicial"}
                tipo="password"
                valor={form.senha}
                obrigatorio={!professor}
                erro={erros.senha}
                dica={
                  professor
                    ? "Deixe em branco para manter a senha atual."
                    : "Mínimo de 8 caracteres. O professor usará esta senha para entrar."
                }
                aoMudar={(valor) => setForm((atual) => ({ ...atual, senha: valor }))}
              />
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(evento) => setForm((atual) => ({ ...atual, ativo: evento.target.checked }))}
              />
              <span className="track" aria-hidden="true" />
              <span>Professor ativo</span>
            </label>
            <div className="alert info">
              <Icone nome="link" />
              <div>
                Turmas e disciplinas são associadas na tela de Vínculos, depois que a conta existir.
              </div>
            </div>
          </section>

          <div className="form-actions">
            <Link className="btn btn-secondary" to="/admin/professores">
              Cancelar
            </Link>
            <button className="btn btn-primary" type="submit" disabled={enviando}>
              <Icone nome="check" /> {enviando ? "Salvando…" : "Salvar professor"}
            </button>
          </div>
        </form>

        <aside className="card">
          <h2 style={{ fontSize: "1.125rem" }}>Vínculos atuais</h2>
          {vinculos.length ? (
            <ul className="stack-sm" style={{ listStyle: "none" }}>
              {vinculos.map((vinculo) => (
                <li className="row-between" key={`${vinculo.turma}-${vinculo.disc}`}>
                  <span>
                    <b>{api.turma(vinculo.turma)?.nome}</b> · {api.disc(vinculo.disc)?.nome}
                  </span>
                  <Link className="btn btn-ghost btn-sm" to={`/admin/turmas/${vinculo.turma}`}>
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sem vínculos. Use a tela de vínculos para associar turmas e disciplinas.</p>
          )}
          <Link className="btn btn-secondary" to="/admin/vinculos">
            <Icone nome="link" /> Gerenciar vínculos
          </Link>
        </aside>
      </div>
    </LayoutApp>
  );
}

/* ============================ RESPONSÁVEIS ============================ */

export function Responsaveis() {
  useTitulo("Responsáveis");
  return (
    <LayoutApp papel="admin" ativo="responsaveis">
      <CabecalhoLista
        titulo="Responsáveis e vínculos familiares"
        lead="Um responsável pode estar vinculado a mais de um aluno, e um aluno pode ter mais de um responsável."
      >
        <Link className="btn btn-primary" to="/admin/responsaveis/novo">
          <Icone nome="plus" /> Novo responsável
        </Link>
      </CabecalhoLista>

      <section className="card">
        <AbasCadastro ativa="responsaveis" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Responsável</th>
                <th>Alunos vinculados</th>
                <th>Parentesco</th>
                <th>Consentimento LGPD</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.responsaveis.map((responsavel) => (
                <tr key={responsavel.id}>
                  <td className="cell-main">
                    <div className="cell-person">
                      <Avatar nome={responsavel.nome} cor="#C9E7F5" tamanho="sm" />
                      <span>
                        <b>{responsavel.nome}</b>
                        <small>{responsavel.email}</small>
                      </span>
                    </div>
                  </td>
                  <td data-label="Alunos">
                    <span className="tag-group">
                      {responsavel.alunos.map((idAluno) => {
                        const aluno = api.aluno(idAluno);
                        if (!aluno) return null;
                        return (
                          <span className="tag t-azul" key={idAluno}>
                            {aluno.nome} · {api.turma(aluno.turma)?.nome}
                          </span>
                        );
                      })}
                    </span>
                  </td>
                  <td data-label="Parentesco">{responsavel.parentesco}</td>
                  <td data-label="LGPD">
                    {responsavel.consentimento !== "—" ? (
                      <span className="status publicado">
                        <Icone nome="check" />
                        Registrado {responsavel.consentimento}
                      </span>
                    ) : (
                      <span className="status nao-lido">
                        <Icone nome="alert" />
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="actions">
                    <Link
                      className="btn btn-ghost btn-sm"
                      to={`/admin/responsaveis/${responsavel.id}/editar`}
                    >
                      <Icone nome="edit" className="icon-sm" /> Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutApp>
  );
}

export function ResponsavelForm() {
  useTitulo("Responsável");
  const { id } = useParams();
  const navegar = useNavigate();
  const { avisar } = useAviso();
  const responsavel = id ? api.resp(id) : null;
  const [form, setForm] = useState(() => ({
    nome: responsavel?.nome || "",
    email: responsavel?.email || "",
    tel: responsavel?.tel || "",
    senha: "",
    parentesco: responsavel?.parentesco || "",
    alunos: responsavel?.alunos || [],
  }));
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);

  if (id && !responsavel) return <Navigate to="/admin/responsaveis" replace />;

  function alternarAluno(idAluno) {
    setForm((atual) => ({
      ...atual,
      alunos: atual.alunos.includes(idAluno)
        ? atual.alunos.filter((item) => item !== idAluno)
        : [...atual.alunos, idAluno],
    }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    const novosErros = {};
    if (!form.nome.trim()) novosErros.nome = "Informe o nome completo.";
    if (!form.email.includes("@")) novosErros.email = "Informe um e-mail válido.";
    if (!form.parentesco) novosErros.parentesco = "Selecione o parentesco.";
    if (!responsavel && form.senha.length < 8) {
      novosErros.senha = "A senha inicial deve ter ao menos 8 caracteres.";
    }
    if (responsavel && form.senha && form.senha.length < 8) {
      novosErros.senha = "A nova senha deve ter ao menos 8 caracteres.";
    }
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      avisar("Revise os campos destacados", "Há informações obrigatórias faltando.", "err");
      return;
    }

    setEnviando(true);

    try {
      let idResponsavel = responsavel?.id;
      let criado = null;

      const corpo = {
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.tel.trim(),
      };

      if (responsavel) {
        if (form.senha) corpo.senha = form.senha;
        await apiServidor(`/admin/responsaveis/${idResponsavel}`, {
          metodo: "PUT",
          corpo,
        });
      } else {
        corpo.senha = form.senha;
        criado = await apiServidor("/admin/responsaveis", {
          metodo: "POST",
          corpo,
        });
        idResponsavel = criado.id;
      }

      // O POST de vínculo é um upsert: atualiza também o parentesco.
      const atuais = responsavel?.alunos || [];
      const remover = atuais.filter((idAluno) => !form.alunos.includes(idAluno));
      const falhas = [];

      await Promise.all([
        ...form.alunos.map(async (idAluno) => {
          try {
            await apiServidor(`/admin/alunos/${idAluno}/responsaveis`, {
              metodo: "POST",
              corpo: {
                idResponsavel: Number(idResponsavel),
                tipoRelacao: form.parentesco,
              },
            });
          } catch (erro) {
            falhas.push(erro.message);
          }
        }),
        ...remover.map(async (idAluno) => {
          try {
            await apiServidor(`/admin/alunos/${idAluno}/responsaveis/${idResponsavel}`, {
              metodo: "DELETE",
            });
          } catch (erro) {
            falhas.push(erro.message);
          }
        }),
      ]);

      // Mantém o store local coerente sem recarregar todos os dados.
      const alunos = [...form.alunos];
      const consentimento = alunos.length ? "pela escola" : "—";

      if (responsavel) {
        responsavel.nome = corpo.nome;
        responsavel.email = corpo.email;
        responsavel.tel = corpo.telefone;
        responsavel.alunos = alunos;
        responsavel.parentesco = form.parentesco;
        responsavel.consentimento = consentimento;
      } else if (criado) {
        const novo = mapResponsavel(criado, dados.responsaveis.length);
        novo.alunos = alunos;
        novo.parentesco = form.parentesco;
        novo.consentimento = consentimento;
        dados.responsaveis.push(novo);
      }

      if (falhas.length) {
        avisar(
          "Responsável salvo com pendências",
          `Não foi possível atualizar ${falhas.length} vínculo(s): ${falhas[0]}`,
          "warn",
        );
      } else {
        avisar(
          responsavel ? "Responsável atualizado" : "Responsável cadastrado",
          "Os dados e vínculos foram salvos no banco.",
          "ok",
        );
      }

      navegar("/admin/responsaveis");
    } catch (erro) {
      avisar("Não foi possível salvar o responsável", erro.message, "err");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutApp papel="admin" ativo="responsaveis">
      <PageHead
        crumbs={[
          { label: "Responsáveis", to: "/admin/responsaveis" },
          { label: responsavel ? responsavel.nome : "Novo responsável" },
        ]}
        title={responsavel ? "Editar responsável" : "Novo responsável"}
        lead="O vínculo com o aluno define o que a família pode acompanhar."
      />
      <form className="card stack-lg" style={{ maxWidth: 880 }} onSubmit={salvar} noValidate>
        <section className="form-section">
          <header>
            <h3>Contato</h3>
          </header>
          <div className="form-grid">
            <Campo
              label="Nome completo"
              valor={form.nome}
              obrigatorio
              className="span-2"
              erro={erros.nome}
              aoMudar={(valor) => setForm((atual) => ({ ...atual, nome: valor }))}
            />
            <Campo
              label="E-mail"
              tipo="email"
              valor={form.email}
              obrigatorio
              icone="mail"
              erro={erros.email}
              aoMudar={(valor) => setForm((atual) => ({ ...atual, email: valor }))}
            />
            <Campo
              label="Telefone"
              valor={form.tel}
              aoMudar={(valor) => setForm((atual) => ({ ...atual, tel: valor }))}
            />
            <Campo
              label={responsavel ? "Nova senha" : "Senha inicial"}
              tipo="password"
              valor={form.senha}
              obrigatorio={!responsavel}
              erro={erros.senha}
              dica={
                responsavel
                  ? "Deixe em branco para manter a senha atual."
                  : "Mínimo de 8 caracteres. O responsável usará esta senha para entrar."
              }
              aoMudar={(valor) => setForm((atual) => ({ ...atual, senha: valor }))}
            />
          </div>
        </section>

        <section className="form-section">
          <header>
            <h3>Alunos vinculados</h3>
            <p>Marque os alunos que este responsável pode acompanhar e informe o parentesco.</p>
          </header>
          <div className="vinc-list">
            {dados.alunos.map((aluno) => (
              <label className="vinc-item" key={aluno.id}>
                <input
                  type="checkbox"
                  checked={form.alunos.includes(aluno.id)}
                  onChange={() => alternarAluno(aluno.id)}
                />
                <Avatar nome={aluno.nome} cor={aluno.cor} tamanho="sm" />
                <span className="grow">
                  <b>{aluno.nome}</b>
                  <small>
                    {api.turma(aluno.turma)?.nome} · RA {aluno.ra}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <div className="form-grid">
            <Campo
              label="Parentesco"
              valor={form.parentesco}
              obrigatorio
              opcoes={[
                ["", "Selecione"],
                "Mãe",
                "Pai",
                "Avó",
                "Avô",
                "Tia",
                "Tio",
                "Responsável legal",
              ]}
              erro={erros.parentesco}
              aoMudar={(valor) => setForm((atual) => ({ ...atual, parentesco: valor }))}
            />
          </div>
          <div className="alert neutral">
            <Icone nome="shield" />
            <div>
              Ao vincular, a coordenação autoriza este responsável a ver os relatórios
              publicados dos alunos marcados (LGPD).
            </div>
          </div>
        </section>

        <div className="form-actions">
          <Link className="btn btn-secondary" to="/admin/responsaveis">
            Cancelar
          </Link>
          <button className="btn btn-primary" type="submit" disabled={enviando}>
            <Icone nome="check" /> {enviando ? "Salvando…" : "Salvar responsável"}
          </button>
        </div>
      </form>
    </LayoutApp>
  );
}
