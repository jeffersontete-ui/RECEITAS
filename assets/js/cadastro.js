/* ============================================================================
   cadastro.js — Cadastro de médicos, medicamentos e pacientes.
   Além dos nomes usados no autocompletar, guarda a LINHA INTEIRA do CSV,
   para que ao digitar o nome do médico o CRM (e UF, especialidade, RQE,
   endereço, telefone) sejam preenchidos sozinhos.
   ============================================================================ */
(function (global) {
  "use strict";

  /* Colunas reconhecidas em cada lista. A primeira que existir no cabeçalho
     do CSV é a usada — assim vale para arquivos com nomes diferentes.       */
  const KINDS = {
    medicos: {
      key: "rx_rec_medicos",
      nome: ["NOME", "MEDICO", "MÉDICO", "NOME_MEDICO", "PROFISSIONAL", "NAME"],
      campos: {
        crm:           ["CRM", "REGISTRO", "NUMERO", "NÚMERO", "N_CRM", "CRM_NUMERO", "INSCRICAO", "INSCRIÇÃO"],
        uf:            ["UF", "CRM_UF", "ESTADO"],
        conselho:      ["CONSELHO", "ORGAO", "ÓRGÃO", "TIPO"],
        especialidade: ["ESPECIALIDADE", "ESP", "AREA", "ÁREA"],
        rqe:           ["RQE", "RQE_NUMERO"],
        endereco:      ["ENDERECO", "ENDEREÇO", "CONSULTORIO", "CONSULTÓRIO", "MED_ENDERECO"],
        telefone:      ["TELEFONE", "FONE", "TEL", "CELULAR", "CONTATO"],
      },
    },
    medicamentos: {
      key: "rx_rec_medicamentos",
      nome: ["NOME", "PRODUTO", "MEDICAMENTO", "DESCRICAO", "DESCRIÇÃO"],
      campos: {
        forma:    ["FORMA_FARMACEUTICA", "FORMA", "APRESENTACAO", "APRESENTAÇÃO"],
        registro: ["REGISTRO", "MS", "REG"],
        lista:    ["LISTA", "CONTROLE", "PORTARIA"],
      },
    },
    pacientes: {
      key: "rx_rec_pacientes",
      nome: ["CLIENTE", "PACIENTE", "NOME", "NAME"],
      campos: {
        cpf:      ["CLI_CPF", "CPF", "DOCUMENTO"],
        endereco: ["CLI_ENDERECO", "ENDERECO", "ENDEREÇO"],
        bairro:   ["CLI_BAIRRO", "BAIRRO"],
        cidade:   ["CLI_CIDADE", "CIDADE", "MUNICIPIO", "MUNICÍPIO"],
      },
    },
  };

  /* ── Leitura de CSV ────────────────────────────────────────────────── */
  function splitCsvLine(line, delim) {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === delim) { out.push(cur); cur = ""; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function detectDelim(headerLine) {
    const c = {
      ";": (headerLine.match(/;/g) || []).length,
      ",": (headerLine.match(/,/g) || []).length,
      "\t": (headerLine.match(/\t/g) || []).length,
    };
    return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || ";";
  }

  function colOf(headers, nomes) {
    const H = headers.map(h => h.trim().toUpperCase().replace(/^"|"$/g, ""));
    for (const w of nomes) { const i = H.indexOf(w); if (i >= 0) return i; }
    return -1;
  }

  /* Lê o CSV e devolve { nomes:[], registros:[{nome, ...campos}] }.        */
  function parse(text, kind) {
    const K = KINDS[kind];
    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length);
    if (!K || !lines.length) return { nomes: [], registros: [] };

    const delim = detectDelim(lines[0]);
    const headers = splitCsvLine(lines[0], delim);
    let cNome = colOf(headers, K.nome);
    if (cNome < 0) cNome = kind === "pacientes" ? Math.min(1, headers.length - 1) : 0;

    const cols = {};
    Object.keys(K.campos).forEach(f => { cols[f] = colOf(headers, K.campos[f]); });

    const nomes = [], registros = [], vistos = new Set();
    for (let i = 1; i < lines.length; i++) {
      const p = splitCsvLine(lines[i], delim);
      const nome = (p[cNome] || "").trim().replace(/^"|"$/g, "");
      if (!nome || nome.length < 2 || /^\d+$/.test(nome)) continue;
      const chave = norm(nome);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const reg = { nome: nome };
      Object.keys(cols).forEach(f => {
        if (cols[f] >= 0) reg[f] = (p[cols[f]] || "").trim().replace(/^"|"$/g, "");
      });
      nomes.push(nome);
      registros.push(reg);
    }
    return { nomes, registros };
  }

  /* ── Normalização e busca ──────────────────────────────────────────── */
  function norm(s) {
    return String(s == null ? "" : s)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[.,;:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  // Tira tratamentos (dr, dra, doutor…) para casar "João Silva" com "Dr. João Silva".
  function semTratamento(s) {
    return norm(s).replace(/^(dr|dra|drª|doutor|doutora|prof|profa|sr|sra)\s+/i, "").trim();
  }

  const memoria = {};   // { medicos: [registros], ... }

  function set(kind, registros) {
    memoria[kind] = registros || [];
    try { localStorage.setItem(KINDS[kind].key, JSON.stringify(memoria[kind])); } catch (_) {}
  }
  function get(kind) {
    if (memoria[kind]) return memoria[kind];
    try {
      const s = localStorage.getItem(KINDS[kind].key);
      memoria[kind] = s ? JSON.parse(s) : [];
    } catch (_) { memoria[kind] = []; }
    return memoria[kind];
  }
  function clear(kind) {
    memoria[kind] = [];
    try { localStorage.removeItem(KINDS[kind].key); } catch (_) {}
  }

  /* Procura o registro pelo nome digitado.
     1) igual   2) igual ignorando "Dr./Dra."   3) começa com (se for único)
     4) contém (se for único). Devolve null quando há dúvida.              */
  function lookup(kind, nome) {
    const regs = get(kind);
    if (!regs.length) return null;
    const alvo = norm(nome);
    if (alvo.length < 3) return null;
    const alvoST = semTratamento(nome);

    let r = regs.find(x => norm(x.nome) === alvo);
    if (r) return r;
    r = regs.find(x => semTratamento(x.nome) === alvoST);
    if (r) return r;

    const comeca = regs.filter(x => semTratamento(x.nome).startsWith(alvoST));
    if (comeca.length === 1) return comeca[0];
    const contem = regs.filter(x => semTratamento(x.nome).indexOf(alvoST) >= 0);
    if (contem.length === 1) return contem[0];
    return null;
  }

  /* Busca pelo número do CRM (útil para conferência). */
  function lookupCrm(crm) {
    const alvo = String(crm || "").replace(/\D/g, "");
    if (alvo.length < 3) return null;
    const achados = get("medicos").filter(x => String(x.crm || "").replace(/\D/g, "") === alvo);
    return achados.length === 1 ? achados[0] : null;
  }

  /* Preenche os campos de destino sem apagar o que o usuário digitou.
     destinos = [{ el, valor }] — só escreve se o campo estiver vazio ou se
     o valor atual tiver sido escrito por um preenchimento anterior.        */
  function preencher(destinos, memo) {
    let n = 0;
    destinos.forEach(d => {
      if (!d.el || !d.valor) return;
      const atual = (d.el.value || "").trim();
      const anterior = memo ? memo[d.chave] : null;
      if (atual === "" || (anterior != null && atual === anterior)) {
        if (atual !== d.valor) {
          d.el.value = d.valor;
          d.el.dispatchEvent(new Event("input", { bubbles: true }));
          n++;
        }
        if (memo) memo[d.chave] = d.valor;
      }
    });
    return n;
  }

  global.Cadastro = {
    KINDS, parse, norm, semTratamento,
    set, get, clear, lookup, lookupCrm, preencher,
  };
})(window);
