/* ============================================================================
   models.js — Definição dos 3 modelos de receita e seus renderizadores.
   Cada render(d) devolve o HTML interno da folha .a4.
   d = { medico_*, paciente_*, itens[], data_emissao, cidade, ... }
   ============================================================================ */
(function (global) {
  "use strict";

  const MESES = ["", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, m => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
    ));
  }
  function nl2br(s) { return esc(s).replace(/\n/g, "<br>"); }

  function fmtData(iso) {
    const d = iso && !isNaN(Date.parse(iso)) ? new Date(iso + "T00:00:00") : new Date();
    return { dia: String(d.getDate()).padStart(2, "0"),
             mes: String(d.getMonth() + 1).padStart(2, "0"),
             mesNome: MESES[d.getMonth() + 1],
             ano: d.getFullYear() };
  }

  function emitenteBlock(d) {
    if (!d.medico_nome) {
      return '<div class="rx-emit-name"><span class="rx-blank"></span></div>' +
             '<div class="rx-emit-line">CRM: <span class="rx-blank" style="min-width:30mm"></span> ' +
             'UF: <span class="rx-blank" style="min-width:12mm"></span></div>';
    }
    let esp = d.medico_especialidade ? esc(d.medico_especialidade) : "Médico(a)";
    if (d.medico_rqe) esp += " — RQE Nº " + esc(d.medico_rqe);
    let html = '<div class="rx-emit-name">' + esc(d.medico_nome) + "</div>" +
      '<div class="rx-emit-sub">' + esp + "</div>" +
      '<div class="rx-emit-line">CRM-' + esc(d.medico_uf) + " " + esc(d.medico_crm) + "</div>";
    if (d.medico_endereco) html += '<div class="rx-emit-sub">' + esc(d.medico_endereco) +
      (d.cidade ? " — " + esc(d.cidade) : "") + "</div>";
    if (d.medico_telefone) html += '<div class="rx-emit-sub">Tel: ' + esc(d.medico_telefone) + "</div>";
    return html;
  }

  function listaPrescricao(itens) {
    if (!itens || !itens.length) return '<ol class="rx-list"><li>&nbsp;</li></ol>';
    let html = '<ol class="rx-list">';
    itens.forEach(it => {
      if (!it.nome) return;
      html += "<li><span class='med'>" + esc(it.nome) + "</span>";
      if (it.quantidade) html += " <span class='qtd'>——— " + esc(it.quantidade) + "</span>";
      if (it.posologia) html += "<span class='pos'>" + nl2br(it.posologia) + "</span>";
      html += "</li>";
    });
    return html + "</ol>";
  }

  const caduceu = `<svg class="caduceu" viewBox="0 0 60 90" width="40" height="60" xmlns="http://www.w3.org/2000/svg">
    <line x1="30" y1="5" x2="30" y2="82" stroke="#222" stroke-width="2.5"/>
    <path d="M30 14 Q16 6 10 15 Q16 22 30 18 Z" fill="#222"/>
    <path d="M30 14 Q44 6 50 15 Q44 22 30 18 Z" fill="#222"/>
    <path d="M30 22 Q19 30 24 39 Q30 47 20 56 Q14 62 21 70 Q27 75 30 72" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M30 22 Q41 30 36 39 Q30 47 40 56 Q46 62 39 70 Q33 75 30 72" fill="none" stroke="#222" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="30" cy="71" rx="3.5" ry="2.5" fill="#222"/></svg>`;

  function assinaturaBlock(d, rotulo) {
    const stamp = global.Stamp.build(d);
    return '<div class="rx-sign"><div class="sign-col">' +
      '<div class="rx-stampbox"><div class="stamp-holder">' + stamp + "</div></div>" +
      '<div class="rx-sign-line">' + esc(rotulo) + "</div>" +
      "</div></div>";
  }

  /* ── MODELO 1 — Simples Clássica ─────────────────────────────────────── */
  function renderClassica(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body">' +
        '<div class="rx-head">' + caduceu +
          '<div class="doc">' + emitenteBlock(d) + "</div>" +
          '<div class="titulo">Receituário</div>' +
        "</div>" +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' +
          esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        listaPrescricao(d.itens) +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " +
          dt.dia + " de " + dt.mesNome + " de " + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico") +
      "</div>"
    );
  }

  /* ── MODELO 2 — Simples Renovável ────────────────────────────────────── */
  function renderRenovavel(d) {
    const dt = fmtData(d.data_emissao);
    const validade = d.validade_meses || 6;
    return (
      '<div class="rx-body">' +
        '<div class="rx-head">' +
          '<div class="titulo">RECEITUÁRIO</div>' +
          '<div class="reno-badge">RECEITA RENOVÁVEL · USO CONTÍNUO</div>' +
          '<div class="rx-emit-line" style="margin-top:2mm">' + emitenteBlock(d) + "</div>" +
        "</div>" +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' +
          esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        listaPrescricao(d.itens) +
        '<div class="reno-box">' +
          '<div class="rb-title">CONTROLE DE RENOVAÇÃO — VÁLIDA POR ' + validade + ' MESES</div>' +
          '<div class="reno-vias">' +
            renoVia("1ª") + renoVia("2ª") + renoVia("3ª") +
            renoVia("4ª") + renoVia("5ª") + renoVia("6ª") +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " +
          dt.dia + " de " + dt.mesNome + " de " + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico") +
      "</div>"
    );
  }
  function renoVia(n) {
    return '<div class="via"><div class="chk"></div>' + n + " via<br><small>__/__/____</small></div>";
  }

  /* ── MODELO 3 — C.E. Mod. 01 ─────────────────────────────────────────── */
  function renderCE1(d) {
    const dt = fmtData(d.data_emissao);
    const end = [d.paciente_endereco, d.paciente_bairro, d.cidade].filter(Boolean).join(", ");
    return (
      '<div class="rx-body">' +
        '<div class="rx-topo">' +
          '<div class="topo-left">' + emitenteBlock(d) + "</div>" +
          '<div class="topo-right">' +
            '<div class="t1">RECEITUÁRIO</div>' +
            '<div class="t2">CONTROLE<br>ESPECIAL</div>' +
            '<div class="vias">1ª via farmácia · 2ª via paciente</div>' +
          "</div>" +
        "</div>" +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' +
          esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-field"><span class="lbl">Endereço: </span><span class="val">' +
          esc(end) + "</span></div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">Data: ' +
          '<span class="campo">' + dt.dia + "</span>/" +
          '<span class="campo">' + dt.mes + "</span>/" +
          '<span class="campo">' + dt.ano + "</span></div>" +
        assinaturaBlock(d, "Assinatura e carimbo do médico") +
        '<div class="ce-boxes">' +
          '<div class="ce-box"><div class="cbt">IDENTIFICAÇÃO DO COMPRADOR</div>' +
            'Nome:<div class="ce-line"></div>Ident.:<div class="ce-line"></div>' +
            'End.:<div class="ce-line"></div>Cidade/UF:<div class="ce-line"></div></div>' +
          '<div class="ce-box"><div class="cbt">IDENTIFICAÇÃO DO FORNECEDOR</div>' +
            '<div style="height:16mm"></div><div class="ce-line"></div>' +
            'Assinatura do farmacêutico &nbsp;&nbsp; Data: __/__/____</div>' +
        "</div>" +
      "</div>"
    );
  }

  /* ── Catálogo ────────────────────────────────────────────────────────── */
  const MODELS = [
    { id: "simples_classica", categoria: "Receitas Simples", cls: "m-classica",
      nome: "Receita Simples Clássica", desc: "Cabeçalho com caduceu e assinatura ao pé.",
      render: renderClassica },
    { id: "simples_renovavel", categoria: "Receitas Simples", cls: "m-renovavel",
      nome: "Receita Simples Renovável", desc: "Uso contínuo, com quadro de renovação (até 6 vias).",
      render: renderRenovavel },
    { id: "ce_mod01", categoria: "Receitas de Controle Especial", cls: "m-ce1",
      nome: "Modelo C.E. Mod. 01", desc: "Controle especial, 2 vias, campos de comprador e fornecedor.",
      render: renderCE1 },
  ];

  global.Models = {
    all: MODELS,
    byId: id => MODELS.find(m => m.id === id),
    categories: () => {
      const map = {};
      MODELS.forEach(m => { (map[m.categoria] = map[m.categoria] || []).push(m); });
      return map;
    },
  };
})(window);
