/* ============================================================================
   app.js — Controlador do módulo Receitas.
   ============================================================================ */
(function () {
  "use strict";

  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // Modos de uso rápidos (posologia)
  const POSOLOGIAS = [
    ["Uso contínuo", "Tomar 1 comprimido ao dia, uso contínuo."],
    ["12/12h", "Tomar 1 comprimido de 12 em 12 horas."],
    ["8/8h", "Tomar 1 comprimido de 8 em 8 horas."],
    ["Se dor", "Tomar 1 comprimido em caso de dor, até 3x ao dia."],
    ["Antibiótico 7d", "Tomar 1 comprimido de 8/8h por 7 dias."],
    ["Xarope", "Tomar 10 ml de 8 em 8 horas."],
    ["Tópico", "Aplicar fina camada na área afetada 2x ao dia."],
    ["À noite", "Tomar 1 comprimido à noite, ao deitar."],
  ];

  const state = {
    tab: "inicio",
    activeModelId: null,
    data: {
      medico_nome: "", medico_crm: "", medico_uf: "", medico_especialidade: "",
      medico_rqe: "", medico_endereco: "", medico_telefone: "",
      paciente_nome: "", paciente_endereco: "", paciente_bairro: "",
      cidade: "", data_emissao: new Date().toISOString().slice(0, 10),
      validade_meses: 6,
      itens: [{ nome: "", quantidade: "", posologia: "" }],
    },
    fmt: window.FMT.defaults(),
    zoom: 0.62,
    zoomMode: "width",   // "width" | "page" | "real" | "manual"
    folhaZoom: 1,        // zoom da aba "Editar na Folha"
    folhaFit: false,
    carimbo: { modo: "auto", url: "", assinaturaUrl: "" },
    editMode: false,
    overrides: {},
  };

  /* ── Utilidades ────────────────────────────────────────────────────────── */
  function toast(msg, kind) {
    const host = $("#toast-host");
    const el = document.createElement("div");
    el.className = "toast " + (kind || "ok");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function visibleModels() {
    return window.Models.all.filter(m => !window.Store.isHidden(m.id));
  }

  function pickInitialModel() {
    const vis = visibleModels();
    if (!vis.length) { state.activeModelId = null; return; }
    if (!state.activeModelId || window.Store.isHidden(state.activeModelId)) {
      state.activeModelId = vis[0].id;
    }
  }

  /* ── Rail de modelos ───────────────────────────────────────────────────── */
  function renderRail() {
    const host = $("#rail");
    const cats = window.Models.categories();
    const anyHidden = window.Store.hiddenIds().length > 0;
    let html = "";

    Object.keys(cats).forEach(cat => {
      const models = cats[cat].filter(m => !window.Store.isHidden(m.id));
      if (!models.length) return;
      html += `<div class="rail-group"><h4>${cat}</h4>`;
      models.forEach(m => {
        html += `<div class="model-card ${m.id === state.activeModelId ? "active" : ""}" data-id="${m.id}">
          <button class="mc-del" data-del="${m.id}" title="Excluir modelo">×</button>
          <div class="mc-name">${m.nome}</div>
          <div class="mc-desc">${m.desc}</div>
        </div>`;
      });
      html += `</div>`;
    });

    if (!visibleModels().length) {
      html += `<div class="mc-desc" style="padding:8px">Todos os modelos foram excluídos.</div>`;
    }
    if (anyHidden) {
      html += `<button class="rail-restore" id="restore-models">↺ Restaurar modelos excluídos</button>`;
    }
    host.innerHTML = html;

    $$("#rail .model-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest("[data-del]")) return;
        selectModel(card.dataset.id);
      });
    });
    $$("#rail [data-del]").forEach(b => {
      b.addEventListener("click", () => {
        const m = window.Models.byId(b.dataset.del);
        if (confirm(`Excluir o modelo "${m.nome}"? Ele deixa de aparecer na lista (pode ser restaurado depois).`)) {
          window.Store.hideModel(m.id);
          if (state.activeModelId === m.id) pickInitialModel();
          renderRail(); renderPreview(); renderFmtDrawer();
          toast("Modelo excluído.");
        }
      });
    });
    const rb = $("#restore-models");
    if (rb) rb.addEventListener("click", () => {
      window.Store.restoreModels();
      renderRail();
      toast("Modelos restaurados.");
    });
  }

  function selectModel(id) {
    // se estiver editando na folha, salva a edição atual antes de trocar
    if (state.editMode) {
      const sheet = $("#a4-scaler .a4");
      if (sheet && sheet.getAttribute("contenteditable") === "true") captureOverride(sheet);
    }
    state.activeModelId = id;
    // carrega formatação salva desse modelo (se houver)
    const saved = window.Store.loadFmt(id);
    state.fmt = saved ? Object.assign(window.FMT.defaults(), saved) : window.FMT.defaults();
    renderRail(); renderPreview(); renderFmtDrawer();
    renderRenovavelField();
    renderAnimalField();
  }

  /* ── Formulário ────────────────────────────────────────────────────────── */
  function bindText(id, key, obj) {
    const el = $(id);
    if (!el) return;
    el.value = obj[key] || "";
    el.addEventListener("input", () => { obj[key] = el.value; renderPreview(); });
  }

  function renderForm() {
    const d = state.data;
    bindText("#i-medico", "medico_nome", d);
    bindText("#i-crm", "medico_crm", d);
    bindText("#i-uf", "medico_uf", d);
    bindText("#i-esp", "medico_especialidade", d);
    bindText("#i-rqe", "medico_rqe", d);
    bindText("#i-med-end", "medico_endereco", d);
    bindText("#i-med-tel", "medico_telefone", d);
    bindText("#i-pac", "paciente_nome", d);
    bindText("#i-pac-end", "paciente_endereco", d);
    bindText("#i-pac-bairro", "paciente_bairro", d);
    bindText("#i-cidade", "cidade", d);
    bindText("#i-data", "data_emissao", d);
    bindText("#i-animal-esp", "animal_especie", d);
    bindText("#i-animal-qtd", "animal_qtd", d);
    renderItens();
    renderRenovavelField();
    renderAnimalField();
  }

  function renderAnimalField() {
    const wrap = $("#animal-field");
    if (!wrap) return;
    const isVet = /^vet_/.test(state.activeModelId || "");
    wrap.style.display = isVet ? "grid" : "none";
  }

  function renderRenovavelField() {
    const wrap = $("#renovavel-field");
    if (!wrap) return;
    wrap.style.display = state.activeModelId === "simples_renovavel" ? "block" : "none";
  }

  function renderItens() {
    const host = $("#itens");
    host.innerHTML = "";
    state.data.itens.forEach((it, idx) => {
      const el = document.createElement("div");
      el.className = "med-item";
      el.innerHTML = `
        <div class="med-head">
          <span class="med-n">MEDICAMENTO ${idx + 1}</span>
          <button class="med-del" title="Remover">×</button>
        </div>
        <label class="field" style="margin-bottom:8px">
          <span>Nome / apresentação</span>
          <input type="text" class="it-nome" list="dl-medicamentos" value="${escAttr(it.nome)}" placeholder="Ex.: Losartana 50mg">
        </label>
        <label class="field" style="margin-bottom:8px">
          <span>Quantidade</span>
          <input type="text" class="it-qtd" value="${escAttr(it.quantidade)}" placeholder="Ex.: 1 caixa (30 comp.)">
        </label>
        <label class="field" style="margin-bottom:6px">
          <span>Posologia / modo de uso</span>
          <textarea class="it-pos" placeholder="Ex.: Tomar 1 comprimido ao dia.">${escHtml(it.posologia)}</textarea>
        </label>
        <div class="pos-chips"></div>`;
      const chips = el.querySelector(".pos-chips");
      POSOLOGIAS.forEach(([label, full]) => {
        const c = document.createElement("button");
        c.className = "pos-chip"; c.textContent = label; c.title = full;
        c.addEventListener("click", () => {
          it.posologia = full; el.querySelector(".it-pos").value = full; renderPreview();
        });
        chips.appendChild(c);
      });
      el.querySelector(".it-nome").addEventListener("input", e => { it.nome = e.target.value; renderPreview(); });
      el.querySelector(".it-qtd").addEventListener("input", e => { it.quantidade = e.target.value; renderPreview(); });
      el.querySelector(".it-pos").addEventListener("input", e => { it.posologia = e.target.value; renderPreview(); });
      el.querySelector(".med-del").addEventListener("click", () => {
        state.data.itens.splice(idx, 1);
        if (!state.data.itens.length) state.data.itens.push({ nome: "", quantidade: "", posologia: "" });
        renderItens(); renderPreview();
      });
      host.appendChild(el);
    });
  }

  $("#add-item")?.addEventListener("click", () => {
    state.data.itens.push({ nome: "", quantidade: "", posologia: "" });
    renderItens(); renderPreview();
  });

  $("#i-validade")?.addEventListener("input", e => {
    state.data.validade_meses = parseInt(e.target.value || "6", 10); renderPreview();
  });

  /* ── Pré-visualização ──────────────────────────────────────────────────── */
  function genCode() {
    const p = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return p() + "-" + p();
  }

  function buildSheet(forEmit) {
    const model = window.Models.byId(state.activeModelId);
    const a4 = document.createElement("div");
    if (!model) { a4.className = "a4"; a4.innerHTML = "<p style='color:#888'>Nenhum modelo selecionado.</p>"; return a4; }
    // carimbo (auto ou imagem) + assinatura opcional
    state.data.carimbo_modo = state.carimbo.modo;
    state.data.carimbo_url = state.carimbo.url;
    state.data.assinatura_url = state.carimbo.assinaturaUrl || "";
    // numeração sequencial: preview mostra o próximo nº; emissão consome-o
    state.data.numero_sequencial = model.seq
      ? (forEmit ? window.Store.nextSeq(model.seq) : window.Store.peekSeq(model.seq)) : "";
    // código de acesso (só modelo oficial)
    state.data.codigo_acesso = model.id === "ce_oficial" ? (forEmit ? genCode() : "XXXX-XXXX") : "";
    a4.className = "a4 " + model.cls;
    const ov = state.overrides[model.id];
    if (ov) {
      // receita em edição livre: usa o HTML editado (mantém margens/fonte ajustáveis)
      a4.innerHTML = ov;
    } else {
      a4.innerHTML = model.render(state.data);
    }
    window.FMT.apply(a4, state.fmt, !!state.data.medico_nome.trim());
    return a4;
  }

  function renderPreview() {
    const scaler = $("#a4-scaler");
    scaler.innerHTML = "";
    const sheet = buildSheet();
    scaler.appendChild(sheet);
    if (state.zoomMode === "width" || state.zoomMode === "page") {
      const stage = document.querySelector("#view-receitas .preview-stage");
      state.zoom = computeFit(stage, sheet.offsetWidth || 794,
        state.zoomMode === "page" ? (sheet.offsetHeight || 1123) : null);
      const sl = $("#zoom"); if (sl) sl.value = state.zoom;
      const lb = $("#zoom-v"); if (lb) lb.textContent = Math.round(state.zoom * 100) + "%";
    }
    scaler.style.transform = `scale(${state.zoom})`;
    sizeScalerWrap(scaler, sheet);
    if (state.editMode) enableSheetEditing(sheet);
    renderReqWarn();
    renderEditBar();
  }

  // Reserva no wrapper o tamanho JÁ escalado (transform:scale não encolhe a caixa,
  // então sem isto a folha "vaza" e é cortada).
  function sizeScalerWrap(scaler, sheet) {
    const wrap = scaler.parentElement;
    if (!wrap || !wrap.classList.contains("a4-scaler-wrap")) return;
    // A4 retrato ≈ 794 x 1123 px; mede o real para cobrir folhas mais altas
    const h = sheet.offsetHeight || 1123, w = sheet.offsetWidth || 794;
    wrap.style.width = Math.round(w * state.zoom) + "px";
    wrap.style.height = Math.round(h * state.zoom) + "px";
  }

  // Torna a folha editável direto na prévia; captura os ajustes como override.
  function enableSheetEditing(sheet) {
    sheet.setAttribute("contenteditable", "true");
    sheet.spellcheck = false;
    sheet.classList.add("editing");
    let timer = null;
    sheet.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => captureOverride(sheet), 300);
    });
  }

  function renderReqWarn() {
    const box = $("#req-warn");
    if (!box) return;
    const model = window.Models.byId(state.activeModelId);
    const miss = window.Models.missingRequired(model, state.data);
    if (!miss.length) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    box.innerHTML = "⚠ Campos obrigatórios para <b>" + escHtml(model ? model.nome : "") +
      "</b>: " + miss.map(escHtml).join(", ") + ".";
  }

  /* ── Edição livre na folha ─────────────────────────────────────────────── */
  function toggleEditMode() {
    state.editMode = !state.editMode;
    const btn = $("#btn-edit-sheet");
    if (btn) {
      btn.classList.toggle("primary", state.editMode);
      btn.textContent = state.editMode ? "✓ Concluir edição" : "✎ Editar na folha";
    }
    if (state.editMode) {
      // edição fica confortável em tamanho legível: guarda o zoom e aumenta
      state._zoomBeforeEdit = state.zoom;
      if (state.zoom < 0.9) { state.zoom = 0.95; $("#zoom").value = state.zoom; $("#zoom-v").textContent = Math.round(state.zoom * 100) + "%"; }
    } else {
      // ao sair, captura o estado final da folha atual (se houver)
      const sheet = $("#a4-scaler .a4");
      if (sheet && sheet.getAttribute("contenteditable") === "true") captureOverride(sheet);
      if (state._zoomBeforeEdit != null) { state.zoom = state._zoomBeforeEdit; $("#zoom").value = state.zoom; $("#zoom-v").textContent = Math.round(state.zoom * 100) + "%"; }
    }
    renderPreview();
  }

  function captureOverride(sheet) {
    const model = window.Models.byId(state.activeModelId);
    if (!model) return;
    const clone = sheet.cloneNode(true);
    clone.removeAttribute("contenteditable");
    clone.classList.remove("editing");
    clone.querySelectorAll("[contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
    const html = clone.innerHTML.trim();
    if (!html || html.length < 20) return;   // evita salvar folha vazia por engano
    state.overrides[model.id] = html;
    window.Store.setOverride(model.id, html);
    renderEditBar();
  }

  function renderEditBar() {
    const bar = $("#edit-bar");
    if (!bar) return;
    const model = window.Models.byId(state.activeModelId);
    const hasOverride = model && state.overrides[model.id];
    if (!state.editMode && !hasOverride) { bar.hidden = true; bar.innerHTML = ""; return; }
    bar.hidden = false;
    let html = "";
    if (state.editMode) {
      html += '<span class="eb-msg">✎ Modo de edição livre: clique em qualquer texto da folha e digite. ' +
              'Enquanto estiver editando, as alterações do formulário não afetam esta folha.</span>';
    } else if (hasOverride) {
      html += '<span class="eb-msg">Esta receita está <b>editada manualmente</b> (aba <b>Editar na Folha</b>). O formulário não altera esta folha.</span>';
    }
    if (hasOverride) html += '<button class="btn ghost" id="btn-revert-sheet">↺ Voltar ao modelo</button>';
    bar.innerHTML = html;
    const rev = $("#btn-revert-sheet");
    if (rev) rev.addEventListener("click", revertSheet);
  }

  function revertSheet() {
    const model = window.Models.byId(state.activeModelId);
    if (!model) return;
    if (!confirm("Descartar a edição manual desta receita e voltar ao modelo padrão?")) return;
    delete state.overrides[model.id];
    window.Store.clearOverride(model.id);
    renderPreview();
    toast("Receita voltou ao modelo padrão.");
  }

  function renderFmtDrawer() {
    const host = $("#fmt-drawer");
    if (!state.activeModelId) { host.innerHTML = ""; return; }
    window.FMT.buildControls(host, state.fmt, () => renderPreview());
  }

  /* ── Barra de ações ────────────────────────────────────────────────────── */
  function confirmIfMissing() {
    const model = window.Models.byId(state.activeModelId);
    const miss = window.Models.missingRequired(model, state.data);
    if (miss.length) {
      return confirm("Faltam campos obrigatórios para este tipo de receita:\n\n• " +
        miss.join("\n• ") + "\n\nDeseja emitir mesmo assim?");
    }
    return true;
  }

  function recordHistory() {
    const model = window.Models.byId(state.activeModelId);
    window.Store.addHistory({
      modelId: state.activeModelId,
      modelName: model ? model.nome : state.activeModelId,
      paciente: state.data.paciente_nome || "",
      medico: state.data.medico_nome || "",
      data: JSON.parse(JSON.stringify(state.data)),
      fmt: JSON.parse(JSON.stringify(state.fmt)),
      carimbo: JSON.parse(JSON.stringify(state.carimbo)),
    });
    renderHistory();
  }

  $("#btn-print")?.addEventListener("click", () => {
    if (!confirmIfMissing()) return;
    window.Exporter.printSheet(buildSheet(true));
    recordHistory();
  });

  $("#btn-pdf")?.addEventListener("click", async () => {
    if (!confirmIfMissing()) return;
    const btn = $("#btn-pdf"); btn.disabled = true; const t = btn.textContent; btn.textContent = "Gerando…";
    try {
      const ok = await window.Exporter.exportPdf(buildSheet(true), fileName());
      toast(ok ? "PDF exportado." : "Abrindo impressão para salvar em PDF.");
      recordHistory();
    } catch (e) { toast("Não foi possível gerar o PDF: " + e.message, "err"); }
    finally { btn.disabled = false; btn.textContent = t; }
  });

  $("#btn-save-tpl")?.addEventListener("click", () => {
    if (!state.activeModelId) return;
    window.Store.saveFmt(state.activeModelId, state.fmt); // guarda a formatação do modelo
    const nome = prompt("Nome do modelo salvo:", state.data.paciente_nome
      ? `Receita — ${state.data.paciente_nome}` : "Meu modelo");
    if (nome === null) return;
    window.Store.saveTemplate({
      name: nome, modelId: state.activeModelId,
      fmt: JSON.parse(JSON.stringify(state.fmt)),
      data: JSON.parse(JSON.stringify(state.data)),
    });
    toast("Salvo como modelo.");
    renderTemplates();
  });

  // O botão antigo continua existindo como atalho — agora leva para a aba própria.
  $("#btn-edit-sheet")?.addEventListener("click", () => switchTab("folha"));

  /* ══════════════════════════════════════════════════════════════════════════
     ABA "EDITAR NA FOLHA"
     A folha A4 vira o herói da tela, em tamanho legível, com as ferramentas
     numa coluna à esquerda. O que for digitado aqui é gravado como override
     do modelo (mesmo mecanismo de antes) e continua valendo na aba Receitas.
     ══════════════════════════════════════════════════════════════════════════ */
  let folhaSaveTimer = null;

  function folhaStage() { return document.querySelector("#view-folha .folha-stage"); }

  function fitFolha() {
    state.folhaFit = true;
    const sheet = document.querySelector("#folha-scaler .a4");
    applyFolhaZoom(computeFit(folhaStage(), sheet ? sheet.offsetWidth : 794));
  }

  function applyFolhaZoom(z, manual) {
    state.folhaZoom = Math.max(0.4, Math.min(2, z));
    if (manual) state.folhaFit = false;
    const scaler = $("#folha-scaler");
    if (scaler) {
      scaler.style.transform = `scale(${state.folhaZoom})`;
      const sheet = scaler.firstElementChild;
      if (sheet) sizeScalerWrap(scaler, sheet);
    }
    const sl = $("#fo-zoom"); if (sl) sl.value = state.folhaZoom;
    const lb = $("#fo-zoom-v"); if (lb) lb.textContent = Math.round(state.folhaZoom * 100) + "%";
    const fb = $("#fo-fit"); if (fb) fb.classList.toggle("primary", !!state.folhaFit);
  }

  function renderFolhaModelSelect() {
    const sel = $("#fo-model");
    if (!sel) return;
    const list = visibleModels();
    sel.innerHTML = list.map(m =>
      `<option value="${escAttr(m.id)}" ${m.id === state.activeModelId ? "selected" : ""}>${escHtml(m.nome)}</option>`
    ).join("");
  }

  function renderFolhaStatus() {
    const box = $("#fo-status");
    if (!box) return;
    const model = window.Models.byId(state.activeModelId);
    const edited = model && state.overrides[model.id];
    box.classList.toggle("edited", !!edited);
    box.innerHTML = edited
      ? "✎ Esta receita está <b>editada manualmente</b>. O formulário da aba Receitas não altera esta folha até você usar “Voltar ao modelo”."
      : "Esta folha ainda segue o modelo. Assim que você digitar algo aqui, ela passa a ser uma versão manual.";
  }

  // Monta a folha na aba, já em modo editável.
  function renderFolha() {
    const scaler = $("#folha-scaler");
    if (!scaler) return;
    scaler.innerHTML = "";
    const sheet = buildSheet();
    scaler.appendChild(sheet);

    sheet.setAttribute("contenteditable", "true");
    sheet.spellcheck = false;
    sheet.classList.add("editing");
    sheet.addEventListener("input", () => {
      clearTimeout(folhaSaveTimer);
      folhaSaveTimer = setTimeout(() => { captureOverride(sheet); renderFolhaStatus(); }, 400);
    });

    // Zoom: primeira abertura em tamanho real; depois respeita a escolha do usuário.
    if (state.folhaFit) fitFolha();
    else applyFolhaZoom(state.folhaZoom);

    // Se nem em 100% couber na tela, ajusta para caber (evita rolagem horizontal).
    const stage = folhaStage();
    if (stage && !state.folhaFit) {
      const max = computeFit(stage, sheet.offsetWidth || 794);
      if (max < state.folhaZoom) applyFolhaZoom(max);
    }

    // Sincroniza os controles de tamanho impresso com a formatação do modelo.
    const fs = $("#fo-size"), lh = $("#fo-lh");
    if (fs) { fs.value = state.fmt.fontSize; $("#fo-size-v").textContent = state.fmt.fontSize + "pt"; }
    if (lh) { lh.value = state.fmt.lineHeight; $("#fo-lh-v").textContent = state.fmt.lineHeight; }

    renderFolhaModelSelect();
    renderFolhaStatus();
  }

  function saveFolha() {
    const sheet = document.querySelector("#folha-scaler .a4");
    if (sheet) captureOverride(sheet);
    renderFolhaStatus();
    renderPreview();
    toast("Edição da folha salva.");
  }

  function setupFolha() {
    $("#fo-zoom")?.addEventListener("input", e => applyFolhaZoom(parseFloat(e.target.value), true));
    $("#fo-zoom-in")?.addEventListener("click", () => applyFolhaZoom(state.folhaZoom + 0.1, true));
    $("#fo-zoom-out")?.addEventListener("click", () => applyFolhaZoom(state.folhaZoom - 0.1, true));
    $("#fo-fit")?.addEventListener("click", fitFolha);
    $("#fo-100")?.addEventListener("click", () => applyFolhaZoom(1, true));

    $("#fo-size")?.addEventListener("input", e => {
      state.fmt.fontSize = parseFloat(e.target.value);
      $("#fo-size-v").textContent = state.fmt.fontSize + "pt";
      const sheet = document.querySelector("#folha-scaler .a4");
      if (sheet) window.FMT.apply(sheet, state.fmt, !!state.data.medico_nome.trim());
      renderFmtDrawer();
    });
    $("#fo-lh")?.addEventListener("input", e => {
      state.fmt.lineHeight = parseFloat(e.target.value);
      $("#fo-lh-v").textContent = state.fmt.lineHeight;
      const sheet = document.querySelector("#folha-scaler .a4");
      if (sheet) window.FMT.apply(sheet, state.fmt, !!state.data.medico_nome.trim());
      renderFmtDrawer();
    });

    $("#fo-model")?.addEventListener("change", e => {
      const sheet = document.querySelector("#folha-scaler .a4");
      if (sheet) captureOverride(sheet);          // não perde o que já foi digitado
      selectModel(e.target.value);
      renderFolha();
    });

    $("#fo-save")?.addEventListener("click", saveFolha);
    $("#fo-back")?.addEventListener("click", () => { saveFolha(); switchTab("receitas"); });

    $("#fo-revert")?.addEventListener("click", () => {
      const model = window.Models.byId(state.activeModelId);
      if (!model) return;
      if (!state.overrides[model.id]) { toast("Esta folha já está no modelo padrão."); return; }
      if (!confirm("Descartar a edição manual desta receita e voltar ao modelo padrão?")) return;
      delete state.overrides[model.id];
      window.Store.clearOverride(model.id);
      renderFolha(); renderPreview();
      toast("Receita voltou ao modelo padrão.");
    });

    $("#fo-print")?.addEventListener("click", () => {
      const sheet = document.querySelector("#folha-scaler .a4");
      if (sheet) captureOverride(sheet);
      if (!confirmIfMissing()) return;
      window.Exporter.printSheet(buildSheet(true));
      recordHistory();
    });

    $("#fo-pdf")?.addEventListener("click", async () => {
      const sheet = document.querySelector("#folha-scaler .a4");
      if (sheet) captureOverride(sheet);
      if (!confirmIfMissing()) return;
      const btn = $("#fo-pdf"); btn.disabled = true; const t = btn.textContent; btn.textContent = "Gerando…";
      try {
        const ok = await window.Exporter.exportPdf(buildSheet(true), fileName());
        toast(ok ? "PDF exportado." : "Abrindo impressão para salvar em PDF.");
        recordHistory();
      } catch (e) { toast("Não foi possível gerar o PDF: " + e.message, "err"); }
      finally { btn.disabled = false; btn.textContent = t; }
    });
  }

  function fileName() {
    const p = state.data.paciente_nome.trim().replace(/\s+/g, "_") || "receita";
    return `receita_${p}_${state.data.data_emissao}.pdf`;
  }

  function renderTemplates() {
    const host = $("#tpl-list");
    if (!host) return;
    const tpls = window.Store.listTemplates();
    if (!tpls.length) { host.innerHTML = `<div class="mc-desc" style="padding:4px 6px">Nenhum modelo salvo ainda.</div>`; return; }
    host.innerHTML = tpls.map(t => `
      <div class="model-card" data-tpl="${t.id}">
        <button class="mc-del" data-tpldel="${t.id}" title="Excluir">×</button>
        <div class="mc-name">${escHtml(t.name)}</div>
        <div class="mc-desc">${window.Models.byId(t.modelId)?.nome || t.modelId}</div>
      </div>`).join("");
    $$("#tpl-list [data-tpl]").forEach(card => card.addEventListener("click", e => {
      if (e.target.closest("[data-tpldel]")) return;
      loadTemplate(card.dataset.tpl);
    }));
    $$("#tpl-list [data-tpldel]").forEach(b => b.addEventListener("click", () => {
      window.Store.deleteTemplate(b.dataset.tpldel); renderTemplates(); toast("Modelo excluído.");
    }));
  }

  function loadTemplate(id) {
    const t = window.Store.getTemplate(id);
    if (!t) return;
    state.data = Object.assign(state.data, JSON.parse(JSON.stringify(t.data)));
    if (!window.Store.isHidden(t.modelId)) state.activeModelId = t.modelId;
    state.fmt = Object.assign(window.FMT.defaults(), t.fmt);
    renderForm(); renderRail(); renderPreview(); renderFmtDrawer();
    toast("Modelo carregado.");
  }

  /* ── Histórico de receitas emitidas ────────────────────────────────────── */
  function renderHistory() {
    if (typeof updateHistFab === "function") updateHistFab();
    const host = $("#hist-list");
    if (!host) return;
    const hist = window.Store.listHistory();
    if (!hist.length) { host.innerHTML = `<div class="mc-desc" style="padding:4px 6px">Nenhuma receita emitida ainda.</div>`; return; }
    host.innerHTML = hist.slice(0, 30).map(h => {
      const dt = new Date(h.emittedAt);
      const quando = isNaN(dt) ? "" : dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return `<div class="model-card" data-hist="${h.id}">
        <button class="mc-del" data-histdel="${h.id}" title="Excluir">×</button>
        <div class="mc-name">${escHtml(h.paciente || "(sem paciente)")}</div>
        <div class="mc-desc">${escHtml(h.modelName || "")} · ${escHtml(quando)}</div>
      </div>`;
    }).join("");
    $$("#hist-list [data-hist]").forEach(card => card.addEventListener("click", e => {
      if (e.target.closest("[data-histdel]")) return;
      loadHistory(card.dataset.hist);
    }));
    $$("#hist-list [data-histdel]").forEach(b => b.addEventListener("click", () => {
      window.Store.deleteHistory(b.dataset.histdel); renderHistory(); toast("Item removido do histórico.");
    }));
  }

  function loadHistory(id) {
    const h = window.Store.getHistory(id);
    if (!h) return;
    state.data = Object.assign(blankLikeData(), JSON.parse(JSON.stringify(h.data)));
    if (!window.Store.isHidden(h.modelId)) state.activeModelId = h.modelId;
    if (h.fmt) state.fmt = Object.assign(window.FMT.defaults(), h.fmt);
    if (h.carimbo) state.carimbo = Object.assign({ modo: "auto", url: "", assinaturaUrl: "" }, h.carimbo);
    renderForm(); renderRail(); renderPreview(); renderFmtDrawer();
    toast("Receita reaberta do histórico. Você pode editar e reimprimir.");
  }

  function blankLikeData() {
    return {
      medico_nome: "", medico_crm: "", medico_uf: "", medico_especialidade: "",
      medico_rqe: "", medico_endereco: "", medico_telefone: "",
      paciente_nome: "", paciente_endereco: "", paciente_bairro: "",
      cidade: "", data_emissao: new Date().toISOString().slice(0, 10),
      validade_meses: 6, itens: [{ nome: "", quantidade: "", posologia: "" }],
    };
  }

  /* ── Dashboard (Início) ────────────────────────────────────────────────── */
  function countListItems() {
    let n = 0;
    ["dl-medicos", "dl-medicamentos", "dl-pacientes"].forEach(id => {
      const dl = document.getElementById(id);
      if (dl && dl.children.length) n++;
    });
    return n;
  }

  function mostUsedModel(hist) {
    if (!hist.length) return "—";
    const count = {};
    hist.forEach(h => { count[h.modelId] = (count[h.modelId] || 0) + 1; });
    let best = null, bestN = 0;
    Object.keys(count).forEach(k => { if (count[k] > bestN) { bestN = count[k]; best = k; } });
    const m = window.Models.byId(best);
    return m ? m.nome : (best || "—");
  }

  function countToday(hist) {
    const today = new Date().toDateString();
    return hist.filter(h => { const d = new Date(h.emittedAt); return !isNaN(d) && d.toDateString() === today; }).length;
  }
  function countWeek(hist) {
    return hist.filter(h => { const t = Date.parse(h.emittedAt); return !isNaN(t) && (Date.now() - t) <= 7 * 86400000; }).length;
  }

  function renderDashboard() {
    const hist = window.Store.listHistory();
    const tpls = window.Store.listTemplates();

    const stats = $("#dash-stats");
    if (stats) {
      const cards = [
        { n: hist.length, l: "receitas emitidas" },
        { n: countToday(hist), l: "hoje" },
        { n: countWeek(hist), l: "nos últimos 7 dias" },
        { n: tpls.length, l: "modelos salvos" },
        { n: countListItems(), l: "listas carregadas", sub: "de 3" },
        { n: mostUsedModel(hist), l: "modelo mais usado", wide: true },
      ];
      stats.innerHTML = cards.map(c =>
        `<div class="dash-stat ${c.wide ? "wide" : ""}">
          <div class="ds-n">${escHtml(String(c.n))}${c.sub ? `<small> ${escHtml(c.sub)}</small>` : ""}</div>
          <div class="ds-l">${escHtml(c.l)}</div>
        </div>`).join("");
    }

    const recent = $("#dash-recent");
    const clr = $("#dash-clear-hist");
    if (clr) clr.style.display = hist.length ? "" : "none";
    if (recent) {
      if (!hist.length) {
        recent.innerHTML = `<div class="dash-empty">Nenhuma receita emitida ainda. Clique em "Nova receita" para começar.</div>`;
      } else {
        recent.innerHTML = hist.slice(0, 6).map(h => {
          const dt = new Date(h.emittedAt);
          const quando = isNaN(dt) ? "" : dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          return `<button class="dash-rec" data-hist="${h.id}">
            <span class="dr-pac">${escHtml(h.paciente || "(sem paciente)")}</span>
            <span class="dr-meta">${escHtml(h.modelName || "")} · ${escHtml(quando)}</span>
          </button>`;
        }).join("");
        $$("#dash-recent [data-hist]").forEach(b => b.addEventListener("click", () => {
          loadHistory(b.dataset.hist); switchTab("receitas");
        }));
      }
    }
  }

  /* ── Painel flutuante: receitas criadas (histórico) ────────────────────── */
  function setupHistoryPanel() {
    const fab = $("#hist-fab"), panel = $("#hist-panel"), close = $("#hist-panel-close");
    if (!fab || !panel) return;
    fab.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      if (open) renderHistoryPanel();
    });
    close?.addEventListener("click", () => { panel.hidden = true; });
    updateHistFab();
  }

  function updateHistFab() {
    const badge = $("#hist-fab-badge");
    if (badge) {
      const n = window.Store.listHistory().length;
      badge.textContent = n;
      badge.style.display = n ? "" : "none";
    }
  }

  function renderHistoryPanel() {
    const host = $("#hist-panel-list");
    if (!host) return;
    const hist = window.Store.listHistory();
    if (!hist.length) { host.innerHTML = `<div class="dash-empty">Nenhuma receita criada ainda.</div>`; return; }
    host.innerHTML = hist.slice(0, 40).map(h => {
      const dt = new Date(h.emittedAt);
      const quando = isNaN(dt) ? "" : dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      return `<div class="hp-item" data-hist="${h.id}">
        <button class="hp-del" data-histdel="${h.id}" title="Excluir">×</button>
        <div class="hp-pac">${escHtml(h.paciente || "(sem paciente)")}</div>
        <div class="hp-meta">${escHtml(h.modelName || "")} · ${escHtml(quando)}</div>
        <div class="hp-actions">
          <button class="hp-btn" data-hpedit="${h.id}">✎ Editar</button>
          <button class="hp-btn" data-hpdup="${h.id}" data-side="A">▤ Dupla ◧</button>
          <button class="hp-btn" data-hpdup="${h.id}" data-side="B">▤ Dupla ◨</button>
        </div>
      </div>`;
    }).join("");

    // reabrir para editar (botão explícito ou clique no cartão)
    const reopen = id => { loadHistory(id); $("#hist-panel").hidden = true; };
    $$("#hist-panel-list [data-hpedit]").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); reopen(b.dataset.hpedit); }));
    $$("#hist-panel-list [data-hist]").forEach(el => el.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      reopen(el.dataset.hist);
    }));

    // enviar para a Receita Dupla (lado A ou B)
    $$("#hist-panel-list [data-hpdup]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const entry = window.Store.getHistory(b.dataset.hpdup);
      if (!entry) return;
      if (!window.Dupla) { toast("Receita Dupla indisponível.", "err"); return; }
      window.Dupla.loadIntoSide(b.dataset.side, entry);
      switchTab("dupla");
      $("#hist-panel").hidden = true;
    }));

    $$("#hist-panel-list [data-histdel]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      window.Store.deleteHistory(b.dataset.histdel); renderHistoryPanel(); updateHistFab(); renderHistory();
    }));
  }

  /* ── Redimensionar as colunas (janelas) ────────────────────────────────── */
  function setupResizers() {
    const wb = document.querySelector(".workbench");
    if (!wb) return;
    // restaura tamanhos salvos
    try {
      const s = JSON.parse(localStorage.getItem("rx_wb_sizes") || "{}");
      if (s.rail) wb.style.setProperty("--wb-rail", s.rail);
      if (s.preview) wb.style.setProperty("--wb-preview", s.preview);
    } catch (_) {}

    $$(".wb-resizer").forEach(rz => {
      rz.addEventListener("pointerdown", e => {
        e.preventDefault();
        const which = rz.dataset.resize;
        const rect = wb.getBoundingClientRect();
        document.body.classList.add("wb-resizing");
        const move = ev => {
          if (which === "rail") {
            const px = Math.min(360, Math.max(170, ev.clientX - rect.left));
            wb.style.setProperty("--wb-rail", px + "px");
          } else {
            const pct = Math.min(70, Math.max(24, ((rect.right - ev.clientX) / rect.width) * 100));
            wb.style.setProperty("--wb-preview", pct + "%");
          }
          if (state.zoom) renderPreview();
        };
        const up = () => {
          document.body.classList.remove("wb-resizing");
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          try {
            localStorage.setItem("rx_wb_sizes", JSON.stringify({
              rail: wb.style.getPropertyValue("--wb-rail"),
              preview: wb.style.getPropertyValue("--wb-preview"),
            }));
          } catch (_) {}
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
    });
  }

  function setupDashboard() {
    $$("#view-inicio [data-goto]").forEach(b =>
      b.addEventListener("click", () => switchTab(b.dataset.goto)));
    $("#dash-clear-hist")?.addEventListener("click", () => {
      if (!window.Store.listHistory().length) { toast("O histórico já está vazio."); return; }
      if (!confirm("Apagar todo o histórico de receitas emitidas? Esta ação não pode ser desfeita.")) return;
      window.Store.clearHistory();
      renderDashboard();
      renderHistory();
      toast("Histórico apagado.");
    });
  }

  /* ── Zoom da pré-visualização ──────────────────────────────────────────── */
  // Calcula o zoom que faz a folha A4 caber na largura útil do palco.
  // sheetH opcional: quando informado, a folha INTEIRA cabe na tela (sem rolagem).
  function computeFit(stageEl, sheetW, sheetH) {
    if (!stageEl) return 0.62;
    const cs = getComputedStyle(stageEl);
    const padX = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.paddingRight || 0);
    const padY = parseFloat(cs.paddingTop || 0) + parseFloat(cs.paddingBottom || 0);
    const availW = stageEl.clientWidth - padX - 8;   // folga para a barra de rolagem
    const w = sheetW || 794;                        // A4 retrato a 96dpi ≈ 794px
    if (!availW || availW <= 0) return 0.62;
    let z = availW / w;
    if (sheetH) {
      const availH = stageEl.clientHeight - padY - 8;
      if (availH > 0) z = Math.min(z, availH / sheetH);
    }
    return Math.max(0.3, Math.min(2, z));
  }

  function applyZoom(z, opts) {
    state.zoom = Math.max(0.3, Math.min(2, z));
    const scaler = $("#a4-scaler");
    if (scaler) {
      scaler.style.transform = `scale(${state.zoom})`;
      const sheet = scaler.firstElementChild;
      if (sheet) sizeScalerWrap(scaler, sheet);
    }
    const sl = $("#zoom"); if (sl) sl.value = state.zoom;
    const lb = $("#zoom-v"); if (lb) lb.textContent = Math.round(state.zoom * 100) + "%";
    if (opts && opts.manual) state.zoomMode = "manual";
    markZoomButtons();
  }

  function markZoomButtons() {
    const map = { width: "#zoom-fit", page: "#zoom-page", real: "#zoom-100" };
    Object.keys(map).forEach(k => {
      const el = $(map[k]);
      if (el) el.classList.toggle("primary", state.zoomMode === k);
    });
  }

  // modo: "width" (largura — texto maior, rola na vertical)
  //       "page"  (folha inteira na tela)
  //       "real"  (100%)
  function fitPreview(mode) {
    if (mode) state.zoomMode = mode;
    const m = state.zoomMode;
    if (m === "manual") return;
    if (m === "real") { applyZoom(1); return; }
    const stage = document.querySelector("#view-receitas .preview-stage");
    const sheet = document.querySelector("#a4-scaler .a4");
    const w = sheet ? sheet.offsetWidth : 794;
    const h = sheet ? sheet.offsetHeight : 1123;
    applyZoom(computeFit(stage, w, m === "page" ? h : null));
  }

  $("#zoom")?.addEventListener("input", e => {
    applyZoom(parseFloat(e.target.value), { manual: true });
  });
  $("#zoom-fit")?.addEventListener("click", () => fitPreview("width"));
  $("#zoom-page")?.addEventListener("click", () => fitPreview("page"));
  $("#zoom-100")?.addEventListener("click", () => fitPreview("real"));

  // Redimensionar a janela reajusta a folha (quando em modo "ajustar").
  let rzTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => {
      if (state.tab === "receitas") fitPreview();
      if (state.tab === "folha" && state.folhaFit) fitFolha();
    }, 120);
  });

  /* ── Gaveta de formatação (recolhível) ─────────────────────────────────── */
  $("#fmt-dock-toggle")?.addEventListener("click", () => {
    const dock = $("#fmt-dock");
    if (!dock) return;
    const collapsed = dock.classList.toggle("collapsed");
    $("#fmt-dock-toggle").setAttribute("aria-expanded", String(!collapsed));
    setTimeout(() => fitPreview(), 20);
  });

  /* ── Abas ──────────────────────────────────────────────────────────────── */
  $$(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  function switchTab(tab) {
    // Saindo da folha: grava o que estiver digitado antes de trocar de aba.
    if (state.tab === "folha" && tab !== "folha") {
      const sheet = document.querySelector("#folha-scaler .a4");
      if (sheet) captureOverride(sheet);
      renderPreview();
    }
    state.tab = tab;
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    $("#view-receitas").classList.toggle("hidden", tab !== "receitas");
    $("#view-inicio").classList.toggle("hidden", tab !== "inicio");
    $("#view-folha").classList.toggle("hidden", tab !== "folha");
    if (tab === "folha") renderFolha();
    if (tab === "receitas") setTimeout(() => fitPreview(), 20);
    if (tab === "inicio") renderDashboard();
    $("#view-importar").classList.toggle("hidden", tab !== "importar");
    $("#view-listas").classList.toggle("hidden", tab !== "listas");
    $("#view-custom").classList.toggle("hidden", tab !== "custom");
    $("#view-dupla").classList.toggle("hidden", tab !== "dupla");
    if (tab === "custom") renderCarimboPreview();
    if (tab === "dupla" && window.Dupla) { window.Dupla.init(); window.Dupla.refresh(); }

    // Rede de segurança: se por algum motivo nenhuma aba ficou visível
    // (por exemplo, um arquivo antigo em cache), volta para o Início em vez
    // de deixar a tela em branco.
    const algumaVisivel = $$(".view").some(v => !v.classList.contains("hidden"));
    if (!algumaVisivel) {
      $("#view-inicio").classList.remove("hidden");
      $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === "inicio"));
      state.tab = "inicio";
      renderDashboard();
    }
    // Cada aba começa do topo.
    const atual = $("#view-" + (tab === "dupla" ? "dupla" : tab));
    if (atual) atual.scrollTop = 0;
  }

  /* ── Importar Receita ──────────────────────────────────────────────────── */
  function setupImport() {
    const dz = $("#dropzone"), input = $("#file-input");
    const prog = $("#import-progress"), bar = $("#import-bar"), msg = $("#import-msg");
    const box = $("#extracted");

    dz.addEventListener("click", () => input.click());
    dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("drag"); });
    dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
    dz.addEventListener("drop", e => {
      e.preventDefault(); dz.classList.remove("drag");
      if (e.dataTransfer.files[0]) runImport(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", () => { if (input.files[0]) runImport(input.files[0]); });

    async function runImport(file) {
      box.classList.remove("on");
      prog.classList.add("on"); bar.style.width = "0%";
      const step = (p, m) => { bar.style.width = Math.round(p) + "%"; msg.textContent = m; };
      try {
        const fields = await window.Importer.handleFile(file, step);
        showExtracted(fields);
      } catch (e) {
        step(100, "Erro."); toast(e.message || "Falha na importação.", "err");
      } finally {
        setTimeout(() => prog.classList.remove("on"), 800);
      }
    }

    function showExtracted(f) {
      box.classList.add("on");
      const itensTxt = f.itens.length
        ? f.itens.map((i, n) => `${n + 1}. ${i.nome}${i.posologia ? " — " + i.posologia : ""}`).join("<br>")
        : "<i>Nenhum medicamento reconhecido — preencha manualmente.</i>";
      $("#ex-fields").innerHTML = `
        <div class="ex-field"><div class="k">Paciente</div><div class="v">${f.paciente || "—"}</div></div>
        <div class="ex-field"><div class="k">Médico</div><div class="v">${f.medico || "—"}</div></div>
        <div class="ex-field"><div class="k">CRM</div><div class="v">${f.crm ? (f.uf ? f.uf + " " : "") + f.crm : "—"}</div></div>
        <div class="ex-field"><div class="k">Data</div><div class="v">${f.data || "—"}</div></div>
        <div class="ex-field full"><div class="k">Medicamentos & posologia</div><div class="v">${itensTxt}</div></div>`;
      $("#raw-text").textContent = f.raw || "";
      $("#btn-use-import").onclick = () => applyImport(f);
    }

    function applyImport(f) {
      switchTab("receitas");
      const d = state.data;
      if (f.paciente) d.paciente_nome = f.paciente;
      if (f.medico)   d.medico_nome = f.medico;
      if (f.crm)      d.medico_crm = f.crm;
      if (f.uf)       d.medico_uf = f.uf;
      if (f.data)     d.data_emissao = f.data;
      if (f.itens.length) {
        d.itens = f.itens.map(i => ({ nome: i.nome, quantidade: i.quantidade || "", posologia: i.posologia || "" }));
      }
      // se o modelo ativo está em edição livre, o formulário não afeta a folha:
      // desfaz o override para que os dados importados apareçam.
      const model = window.Models.byId(state.activeModelId);
      if (model && state.overrides[model.id]) {
        delete state.overrides[model.id];
        window.Store.clearOverride(model.id);
        if (state.editMode) toggleEditMode();
      }
      renderForm(); renderPreview(); renderReqWarn();
      toast("Formulário preenchido a partir da importação.");
    }

    $("#raw-toggle").addEventListener("click", () => $("#raw-text").classList.toggle("on"));
  }

  /* ── Listas de autocomplete (médicos / medicamentos / clientes) ────────── */
  const LIST_KIND = {
    medicos:      { key: "rx_list_medicos",      dl: "dl-medicos",      url: "data/medicos.csv",     heads: ["NOME", "MEDICO", "MÉDICO", "NAME"],                         defCol: 0 },
    medicamentos: { key: "rx_list_medicamentos", dl: "dl-medicamentos", url: "data/medicamentos.csv", heads: ["NOME", "PRODUTO", "MEDICAMENTO", "DESCRICAO", "DESCRIÇÃO"], defCol: 0 },
    pacientes:    { key: "rx_list_pacientes",    dl: "dl-pacientes",    url: "data/clientes.csv",     heads: ["CLIENTE", "PACIENTE", "NOME", "NAME"],                     defCol: 1 },
  };

  // Divide uma linha de CSV respeitando aspas.
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
    const counts = {
      ";": (headerLine.match(/;/g) || []).length,
      ",": (headerLine.match(/,/g) || []).length,
      "\t": (headerLine.match(/\t/g) || []).length,
    };
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || ";";
  }

  function pickColumn(headers, kind) {
    const H = headers.map(h => h.trim().toUpperCase());
    for (const w of LIST_KIND[kind].heads) { const i = H.indexOf(w); if (i >= 0) return i; }
    return Math.min(LIST_KIND[kind].defCol, Math.max(0, headers.length - 1));
  }

  // Extrai a lista de nomes de um texto CSV.
  function parseCsvNames(text, kind) {
    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim().length);
    if (!lines.length) return [];
    const delim = detectDelim(lines[0]);
    const headers = splitCsvLine(lines[0], delim);
    const col = pickColumn(headers, kind);
    const out = [], seen = new Set();
    for (let i = 1; i < lines.length; i++) {
      const parts = splitCsvLine(lines[i], delim);
      let v = (parts[col] || "").trim().replace(/^"|"$/g, "");
      const low = v.toLowerCase();
      if (v && v.length > 1 && !/^\d+$/.test(v) && !seen.has(low)) {
        seen.add(low); out.push(v);
      }
    }
    return out;
  }

  // Lê o arquivo tentando UTF-8 e caindo para Windows-1252 (ANSI) se houver acento quebrado.
  async function readCsvText(file) {
    const buf = await file.arrayBuffer();
    let txt = new TextDecoder("utf-8").decode(buf);
    if (txt.includes("\uFFFD")) {
      try { txt = new TextDecoder("windows-1252").decode(buf); } catch (_) { /* mantém utf-8 */ }
    }
    return txt;
  }

  function fillDatalist(id, names) {
    const dl = document.getElementById(id);
    if (!dl) return;
    dl.innerHTML = "";
    const frag = document.createDocumentFragment();
    names.forEach(n => { const o = document.createElement("option"); o.value = n; frag.appendChild(o); });
    dl.appendChild(frag);
  }

  function saveList(kind, names) { try { localStorage.setItem(LIST_KIND[kind].key, JSON.stringify(names)); } catch (_) {} }
  function loadSavedList(kind) { try { const s = localStorage.getItem(LIST_KIND[kind].key); return s ? JSON.parse(s) : null; } catch (_) { return null; } }
  function clearSavedList(kind) { try { localStorage.removeItem(LIST_KIND[kind].key); } catch (_) {} }

  function updateListStatus(kind, count, origin) {
    const st = document.getElementById("lst-" + kind + "-st");
    if (!st) return;
    st.textContent = count ? (count + " itens · " + origin) : "Nenhuma lista carregada";
    st.classList.toggle("has", !!count);
  }

  // No boot: usa a lista salva no navegador; se não houver, tenta o CSV do repositório em /data.
  async function loadDatalists() {
    for (const kind of Object.keys(LIST_KIND)) {
      const saved = loadSavedList(kind);
      if (saved && saved.length) {
        fillDatalist(LIST_KIND[kind].dl, saved);
        updateListStatus(kind, saved.length, "salva neste navegador");
        continue;
      }
      try {
        const r = await fetch(LIST_KIND[kind].url);
        if (!r.ok) { updateListStatus(kind, 0, ""); continue; }
        const names = parseCsvNames(await r.text(), kind);
        fillDatalist(LIST_KIND[kind].dl, names);
        updateListStatus(kind, names.length, names.length ? "do repositório (data/)" : "");
      } catch (_) { updateListStatus(kind, 0, ""); }
    }
  }

  // Aba "Listas": importação manual de CSV pelo usuário.
  function setupLists() {
    for (const kind of Object.keys(LIST_KIND)) {
      const input = document.getElementById("lst-" + kind);
      const clear = document.getElementById("lst-" + kind + "-clear");
      if (input) input.addEventListener("change", async e => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        try {
          const text = await readCsvText(f);
          const names = parseCsvNames(text, kind);
          if (!names.length) { toast("Nenhum nome reconhecido nesse arquivo.", "err"); input.value = ""; return; }
          fillDatalist(LIST_KIND[kind].dl, names);
          saveList(kind, names);
          updateListStatus(kind, names.length, "importada de " + f.name);
          toast(names.length + " itens importados.");
        } catch (err) {
          toast("Falha ao ler o CSV: " + (err && err.message ? err.message : err), "err");
        }
        input.value = "";
      });
      if (clear) clear.addEventListener("click", () => {
        clearSavedList(kind);
        fillDatalist(LIST_KIND[kind].dl, []);
        updateListStatus(kind, 0, "");
        toast("Lista removida deste navegador.");
      });
    }
  }

  /* ── Aba Carimbo & Fontes ──────────────────────────────────────────────── */
  const CK = { carimbo: "rx_carimbo", fonthead: "rx_fonthead", fontbody: "rx_fontbody" };

  function loadCustomSettings() {
    try {
      const c = localStorage.getItem(CK.carimbo);
      if (c) { const o = JSON.parse(c); state.carimbo.modo = o.modo || "auto"; state.carimbo.url = o.url || ""; state.carimbo.assinaturaUrl = o.assinaturaUrl || ""; }
    } catch (_) {}
    try {
      const fh = localStorage.getItem(CK.fonthead); if (fh) state.fmt.fontHead = fh;
      const fb = localStorage.getItem(CK.fontbody); if (fb) state.fmt.fontFamily = fb;
    } catch (_) {}
  }
  function saveCarimbo() { try { localStorage.setItem(CK.carimbo, JSON.stringify(state.carimbo)); } catch (_) {} }

  function renderCarimboPreview() {
    const host = $("#carimbo-preview");
    if (!host) return;
    host.innerHTML = window.Stamp.build({
      medico_nome: state.data.medico_nome || "Dr. Fulano de Tal",
      medico_crm: state.data.medico_crm || "00000", medico_uf: state.data.medico_uf || "MG",
      medico_especialidade: state.data.medico_especialidade,
      medico_rqe: state.data.medico_rqe,
      carimbo_modo: state.carimbo.modo, carimbo_url: state.carimbo.url,
      assinatura_url: state.carimbo.assinaturaUrl,
    });
  }

  function setupCustom() {
    // ── Carimbo ──────────────────────────────────────────────────────────
    const fields = $("#carimbo-img-fields");
    $$('input[name="carimbo-modo"]').forEach(r => {
      r.checked = r.value === state.carimbo.modo;
      r.addEventListener("change", () => {
        if (!r.checked) return;
        state.carimbo.modo = r.value;
        if (fields) fields.hidden = r.value !== "imagem";
        saveCarimbo(); renderCarimboPreview(); renderPreview();
      });
    });
    if (fields) fields.hidden = state.carimbo.modo !== "imagem";
    const urlInput = $("#carimbo-url");
    if (urlInput) urlInput.value = state.carimbo.url && !state.carimbo.url.startsWith("data:") ? state.carimbo.url : "";

    $("#carimbo-url-apply")?.addEventListener("click", () => {
      const u = ($("#carimbo-url").value || "").trim();
      if (!u) { toast("Cole o endereço (URL) de uma imagem.", "err"); return; }
      if (!/^https?:\/\//i.test(u)) { toast("A URL deve começar com http:// ou https://", "err"); return; }
      state.carimbo.modo = "imagem"; state.carimbo.url = u;
      $$('input[name="carimbo-modo"]').forEach(r => r.checked = r.value === "imagem");
      if (fields) fields.hidden = false;
      saveCarimbo(); renderCarimboPreview(); renderPreview();
      toast("Carimbo por imagem aplicado.");
    });

    $("#carimbo-file")?.addEventListener("change", async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 1.5 * 1024 * 1024) { toast("Imagem muito grande (máx. ~1,5 MB).", "err"); e.target.value = ""; return; }
      try {
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f);
        });
        state.carimbo.modo = "imagem"; state.carimbo.url = dataUrl;
        $$('input[name="carimbo-modo"]').forEach(r => r.checked = r.value === "imagem");
        if (fields) fields.hidden = false;
        saveCarimbo(); renderCarimboPreview(); renderPreview();
        toast("Carimbo enviado e aplicado.");
      } catch (_) { toast("Não foi possível ler a imagem.", "err"); }
      e.target.value = "";
    });

    // ── Fontes ───────────────────────────────────────────────────────────
    const cat = (window.Fonts && window.Fonts.list) || [];
    const opts = current => cat.map(f =>
      `<option value="${escAttr(f.css)}" ${f.css === current ? "selected" : ""}>${escHtml(f.label)}</option>`
    ).join("");
    const selHead = $("#cf-fonthead"), selBody = $("#cf-fontbody");
    if (selHead) selHead.innerHTML = opts(state.fmt.fontHead);
    if (selBody) selBody.innerHTML = opts(state.fmt.fontFamily);
    const demoHead = $("#cf-demo-head"), demoBody = $("#cf-demo-body");
    const refreshDemo = () => {
      if (demoHead) demoHead.style.fontFamily = selHead.value;
      if (demoBody) demoBody.style.fontFamily = selBody.value;
    };
    refreshDemo();
    selHead?.addEventListener("change", refreshDemo);
    selBody?.addEventListener("change", refreshDemo);

    $("#cf-fonts-apply")?.addEventListener("click", () => {
      state.fmt.fontHead = selHead.value;
      state.fmt.fontFamily = selBody.value;
      try { localStorage.setItem(CK.fonthead, state.fmt.fontHead); localStorage.setItem(CK.fontbody, state.fmt.fontFamily); } catch (_) {}
      renderFmtDrawer(); renderPreview();
      toast("Fontes aplicadas às receitas.");
    });

    renderCarimboPreview();

    // ── Assinatura (imagem separada) ─────────────────────────────────────
    const assinUrl = $("#assin-url");
    if (assinUrl) assinUrl.value = state.carimbo.assinaturaUrl && !state.carimbo.assinaturaUrl.startsWith("data:") ? state.carimbo.assinaturaUrl : "";
    $("#assin-url-apply")?.addEventListener("click", () => {
      const u = ($("#assin-url").value || "").trim();
      if (!/^https?:\/\//i.test(u)) { toast("A URL deve começar com http:// ou https://", "err"); return; }
      state.carimbo.assinaturaUrl = u; saveCarimbo(); renderCarimboPreview(); renderPreview();
      toast("Assinatura aplicada.");
    });
    $("#assin-file")?.addEventListener("change", async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (f.size > 1.5 * 1024 * 1024) { toast("Imagem muito grande (máx. ~1,5 MB).", "err"); e.target.value = ""; return; }
      try {
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
        state.carimbo.assinaturaUrl = dataUrl; saveCarimbo(); renderCarimboPreview(); renderPreview();
        toast("Assinatura enviada e aplicada.");
      } catch (_) { toast("Não foi possível ler a imagem.", "err"); }
      e.target.value = "";
    });
    $("#assin-clear")?.addEventListener("click", () => {
      state.carimbo.assinaturaUrl = ""; if (assinUrl) assinUrl.value = "";
      saveCarimbo(); renderCarimboPreview(); renderPreview(); toast("Assinatura removida.");
    });
  }

  /* ── Backup / restauração ──────────────────────────────────────────────── */
  function setupBackup() {
    $("#bkp-export")?.addEventListener("click", () => {
      const dump = window.Store.exportAll();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "backup-receitas-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Backup exportado.");
    });
    $("#bkp-import")?.addEventListener("change", async e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        const txt = await f.text();
        const obj = JSON.parse(txt);
        const replace = confirm("Restaurar backup.\n\nOK = SUBSTITUIR tudo que está neste navegador.\nCancelar = MESCLAR com o que já existe.");
        const n = window.Store.importAll(obj, replace);
        toast(n + " itens restaurados. Recarregando…");
        setTimeout(() => location.reload(), 900);
      } catch (err) { toast("Backup inválido: " + (err.message || err), "err"); }
      e.target.value = "";
    });
  }

  /* ── helpers de escape ─────────────────────────────────────────────────── */
  function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }
  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }

  /* ── API para a Receita Dupla puxar a receita atual ────────────────────── */
  window.MainReceita = {
    get: () => ({
      modelId: state.activeModelId,
      data: JSON.parse(JSON.stringify(state.data)),
      fmt: JSON.parse(JSON.stringify(state.fmt)),
    }),
  };

  /* ── Boot ──────────────────────────────────────────────────────────────── */
  function boot() {
    if (window.Fonts) window.Fonts.inject();
    loadCustomSettings();
    try { state.overrides = window.Store.allOverrides ? window.Store.allOverrides() : {}; } catch (_) { state.overrides = {}; }
    if (!state.overrides || typeof state.overrides !== "object") state.overrides = {};
    pickInitialModel();
    renderRail();
    renderForm();
    renderFmtDrawer();
    renderPreview();
    renderTemplates();
    renderHistory();
    setupImport();
    setupLists();
    setupCustom();
    setupBackup();
    setupDashboard();
    renderDashboard();
    setupResizers();
    setupHistoryPanel();
    setupFolha();
    loadDatalists();
    // Zoom inicial: ajusta à largura disponível em vez de um valor fixo de 62%.
    requestAnimationFrame(() => { fitPreview("width"); });
    $("#zoom-v").textContent = Math.round(state.zoom * 100) + "%";
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
