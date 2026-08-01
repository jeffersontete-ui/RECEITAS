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

  /* ── Blocos reutilizáveis: comprador + fornecedor ────────────────────── */
  function compradorFornecedor() {
    return (
      '<div class="ce-boxes">' +
        '<div class="ce-box"><div class="cbt">IDENTIFICAÇÃO DO COMPRADOR</div>' +
          'Nome:<div class="ce-line"></div>' +
          'Ident.:<div class="ce-line"></div>' +
          'End.:<div class="ce-line"></div>' +
          'Cidade/UF:<div class="ce-line"></div></div>' +
        '<div class="ce-box"><div class="cbt">IDENTIFICAÇÃO DO FORNECEDOR</div>' +
          '<div style="flex:1"></div><div class="ce-line"></div>' +
          'Assinatura do farmacêutico &nbsp;&nbsp; Data: __/__/____</div>' +
      "</div>"
    );
  }

  function pacienteEndereco(d) {
    const end = [d.paciente_endereco, d.paciente_bairro, d.cidade].filter(Boolean).join(", ");
    return (
      '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' +
        esc(d.paciente_nome) + "</span></div>" +
      '<div class="rx-field"><span class="lbl">Endereço: </span><span class="val">' +
        esc(end) + "</span></div>"
    );
  }

  /* ── MODELO — Receita Branca em 2 vias ───────────────────────────────── */
  function renderBranca2Vias(d) {
    return (
      _brancaVia(d, "1ª VIA — MÉDICO / PACIENTE") +
      '<div class="b2-corte"><span>✂ recortar aqui</span></div>' +
      _brancaVia(d, "2ª VIA — FARMÁCIA")
    );
  }
  function _brancaData(d) {
    const dt = fmtData(d.data_emissao);
    return esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano;
  }
  function _brancaVia(d, label) {
    return (
      '<div class="b2-via">' +
        '<div class="b2-vialabel">' + esc(label) + "</div>" +
        '<div class="b2-head"><div class="b2-title">RECEITUÁRIO MÉDICO</div>' +
          '<div class="b2-sub">Receita Branca — uso sob controle</div></div>' +
        '<div class="b2-emit">' + emitenteBlock(d) + "</div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO MÉDICA</div>' +
        listaPrescricao(d.itens) +
        '<div class="b2-foot">' +
          '<div class="rx-localdata">' + _brancaData(d) + "</div>" +
          assinaturaBlock(d, "Assinatura e carimbo") +
        "</div>" +
      "</div>"
    );
  }

  /* ── MODELO — Controle Especial (Portaria 344/98) ────────────────────── */
  function renderCE344(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body">' +
        '<div class="ce344-topo">' +
          '<div class="ce344-tit"><div class="t1">RECEITUÁRIO DE CONTROLE ESPECIAL</div>' +
            '<div class="t2">Portaria SVS/MS Nº 344/98</div></div>' +
          '<div class="ce344-farm">Farmácia<br>Comercial</div>' +
        "</div>" +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO EMITENTE</div>' +
          '<div class="ce-emit-in">' + emitenteBlock(d) + "</div></div>" +
        pacienteEndereco(d) +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " +
          dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico") +
        compradorFornecedor() +
      "</div>"
    );
  }

  /* ── MODELO — Receita de Antimicrobiano (faixa azul) ─────────────────── */
  function renderAntimicrobiano(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body">' +
        '<div class="am-faixa">' +
          '<div class="am-left"><div class="am-title">RECEITA DE ANTIMICROBIANO</div>' +
            '<div class="am-sub">Portaria SVS/MS Nº 2.616/98</div></div>' +
          '<div class="am-right"><div class="am-vias">1ª via — farmácia · 2ª via — paciente</div>' +
            (d.numero_sequencial ? '<div class="am-num">Nº ' + esc(String(d.numero_sequencial).padStart(6, "0")) + "</div>" : "") + "</div>" +
        "</div>" +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO EMITENTE</div>' +
          '<div class="ce-emit-in">' + emitenteBlock(d) + "</div></div>" +
        pacienteEndereco(d) +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " +
          dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico") +
        compradorFornecedor() +
      "</div>"
    );
  }

  /* ── MODELO — Notificação de Receita A (faixa amarela) ───────────────── */
  function renderNotificacaoA(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body">' +
        '<div class="na-faixa">' +
          '<div class="na-tit"><div class="t1">NOTIFICAÇÃO DE RECEITA "A"</div>' +
            '<div class="t2">Portaria SVS/MS Nº 344/98 · Listas A1, A2 e A3</div></div>' +
          '<div class="na-badge">1ª via — farmácia' +
            (d.numero_sequencial ? '<br>Nº ' + esc(String(d.numero_sequencial).padStart(6, "0")) : "") + "</div>" +
        "</div>" +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO EMITENTE</div>' +
          '<div class="ce-emit-in">' + emitenteBlock(d) + "</div></div>" +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' +
          esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " +
          dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Assinatura e carimbo do profissional") +
        '<div class="ce-boxes">' +
          '<div class="ce-box"><div class="cbt">IDENTIFICAÇÃO DO COMPRADOR</div>' +
            'Nome:<div class="ce-line"></div>Doc.:<div class="ce-line"></div>' +
            'End.:<div class="ce-line"></div>Data retirada:<div class="ce-line"></div></div>' +
          '<div class="ce-box"><div class="cbt">FARMACÊUTICO RESPONSÁVEL</div>' +
            'Nome:<div class="ce-line"></div>CRF:<div class="ce-line"></div>' +
            '<div style="flex:1"></div></div>' +
        "</div>" +
      "</div>"
    );
  }

  /* ── MODELO — Controle Especial Oficial (ANVISA 2.0) ─────────────────── */
  function renderCEOficial(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body ceo">' +
        '<div class="ceo-title">RECEITUÁRIO DE<br>CONTROLE ESPECIAL</div>' +
        (d.codigo_acesso ? '<div class="ceo-cod"><div class="ceo-cod-l">Código de acesso</div>' +
          '<div class="ceo-cod-v">' + esc(d.codigo_acesso) + "</div></div>" : "") +
        '<div class="ceo-sec">Identificação do Emitente</div>' +
        '<table class="ceo-tbl"><tbody>' +
          "<tr>" +
            '<td style="width:56%"><span class="l">Nome completo</span><span class="v">' + esc(d.medico_nome) + "</span></td>" +
            '<td style="width:28%"><span class="l">CRM</span><span class="v">' + esc(d.medico_crm) + "</span></td>" +
            '<td><span class="l">UF</span><span class="v">' + esc(d.medico_uf) + "</span></td>" +
          "</tr>" +
          '<tr><td colspan="3"><span class="l">Especialidade' +
            (d.medico_rqe ? " — RQE Nº " + esc(d.medico_rqe) : "") + '</span><span class="v">' +
            esc(d.medico_especialidade) + "</span></td></tr>" +
          '<tr><td colspan="3"><span class="l">Endereço completo</span><span class="v">' +
            esc(d.medico_endereco) + "</span></td></tr>" +
          "<tr>" +
            '<td><span class="l">Cidade</span><span class="v">' + esc(d.cidade) + "</span></td>" +
            '<td><span class="l">UF</span><span class="v">' + esc(d.medico_uf) + "</span></td>" +
            '<td><span class="l">Data</span><span class="v">' + dt.dia + "/" + dt.mes + "/" + dt.ano + "</span></td>" +
          "</tr>" +
        "</tbody></table>" +
        '<div class="ceo-assin">' + global.Stamp.build(d) +
          '<div class="ceo-assin-l">Assinatura e carimbo do(a) médico(a)</div></div>' +
        '<table class="ceo-tbl" style="margin-top:2mm"><tbody>' +
          '<tr><td><span class="l">Paciente</span><span class="v">' + esc(d.paciente_nome) + "</span></td></tr>" +
          '<tr><td><span class="l">Endereço completo</span><span class="v">' + esc(d.paciente_endereco) + "</span></td></tr>" +
        "</tbody></table>" +
        '<div class="ceo-presc-l">Prescrição</div>' +
        '<div class="ceo-presc">' + listaPrescricao(d.itens) + "</div>" +
        '<div class="ce-boxes ceo-bottom">' +
          '<div class="ce-box"><div class="cbt">Identificação do Comprador</div>' +
            'Nome:<div class="ce-line"></div>RG / Órgão:<div class="ce-line"></div>' +
            'Endereço:<div class="ce-line"></div>Cidade/UF:<div class="ce-line"></div></div>' +
          '<div class="ce-box"><div class="cbt">Identificação do Fornecedor</div>' +
            'Farmacêutico / CRF:<div class="ce-line"></div>Farmácia:<div class="ce-line"></div>' +
            'CNPJ:<div class="ce-line"></div><div style="flex:1"></div>' +
            'Assinatura do farmacêutico<div class="ce-line"></div></div>' +
        "</div>" +
        '<div class="ceo-versao">Versão 2.0 · Abril de 2020</div>' +
      "</div>"
    );
  }

  /* ── MODELO — Simples 2 vias / Uso Contínuo (oficial) ────────────────── */
  // Baseado no receituário de uso contínuo: cabeçalho do emitente, indicação de
  // uso contínuo, duas vias (paciente/arquivo) e validade.
  function renderContinuo(d) {
    const dt = fmtData(d.data_emissao);
    const val = d.validade_meses ? esc(String(d.validade_meses)) : "6";
    const via = rot => (
      '<div class="uc-via">' +
        '<div class="uc-vialabel">' + esc(rot) + "</div>" +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO EMITENTE</div>' +
          '<div class="ce-emit-in">' + emitenteBlock(d) + "</div></div>" +
        '<div class="uc-flags"><span class="uc-flag">☑ USO CONTÍNUO</span>' +
          '<span class="uc-flag">Validade: ' + val + ' meses</span></div>' +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' + esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
        '<div class="rx-foot">' +
          '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
          assinaturaBlock(d, "Carimbo e assinatura do médico") +
        "</div>" +
      "</div>"
    );
    return via("1ª via — paciente") +
      '<div class="b2-corte"><span>✂ recortar aqui</span></div>' +
      via("2ª via — arquivo/farmácia");
  }

  /* ── MODELO — Uso Contínuo (enxuta/moderna) ──────────────────────────── */
  function renderContinuoEnxuta(d) {
    const dt = fmtData(d.data_emissao);
    const val = d.validade_meses ? esc(String(d.validade_meses)) : "6";
    return (
      '<div class="rx-body uc2">' +
        '<div class="uc2-top">' +
          '<div class="uc2-emit">' + emitenteBlock(d) + "</div>" +
          '<div class="uc2-badge">USO<br>CONTÍNUO</div>' +
        "</div>" +
        '<div class="uc2-rule"></div>' +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' + esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-presc-title">Prescrição</div>' +
        listaPrescricao(d.itens) +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="uc2-val">Receita de uso contínuo · validade ' + val + " meses</div>" +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico") +
      "</div>"
    );
  }

  /* ── MODELO — Veterinária de Antimicrobianos (oficial, IN 25/2020) ────── */
  // Receituário agropecuário para antimicrobianos: emitente (méd. veterinário),
  // identificação do animal/propriedade, prescrição e 2 vias.
  function renderVetOficial(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body">' +
        '<div class="vet-topo">' +
          '<div class="vet-tit"><div class="t1">RECEITUÁRIO AGRONÔMICO / VETERINÁRIO</div>' +
            '<div class="t2">Antimicrobianos de uso veterinário</div></div>' +
          '<div class="vet-vias">1ª via — estabelecimento<br>2ª via — comprador</div>' +
        "</div>" +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO MÉDICO-VETERINÁRIO</div>' +
          '<div class="ce-emit-in">' + emitenteBlockVet(d) + "</div></div>" +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO ANIMAL / PROPRIEDADE</div>' +
          '<div class="vet-animal">' +
            '<div class="rx-field"><span class="lbl">Proprietário: </span><span class="val">' + esc(d.paciente_nome) + "</span></div>" +
            '<div class="rx-field"><span class="lbl">Espécie/animal: </span><span class="val">' + esc(d.animal_especie) + "</span>" +
              '<span class="lbl" style="margin-left:6mm">Nº de animais: </span><span class="val">' + esc(d.animal_qtd) + "</span></div>" +
            '<div class="rx-field"><span class="lbl">Propriedade/end.: </span><span class="val">' + esc(d.paciente_endereco) + "</span></div>" +
          "</div></div>" +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico-veterinário") +
        '<div class="ce-boxes"><div class="ce-box"><div class="cbt">IDENTIFICAÇÃO DO COMPRADOR</div>' +
          'Nome:<div class="ce-line"></div>Doc.:<div class="ce-line"></div>' +
          'End.:<div class="ce-line"></div></div>' +
          '<div class="ce-box"><div class="cbt">ESTABELECIMENTO</div>' +
          '<div style="flex:1"></div><div class="ce-line"></div>' +
          'Responsável técnico &nbsp; Data: __/__/____</div></div>' +
      "</div>"
    );
  }

  // Cabeçalho do veterinário: usa CRMV no lugar de CRM.
  function emitenteBlockVet(d) {
    if (!d.medico_nome) {
      return '<div class="rx-emit-name"><span class="rx-blank"></span></div>' +
             '<div class="rx-emit-line">CRMV: <span class="rx-blank" style="min-width:30mm"></span> ' +
             'UF: <span class="rx-blank" style="min-width:12mm"></span></div>';
    }
    let html = '<div class="rx-emit-name">' + esc(d.medico_nome) + "</div>" +
      '<div class="rx-emit-sub">Médico(a)-veterinário(a)</div>' +
      '<div class="rx-emit-line">CRMV-' + esc(d.medico_uf) + " " + esc(d.medico_crm) + "</div>";
    if (d.medico_endereco) html += '<div class="rx-emit-sub">' + esc(d.medico_endereco) +
      (d.cidade ? " — " + esc(d.cidade) : "") + "</div>";
    if (d.medico_telefone) html += '<div class="rx-emit-sub">Tel: ' + esc(d.medico_telefone) + "</div>";
    return html;
  }

  /* ── MODELO — Veterinária (enxuta) ───────────────────────────────────── */
  function renderVetEnxuta(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body vet2">' +
        '<div class="uc2-top"><div class="uc2-emit">' + emitenteBlockVet(d) + "</div>" +
          '<div class="vet2-badge">USO<br>VETERINÁRIO</div></div>' +
        '<div class="uc2-rule"></div>' +
        '<div class="rx-field"><span class="lbl">Proprietário: </span><span class="val">' + esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-field"><span class="lbl">Animal: </span><span class="val">' + esc(d.animal_especie) +
          (d.animal_qtd ? " (" + esc(d.animal_qtd) + ")" : "") + "</span></div>" +
        '<div class="rx-presc-title">Prescrição</div>' +
        listaPrescricao(d.itens) +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do médico-veterinário") +
      "</div>"
    );
  }

  /* ── MODELO — Odontológica (oficial) ─────────────────────────────────── */
  // Receituário odontológico: emitente (cirurgião-dentista, CRO), paciente e
  // prescrição; layout equivalente ao receituário de controle quando aplicável.
  function renderOdontoOficial(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body">' +
        '<div class="odo-topo"><div class="odo-mark">⊕</div>' +
          '<div class="odo-tit"><div class="t1">RECEITUÁRIO ODONTOLÓGICO</div>' +
            '<div class="t2">Cirurgião(ã)-Dentista</div></div></div>' +
        '<div class="ce-emit-box"><div class="cbt">IDENTIFICAÇÃO DO EMITENTE</div>' +
          '<div class="ce-emit-in">' + emitenteBlockOdo(d) + "</div></div>" +
        pacienteEndereco(d) +
        '<div class="rx-presc-title">PRESCRIÇÃO</div>' +
        '<div class="presc-min">' + listaPrescricao(d.itens) + "</div>" +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do(a) cirurgião(ã)-dentista") +
      "</div>"
    );
  }

  // Cabeçalho do dentista: usa CRO no lugar de CRM.
  function emitenteBlockOdo(d) {
    if (!d.medico_nome) {
      return '<div class="rx-emit-name"><span class="rx-blank"></span></div>' +
             '<div class="rx-emit-line">CRO: <span class="rx-blank" style="min-width:30mm"></span> ' +
             'UF: <span class="rx-blank" style="min-width:12mm"></span></div>';
    }
    let esp = d.medico_especialidade ? esc(d.medico_especialidade) : "Cirurgião(ã)-Dentista";
    let html = '<div class="rx-emit-name">' + esc(d.medico_nome) + "</div>" +
      '<div class="rx-emit-sub">' + esp + "</div>" +
      '<div class="rx-emit-line">CRO-' + esc(d.medico_uf) + " " + esc(d.medico_crm) + "</div>";
    if (d.medico_endereco) html += '<div class="rx-emit-sub">' + esc(d.medico_endereco) +
      (d.cidade ? " — " + esc(d.cidade) : "") + "</div>";
    if (d.medico_telefone) html += '<div class="rx-emit-sub">Tel: ' + esc(d.medico_telefone) + "</div>";
    return html;
  }

  /* ── MODELO — Odontológica (enxuta) ──────────────────────────────────── */
  function renderOdontoEnxuta(d) {
    const dt = fmtData(d.data_emissao);
    return (
      '<div class="rx-body odo2">' +
        '<div class="uc2-top"><div class="uc2-emit">' + emitenteBlockOdo(d) + "</div>" +
          '<div class="odo2-badge">⊕</div></div>' +
        '<div class="uc2-rule"></div>' +
        '<div class="rx-field"><span class="lbl">Paciente: </span><span class="val">' + esc(d.paciente_nome) + "</span></div>" +
        '<div class="rx-presc-title">Prescrição</div>' +
        listaPrescricao(d.itens) +
      "</div>" +
      '<div class="rx-foot">' +
        '<div class="rx-localdata">' + esc(d.cidade || "Local") + ", " + dt.dia + "/" + dt.mes + "/" + dt.ano + "</div>" +
        assinaturaBlock(d, "Carimbo e assinatura do(a) dentista") +
      "</div>"
    );
  }

  /* ── Catálogo ────────────────────────────────────────────────────────── */
  // required: campos obrigatórios (chaves de dados) para aquele tipo.
  // seq: tipo de numeração sequencial (quando a receita exige).
  const REQ_BASE = ["medico_nome", "medico_crm", "medico_uf", "paciente_nome"];
  const REQ_CONTROLE = REQ_BASE.concat(["paciente_endereco", "medico_endereco"]);
  const MODELS = [
    { id: "simples_classica", categoria: "Receitas Simples", cls: "m-classica",
      nome: "Receita Simples Clássica", desc: "Cabeçalho com caduceu e assinatura ao pé.",
      required: REQ_BASE, render: renderClassica },
    { id: "simples_renovavel", categoria: "Receitas Simples", cls: "m-renovavel",
      nome: "Receita Simples Renovável", desc: "Uso contínuo, com quadro de renovação (até 6 vias).",
      required: REQ_BASE, render: renderRenovavel },
    { id: "branca_2vias", categoria: "Receitas Simples", cls: "m-branca2",
      nome: "Receita Branca — 2 vias", desc: "Duas vias idênticas com linha de corte (médico e farmácia).",
      required: REQ_BASE, render: renderBranca2Vias },
    { id: "ce_mod01", categoria: "Receitas de Controle Especial", cls: "m-ce1",
      nome: "Modelo C.E. Mod. 01", desc: "Controle especial, 2 vias, campos de comprador e fornecedor.",
      required: REQ_CONTROLE, render: renderCE1 },
    { id: "ce_344", categoria: "Receitas de Controle Especial", cls: "m-ce344",
      nome: "Controle Especial — 344/98", desc: "Portaria 344/98, com caixa da farmácia e comprador/fornecedor.",
      required: REQ_CONTROLE, render: renderCE344 },
    { id: "ce_oficial", categoria: "Receitas de Controle Especial", cls: "m-ceofi",
      nome: "Controle Especial — Oficial ANVISA 2.0", desc: "Formato oficial em tabela (versão 2.0, abril/2020).",
      required: REQ_CONTROLE, seq: "ce_oficial", render: renderCEOficial },
    { id: "antimicrobiano", categoria: "Notificações e faixas especiais", cls: "m-antimic",
      nome: "Antimicrobiano (faixa azul)", desc: "Portaria 2.616/98, 2 vias, comprador e fornecedor.",
      required: REQ_CONTROLE, seq: "antimicrobiano", render: renderAntimicrobiano },
    { id: "notificacao_a", categoria: "Notificações e faixas especiais", cls: "m-notifa",
      nome: 'Notificação de Receita "A"', desc: "Faixa amarela, listas A1/A2/A3, comprador e farmacêutico.",
      required: REQ_CONTROLE, seq: "notificacao_a", render: renderNotificacaoA },

    { id: "uso_continuo", categoria: "Uso contínuo e 2 vias", cls: "m-continuo",
      nome: "Uso Contínuo — 2 vias (oficial)", desc: "Duas vias (paciente/arquivo), marcação de uso contínuo e validade.",
      required: REQ_BASE, render: renderContinuo },
    { id: "uso_continuo_enxuta", categoria: "Uso contínuo e 2 vias", cls: "m-continuo2",
      nome: "Uso Contínuo (enxuta)", desc: "Versão moderna, selo de uso contínuo e validade.",
      required: REQ_BASE, render: renderContinuoEnxuta },

    { id: "vet_oficial", categoria: "Veterinária", cls: "m-vet",
      nome: "Veterinária de Antimicrobianos (oficial)", desc: "Receituário veterinário com identificação do animal/propriedade e comprador.",
      required: ["medico_nome", "medico_crm", "medico_uf", "paciente_nome"], render: renderVetOficial },
    { id: "vet_enxuta", categoria: "Veterinária", cls: "m-vet2",
      nome: "Veterinária (enxuta)", desc: "Versão moderna do receituário veterinário.",
      required: ["medico_nome", "medico_crm", "medico_uf", "paciente_nome"], render: renderVetEnxuta },

    { id: "odonto_oficial", categoria: "Odontológica", cls: "m-odo",
      nome: "Odontológica (oficial)", desc: "Receituário do cirurgião-dentista (CRO), com paciente e prescrição.",
      required: REQ_BASE, render: renderOdontoOficial },
    { id: "odonto_enxuta", categoria: "Odontológica", cls: "m-odo2",
      nome: "Odontológica (enxuta)", desc: "Versão moderna do receituário odontológico.",
      required: REQ_BASE, render: renderOdontoEnxuta },
  ];

  // Rótulos amigáveis dos campos (para mensagens de validação).
  const FIELD_LABELS = {
    medico_nome: "Nome do médico", medico_crm: "CRM", medico_uf: "UF",
    medico_endereco: "Endereço do médico", paciente_nome: "Nome do paciente",
    paciente_endereco: "Endereço do paciente",
  };
  function missingRequired(model, d) {
    if (!model || !model.required) return [];
    return model.required.filter(k => !String(d[k] || "").trim())
      .map(k => FIELD_LABELS[k] || k);
  }

  global.Models = {
    all: MODELS,
    byId: id => MODELS.find(m => m.id === id),
    missingRequired,
    categories: () => {
      const map = {};
      MODELS.forEach(m => { (map[m.categoria] = map[m.categoria] || []).push(m); });
      return map;
    },
  };
})(window);
