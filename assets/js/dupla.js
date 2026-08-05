/* ============================================================================
   dupla.js — Receita Dupla: duas receitas diferentes numa folha A4 paisagem.
   Cada lado (esquerda/direita) é totalmente editável: modelo, cabeçalho do
   médico, paciente, medicamentos, fontes, tamanho, entrelinha, margens e
   carimbo. Reaproveita os mesmos renderizadores de Models e a formatação FMT.
   ============================================================================ */
(function (global) {
  "use strict";

  const $  = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
  }
  function escAttr(s) { return esc(s).replace(/"/g, "&quot;"); }
  function today() { return new Date().toISOString().slice(0, 10); }

  function blankData() {
    return {
      medico_nome: "", medico_crm: "", medico_uf: "", medico_especialidade: "",
      medico_rqe: "", medico_endereco: "", medico_telefone: "",
      paciente_nome: "", paciente_endereco: "", paciente_bairro: "",
      cidade: "", data_emissao: today(), validade_meses: 6,
      itens: [{ nome: "", quantidade: "", posologia: "" }],
    };
  }

  function newSide() {
    const fmt = global.FMT.defaults();
    fmt.fontSize = 11;            // metades são mais estreitas → fonte um pouco menor
    fmt.margins = { t: 10, r: 10, b: 10, l: 10 };
    return { modelId: "simples_classica", data: blankData(), fmt };
  }

  const D = { zoom: 0.52, ratio: 50, sides: { A: newSide(), B: newSide() } };

  /* ── Proporção das metades (porcentagem livre, persistida no backup) ───── */
  function clampRatio(v) { return Math.min(80, Math.max(20, Math.round(v))); }
  function persistRatio() { try { localStorage.setItem("rx_dup_ratio", String(D.ratio)); } catch (_) {} }
  function loadRatio() {
    try { const r = localStorage.getItem("rx_dup_ratio"); if (r !== null) { const n = parseInt(r, 10); if (!isNaN(n)) D.ratio = clampRatio(n); } } catch (_) {}
  }
  function updateRatioUI() {
    const s = $("#dup-ratio"), l = $("#dup-ratio-v");
    if (s) s.value = D.ratio;
    if (l) l.textContent = D.ratio + "% / " + (100 - D.ratio) + "%";
  }
  // Atualiza só as larguras no DOM (rápido, para arrastar sem reconstruir a folha).
  function applyRatioToDom() {
    const land = document.querySelector("#dup-scaler .a4-land");
    if (!land) return false;
    const halves = land.querySelectorAll(".rx-half");
    if (halves.length < 2) return false;
    halves[0].style.width = D.ratio + "%";
    halves[1].style.width = (100 - D.ratio) + "%";
    const dv = land.querySelector(".dup-divider");
    if (dv) dv.style.left = D.ratio + "%";
    return true;
  }
  // Ajuste "definitivo" (slider/presets): grava, sincroniza UI e aplica.
  function setRatio(v) {
    D.ratio = clampRatio(v);
    persistRatio(); updateRatioUI();
    if (!applyRatioToDom()) renderPreview();
  }

  /* ── Configurações globais (carimbo e fontes) vindas da aba Carimbo & Fontes */
  function getCarimbo() {
    try { const c = localStorage.getItem("rx_carimbo"); if (c) return JSON.parse(c); } catch (_) {}
    return { modo: "auto", url: "", assinaturaUrl: "" };
  }
  function applyGlobalFonts() {
    let fh = null, fb = null;
    try { fh = localStorage.getItem("rx_fonthead"); fb = localStorage.getItem("rx_fontbody"); } catch (_) {}
    ["A", "B"].forEach(k => {
      if (fh) D.sides[k].fmt.fontHead = fh;
      if (fb) D.sides[k].fmt.fontFamily = fb;
    });
  }

  function genCode() {
    const p = () => Math.random().toString(36).slice(2, 6).toUpperCase();
    return p() + "-" + p();
  }

  /* ── Montagem da folha paisagem ────────────────────────────────────────── */
  function buildHalf(sideKey, forEmit) {
    const s = D.sides[sideKey];
    const model = global.Models.byId(s.modelId);
    const half = document.createElement("div");
    half.className = "rx-half " + (model ? model.cls : "");
    half.dataset.side = sideKey;
    half.style.width = (sideKey === "A" ? D.ratio : (100 - D.ratio)) + "%";
    const car = getCarimbo();
    s.data.carimbo_modo = car.modo; s.data.carimbo_url = car.url;
    s.data.assinatura_url = car.assinaturaUrl || "";
    s.data.carimbo_modelo = car.modelo || "mod01";
    s.data.carimbo_icone  = car.icone == null ? "" : car.icone;
    s.data.carimbo_escala = car.escala || 1;
    s.data.carimbo_texto  = car.texto || {};
    s.data.numero_sequencial = model && model.seq
      ? (forEmit ? global.Store.nextSeq(model.seq) : global.Store.peekSeq(model.seq)) : "";
    s.data.codigo_acesso = model && model.id === "ce_oficial" ? (forEmit ? genCode() : "XXXX-XXXX") : "";
    half.innerHTML = model ? model.render(s.data) : "<p style='color:#888'>Modelo não encontrado.</p>";
    global.FMT.apply(half, s.fmt, !!(s.data.medico_nome || "").trim());
    return half;
  }

  // Alça divisória arrastável (mouse e toque, via Pointer Events).
  function attachDividerDrag(land, divider) {
    let dragging = false;
    const onMove = e => {
      if (!dragging) return;
      const rect = land.getBoundingClientRect();       // já considera o zoom (transform)
      if (!rect.width) return;
      const frac = ((e.clientX - rect.left) / rect.width) * 100;
      D.ratio = clampRatio(frac);
      updateRatioUI(); applyRatioToDom();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("dup-dragging");
      persistRatio();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    divider.addEventListener("pointerdown", e => {
      e.preventDefault();
      dragging = true;
      document.body.classList.add("dup-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
  }

  /* ── Encolher para caber: reduz a fonte do lado até o conteúdo caber nos
     210mm de altura da folha. Sem isso, o texto passa do fim da folha e
     é cortado na impressão.                                              */
  const FIT_KEY = "rx_dup_fit";
  let FIT_ON = true;
  function loadFit() {
    try { const v = localStorage.getItem(FIT_KEY); if (v !== null) FIT_ON = v === "1"; } catch (_) {}
  }
  function saveFit() { try { localStorage.setItem(FIT_KEY, FIT_ON ? "1" : "0"); } catch (_) {} }

  /* O conteúdo pode estourar por dentro (o .rx-body é flexível e encolhe),
     então medimos a metade E os blocos internos.                          */
  function overflows(half) {
    if (half.scrollHeight > half.clientHeight + 1) return true;
    const alvos = [half.querySelector(".rx-body")].concat(
      Array.prototype.slice.call(half.children)
    );
    for (let i = 0; i < alvos.length; i++) {
      const el = alvos[i];
      if (el && el.scrollHeight > el.clientHeight + 1) return true;
    }
    return false;
  }

  function fitLandscape(land) {
    const info = [];
    let holder = null;
    if (!land.isConnected) {
      holder = document.createElement("div");
      holder.style.cssText = "position:fixed;left:-99999px;top:0;visibility:hidden;";
      holder.appendChild(land);
      document.body.appendChild(holder);
    }
    land.querySelectorAll(".rx-half").forEach(half => {
      const side = half.dataset.side || "A";
      const base = (D.sides[side] && D.sides[side].fmt.fontSize) || 11;
      half.style.setProperty("--rx-size", base + "pt");
      if (!half.clientHeight) return;                 // aba fechada: não dá para medir
      if (!FIT_ON) return;
      let size = base, guard = 0;
      while (overflows(half) && size > 6 && guard++ < 80) {
        size = Math.round((size - 0.25) * 100) / 100;
        half.style.setProperty("--rx-size", size + "pt");
      }
      if (size < base) info.push((side === "A" ? "esquerda" : "direita") + " " + size + "pt");
      if (overflows(half)) info.push((side === "A" ? "esquerda" : "direita") + " ainda excede");
    });
    if (holder) { holder.removeChild(land); document.body.removeChild(holder); }
    return info;
  }

  function showFitInfo(info) {
    const el = $("#dup-fit-info");
    if (!el) return;
    if (!info || !info.length) { el.textContent = ""; el.hidden = true; return; }
    el.hidden = false;
    el.textContent = info.some(t => t.indexOf("excede") >= 0)
      ? "Atenção: o conteúdo ainda passa do fim da folha (" + info.join(", ") +
        "). Reduza as margens, a entrelinha ou o número de itens."
      : "Ajustado para caber na folha: " + info.join(", ") + ".";
  }

  function buildLandscape(forEmit) {
    const land = document.createElement("div");
    land.className = "a4-land";
    land.appendChild(buildHalf("A", forEmit));
    land.appendChild(buildHalf("B", forEmit));
    if (!forEmit) {
      const divider = document.createElement("div");
      divider.className = "dup-divider";
      divider.style.left = D.ratio + "%";
      divider.title = "Arraste para mudar a proporção";
      divider.innerHTML = '<span class="dup-divider-grip"></span>';
      land.appendChild(divider);
      attachDividerDrag(land, divider);
    }
    return land;
  }

  // A4 paisagem: 297mm x 210mm ≈ 1123 x 794 px (a 96dpi)
  const LAND_W = 1123, LAND_H = 794;
  function renderPreview() {
    const sc = $("#dup-scaler");
    if (!sc) return;
    sc.innerHTML = "";
    const land = buildLandscape();
    sc.appendChild(land);
    showFitInfo(fitLandscape(land));
    sc.style.transform = `scale(${D.zoom})`;
    // reserva o tamanho JÁ escalado no wrapper, senão a folha (1123px) vaza
    const wrap = sc.parentElement;
    if (wrap && wrap.classList.contains("dup-scaler-wrap")) {
      wrap.style.width = Math.round(LAND_W * D.zoom) + "px";
      wrap.style.height = Math.round(LAND_H * D.zoom) + "px";
    }
    const zv = $("#dup-zoom-v");
    if (zv) zv.textContent = Math.round(D.zoom * 100) + "%";
  }

  /* ── Editor de cada lado ───────────────────────────────────────────────── */
  function modelOptions(selId) {
    const cats = global.Models.categories();
    return Object.keys(cats).map(cat =>
      `<optgroup label="${escAttr(cat)}">` +
      cats[cat].map(m => `<option value="${m.id}" ${m.id === selId ? "selected" : ""}>${esc(m.nome)}</option>`).join("") +
      "</optgroup>"
    ).join("");
  }

  function fontOptions(cur) {
    const cat = (global.Fonts && global.Fonts.list) || [];
    return cat.map(f => `<option value="${escAttr(f.css)}" ${f.css === cur ? "selected" : ""}>${esc(f.label)}</option>`).join("");
  }

  function field(label, key, list) {
    return `<label class="field"><span>${esc(label)}</span>` +
      `<input type="text" data-k="${key}" ${list ? `list="${list}"` : ""}></label>`;
  }

  function renderSideForm(sideKey) {
    const host = $("#dup-form-" + sideKey);
    if (!host) return;
    const s = D.sides[sideKey];

    host.innerHTML = `
      <label class="field"><span>Modelo desta receita</span>
        <select class="dup-model">${modelOptions(s.modelId)}</select></label>

      <div class="dup-sec">Médico</div>
      ${field("Nome do médico", "medico_nome", "dl-medicos")}
      <div class="dup-row3">
        ${field("CRM", "medico_crm")}
        ${field("UF", "medico_uf")}
        ${field("RQE", "medico_rqe")}
      </div>
      ${field("Especialidade", "medico_especialidade")}
      ${field("Endereço do médico", "medico_endereco")}
      ${field("Telefone", "medico_telefone")}

      <div class="dup-sec">Paciente</div>
      ${field("Nome do paciente", "paciente_nome", "dl-pacientes")}
      ${field("Endereço", "paciente_endereco")}
      <div class="dup-row2">
        ${field("Bairro", "paciente_bairro")}
        ${field("Cidade", "cidade")}
      </div>
      <label class="field"><span>Data de emissão</span>
        <input type="date" data-k="data_emissao"></label>

      <div class="dup-sec">Medicamentos</div>
      <div class="dup-itens"></div>
      <button class="btn-add dup-add" type="button">+ Adicionar medicamento</button>

      <div class="dup-sec">Formatação e margens</div>
      <label class="field"><span>Fonte do cabeçalho</span>
        <select class="dup-fonthead">${fontOptions(s.fmt.fontHead)}</select></label>
      <label class="field"><span>Fonte da prescrição</span>
        <select class="dup-fontbody">${fontOptions(s.fmt.fontFamily)}</select></label>
      <div class="slider">
        <div class="slabel">Tamanho da fonte <b data-v="size">${s.fmt.fontSize}pt</b></div>
        <input type="range" data-f="size" min="7" max="14" step="0.5" value="${s.fmt.fontSize}">
      </div>
      <div class="slider">
        <div class="slabel">Espaçamento entre linhas <b data-v="lh">${s.fmt.lineHeight}</b></div>
        <input type="range" data-f="lh" min="1" max="2" step="0.05" value="${s.fmt.lineHeight}">
      </div>
      <div class="slabel" style="font-size:12px;color:var(--muted);margin:6px 0 5px">Margens (mm)</div>
      <div class="dup-margins">
        <label class="field" style="margin:0"><span>Sup.</span><input type="number" data-f="mt" min="0" max="30" value="${s.fmt.margins.t}"></label>
        <label class="field" style="margin:0"><span>Dir.</span><input type="number" data-f="mr" min="0" max="30" value="${s.fmt.margins.r}"></label>
        <label class="field" style="margin:0"><span>Inf.</span><input type="number" data-f="mb" min="0" max="30" value="${s.fmt.margins.b}"></label>
        <label class="field" style="margin:0"><span>Esq.</span><input type="number" data-f="ml" min="0" max="30" value="${s.fmt.margins.l}"></label>
      </div>
      <label class="toggle" style="margin-top:10px">
        <input type="checkbox" data-f="autostamp" ${s.fmt.autoStamp ? "checked" : ""}>
        Ajustar altura do carimbo automaticamente
      </label>
      <div class="slider ${s.fmt.autoStamp ? "locked" : ""}" data-stamp-manual>
        <div class="slabel">Altura do carimbo <b data-v="sh">${s.fmt.stampHeight}mm</b></div>
        <input type="range" data-f="sh" min="10" max="36" step="1" value="${s.fmt.stampHeight}" ${s.fmt.autoStamp ? "disabled" : ""}>
      </div>`;

    bindSide(sideKey, host);
    renderItens(sideKey);
  }

  // Preenchimento automático (CRM do médico, endereço do paciente) na receita dupla.
  function autoCadastro(sideKey, host, campo) {
    const s = D.sides[sideKey];
    const C = global.Cadastro;
    if (!C) return;
    const inp = k => host.querySelector('[data-k="' + k + '"]');
    s._auto = s._auto || {};

    if (campo === "medico_nome") {
      const rec = C.lookup("medicos", (inp("medico_nome") || {}).value || "");
      if (!rec) return;
      C.preencher([
        { el: inp("medico_crm"),           chave: "crm",  valor: rec.crm },
        { el: inp("medico_uf"),            chave: "uf",   valor: (rec.uf || "").toUpperCase() },
        { el: inp("medico_especialidade"), chave: "esp",  valor: rec.especialidade },
        { el: inp("medico_rqe"),           chave: "rqe",  valor: rec.rqe },
        { el: inp("medico_endereco"),      chave: "end",  valor: rec.endereco },
        { el: inp("medico_telefone"),      chave: "tel",  valor: rec.telefone },
      ], s._auto);
    } else {
      const rec = C.lookup("pacientes", (inp("paciente_nome") || {}).value || "");
      if (!rec) return;
      C.preencher([
        { el: inp("paciente_endereco"), chave: "pend",   valor: rec.endereco },
        { el: inp("paciente_bairro"),   chave: "pbairro",valor: rec.bairro },
        { el: inp("cidade"),            chave: "pcidade",valor: rec.cidade },
      ], s._auto);
    }
  }

  function bindSide(sideKey, host) {
    const s = D.sides[sideKey];

    host.querySelector(".dup-model").addEventListener("change", e => {
      s.modelId = e.target.value; renderPreview();
    });

    host.querySelectorAll("[data-k]").forEach(inp => {
      const k = inp.dataset.k;
      inp.value = s.data[k] || "";
      inp.addEventListener("input", () => { s.data[k] = inp.value; renderPreview(); });
      // Ao digitar o nome do médico (ou do paciente), busca o restante no cadastro.
      if (k === "medico_nome" || k === "paciente_nome") {
        ["input", "change", "blur"].forEach(ev =>
          inp.addEventListener(ev, () => autoCadastro(sideKey, host, k)));
      }
    });

    host.querySelector(".dup-fonthead").addEventListener("change", e => { s.fmt.fontHead = e.target.value; renderPreview(); });
    host.querySelector(".dup-fontbody").addEventListener("change", e => { s.fmt.fontFamily = e.target.value; renderPreview(); });

    const mmap = { mt: "t", mr: "r", mb: "b", ml: "l" };
    host.querySelectorAll("[data-f]").forEach(inp => {
      const f = inp.dataset.f;
      if (mmap[f]) {
        inp.addEventListener("input", () => { s.fmt.margins[mmap[f]] = parseInt(inp.value || "0", 10); renderPreview(); });
      } else if (f === "size") {
        inp.addEventListener("input", () => {
          s.fmt.fontSize = parseFloat(inp.value);
          host.querySelector('[data-v="size"]').textContent = s.fmt.fontSize + "pt"; renderPreview();
        });
      } else if (f === "lh") {
        inp.addEventListener("input", () => {
          s.fmt.lineHeight = parseFloat(inp.value);
          host.querySelector('[data-v="lh"]').textContent = s.fmt.lineHeight; renderPreview();
        });
      } else if (f === "autostamp") {
        inp.addEventListener("change", () => {
          s.fmt.autoStamp = inp.checked;
          const box = host.querySelector("[data-stamp-manual]");
          box.classList.toggle("locked", s.fmt.autoStamp);
          box.querySelector('[data-f="sh"]').disabled = s.fmt.autoStamp;
          renderPreview();
        });
      } else if (f === "sh") {
        inp.addEventListener("input", () => {
          s.fmt.stampHeight = parseInt(inp.value, 10);
          host.querySelector('[data-v="sh"]').textContent = s.fmt.stampHeight + "mm"; renderPreview();
        });
      }
    });

    host.querySelector(".dup-add").addEventListener("click", () => {
      s.data.itens.push({ nome: "", quantidade: "", posologia: "" });
      renderItens(sideKey); renderPreview();
    });
  }

  function renderItens(sideKey) {
    const s = D.sides[sideKey];
    const host = $("#dup-form-" + sideKey).querySelector(".dup-itens");
    host.innerHTML = "";
    s.data.itens.forEach((it, idx) => {
      const el = document.createElement("div");
      el.className = "dup-item";
      el.innerHTML = `
        <div class="dup-item-head"><span>Medicamento ${idx + 1}</span><button class="med-del" title="Remover">×</button></div>
        <input type="text" class="di-nome" list="dl-medicamentos" placeholder="Nome / apresentação" value="${escAttr(it.nome)}">
        <input type="text" class="di-qtd" placeholder="Quantidade (ex.: 1 caixa)" value="${escAttr(it.quantidade)}">
        <textarea class="di-pos" placeholder="Posologia / modo de uso">${esc(it.posologia)}</textarea>`;
      el.querySelector(".di-nome").addEventListener("input", e => { it.nome = e.target.value; renderPreview(); });
      el.querySelector(".di-qtd").addEventListener("input", e => { it.quantidade = e.target.value; renderPreview(); });
      el.querySelector(".di-pos").addEventListener("input", e => { it.posologia = e.target.value; renderPreview(); });
      el.querySelector(".med-del").addEventListener("click", () => {
        s.data.itens.splice(idx, 1);
        if (!s.data.itens.length) s.data.itens.push({ nome: "", quantidade: "", posologia: "" });
        renderItens(sideKey); renderPreview();
      });
      host.appendChild(el);
    });
  }

  /* ── Barra de ações ────────────────────────────────────────────────────── */
  function toast(msg, kind) {
    const host = document.getElementById("toast-host");
    if (!host) return;
    const el = document.createElement("div");
    el.className = "toast " + (kind || "ok");
    el.textContent = msg; host.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  function setupToolbar() {
    $("#dup-copy")?.addEventListener("click", () => {
      // copia todos os dados e a formatação da esquerda para a direita
      D.sides.B.data = JSON.parse(JSON.stringify(D.sides.A.data));
      D.sides.B.fmt = JSON.parse(JSON.stringify(D.sides.A.fmt));
      D.sides.B.modelId = D.sides.A.modelId;
      renderSideForm("B"); renderPreview();
      toast("Receita da esquerda copiada para a direita.");
    });
    $("#dup-swap")?.addEventListener("click", () => {
      const tmp = D.sides.A; D.sides.A = D.sides.B; D.sides.B = tmp;
      renderSideForm("A"); renderSideForm("B"); renderPreview();
      toast("Lados trocados.");
    });

    // Puxar a receita montada na aba Receitas para um dos lados
    ["A", "B"].forEach(side => {
      $("#dup-pull-" + side)?.addEventListener("click", () => {
        if (!global.MainReceita) return;
        const m = global.MainReceita.get();
        const s = D.sides[side];
        s.modelId = m.modelId || s.modelId;
        s.data = Object.assign(blankData(), m.data);
        if (m.fmt) { s.fmt = Object.assign(global.FMT.defaults(), m.fmt); }
        renderSideForm(side); renderPreview();
        toast("Receita da aba Receitas trazida para o lado " + (side === "A" ? "esquerdo" : "direito") + ".");
      });
    });

    // Proporção das metades — porcentagem livre (20%–80% para o lado esquerdo)
    const ratioInput = $("#dup-ratio");
    if (ratioInput) {
      ratioInput.value = D.ratio;
      ratioInput.addEventListener("input", e => setRatio(parseInt(e.target.value, 10)));
    }
    updateRatioUI();
    $$(".dup-rp").forEach(b => b.addEventListener("click", () => setRatio(parseInt(b.dataset.r, 10))));
    $("#dup-print")?.addEventListener("click", () => {
      const land = buildLandscape(true);
      fitLandscape(land);
      window.Exporter.printSheet(land, { landscape: true });
    });
    $("#dup-pdf")?.addEventListener("click", async () => {
      try {
        const landPdf = buildLandscape(true);
        fitLandscape(landPdf);
        const ok = await window.Exporter.exportPdf(landPdf, "receita-dupla.pdf", { landscape: true });
        toast(ok ? "PDF exportado." : "Abrindo impressão para salvar em PDF.");
      } catch (e) { toast("Não foi possível gerar o PDF: " + e.message, "err"); }
    });
    loadFit();
    const fitChk = $("#dup-fit");
    if (fitChk) {
      fitChk.checked = FIT_ON;
      fitChk.addEventListener("change", () => { FIT_ON = fitChk.checked; saveFit(); renderPreview(); });
    }
    $("#dup-zoom-in")?.addEventListener("click", () => { D.zoom = Math.min(1, D.zoom + 0.06); renderPreview(); });
    $("#dup-zoom-out")?.addEventListener("click", () => { D.zoom = Math.max(0.3, D.zoom - 0.06); renderPreview(); });
  }

  let started = false;
  function ensureStarted() {
    if (started) return;
    started = true;
    loadRatio();
    applyGlobalFonts();
    renderSideForm("A");
    renderSideForm("B");
    setupToolbar();
    renderPreview();
    updateRatioUI();
  }

  // Carrega uma receita (do histórico) num lado específico ("A" ou "B").
  function loadIntoSide(side, entry) {
    if (!entry || (side !== "A" && side !== "B")) return;
    ensureStarted();
    const s = D.sides[side];
    if (entry.modelId) s.modelId = entry.modelId;
    s.data = Object.assign(blankData(), JSON.parse(JSON.stringify(entry.data || {})));
    if (entry.fmt) s.fmt = Object.assign(global.FMT.defaults(), entry.fmt);
    renderSideForm(side);
    renderPreview();
    toast("Receita trazida para o lado " + (side === "A" ? "esquerdo" : "direito") + ".");
  }

  // Exposto para o app.js chamar ao abrir a aba (recarrega carimbo/fontes/proporção atuais).
  global.Dupla = {
    init: ensureStarted,
    refresh: () => { if (started) { loadRatio(); applyGlobalFonts(); updateRatioUI(); renderPreview(); } },
    loadIntoSide,
  };
})(window);
