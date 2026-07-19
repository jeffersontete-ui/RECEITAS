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
    tab: "receitas",
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
    state.activeModelId = id;
    // carrega formatação salva desse modelo (se houver)
    const saved = window.Store.loadFmt(id);
    state.fmt = saved ? Object.assign(window.FMT.defaults(), saved) : window.FMT.defaults();
    renderRail(); renderPreview(); renderFmtDrawer();
    renderRenovavelField();
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
    renderItens();
    renderRenovavelField();
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
  function buildSheet() {
    const model = window.Models.byId(state.activeModelId);
    const a4 = document.createElement("div");
    if (!model) { a4.className = "a4"; a4.innerHTML = "<p style='color:#888'>Nenhum modelo selecionado.</p>"; return a4; }
    a4.className = "a4 " + model.cls;
    a4.innerHTML = model.render(state.data);
    window.FMT.apply(a4, state.fmt, !!state.data.medico_nome.trim());
    return a4;
  }

  function renderPreview() {
    const scaler = $("#a4-scaler");
    scaler.innerHTML = "";
    scaler.appendChild(buildSheet());
    scaler.style.transform = `scale(${state.zoom})`;
  }

  function renderFmtDrawer() {
    const host = $("#fmt-drawer");
    if (!state.activeModelId) { host.innerHTML = ""; return; }
    window.FMT.buildControls(host, state.fmt, () => renderPreview());
  }

  /* ── Barra de ações ────────────────────────────────────────────────────── */
  $("#btn-print")?.addEventListener("click", () => window.Exporter.printSheet(buildSheet()));

  $("#btn-pdf")?.addEventListener("click", async () => {
    const btn = $("#btn-pdf"); btn.disabled = true; const t = btn.textContent; btn.textContent = "Gerando…";
    try {
      const ok = await window.Exporter.exportPdf(buildSheet(), fileName());
      toast(ok ? "PDF exportado." : "Abrindo impressão para salvar em PDF.");
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

  /* ── Zoom ──────────────────────────────────────────────────────────────── */
  $("#zoom")?.addEventListener("input", e => {
    state.zoom = parseFloat(e.target.value);
    $("#a4-scaler").style.transform = `scale(${state.zoom})`;
    $("#zoom-v").textContent = Math.round(state.zoom * 100) + "%";
  });

  /* ── Abas ──────────────────────────────────────────────────────────────── */
  $$(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  function switchTab(tab) {
    state.tab = tab;
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    $("#view-receitas").classList.toggle("hidden", tab !== "receitas");
    $("#view-importar").classList.toggle("hidden", tab !== "importar");
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
      const d = state.data;
      if (f.paciente) d.paciente_nome = f.paciente;
      if (f.medico)   d.medico_nome = f.medico;
      if (f.crm)      d.medico_crm = f.crm;
      if (f.uf)       d.medico_uf = f.uf;
      if (f.data)     d.data_emissao = f.data;
      if (f.itens.length) {
        d.itens = f.itens.map(i => ({ nome: i.nome, quantidade: i.quantidade || "", posologia: i.posologia || "" }));
      }
      renderForm(); renderPreview();
      switchTab("receitas");
      toast("Formulário preenchido a partir da importação.");
    }

    $("#raw-toggle").addEventListener("click", () => $("#raw-text").classList.toggle("on"));
  }

  /* ── Autocomplete opcional a partir de CSVs em /data ───────────────────── */
  async function loadDatalists() {
    tryCsv("data/medicamentos.csv", "dl-medicamentos", 0);
    tryCsv("data/medicos.csv", "dl-medicos", 0);
    tryCsv("data/clientes.csv", "dl-pacientes", 1);
  }
  async function tryCsv(url, datalistId, col) {
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const txt = await r.text();
      const dl = document.getElementById(datalistId);
      if (!dl) return;
      const seen = new Set();
      txt.split("\n").slice(1).forEach(line => {
        const parts = line.split(/[;,]/);
        const val = (parts[col] || "").trim();
        if (val && val.length > 1 && !/^\d+$/.test(val) && !seen.has(val)) {
          seen.add(val);
          const o = document.createElement("option"); o.value = val; dl.appendChild(o);
        }
      });
    } catch (_) { /* sem CSV: segue sem autocomplete */ }
  }

  /* ── helpers de escape ─────────────────────────────────────────────────── */
  function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])); }
  function escAttr(s) { return escHtml(s).replace(/"/g, "&quot;"); }

  /* ── Boot ──────────────────────────────────────────────────────────────── */
  function boot() {
    pickInitialModel();
    renderRail();
    renderForm();
    renderFmtDrawer();
    renderPreview();
    renderTemplates();
    setupImport();
    loadDatalists();
    $("#zoom-v").textContent = Math.round(state.zoom * 100) + "%";
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
