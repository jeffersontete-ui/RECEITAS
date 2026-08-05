/* ============================================================================
   campos.js — Formatação INDIVIDUAL de cada campo da receita.
   Cada "campo" (nome do médico, CRM, paciente, medicamento, posologia,
   data, assinatura, carimbo…) pode ter fonte, tamanho, negrito, itálico,
   sublinhado, MAIÚSCULAS, alinhamento, cor, espaçamento e entrelinha
   próprios — sem afetar os demais.

   Como funciona: cada folha .a4 recebe um identificador (data-rxf) e as
   regras CSS de seus campos são escritas em um único <style> no <head>,
   escopadas por esse identificador. Assim vale na prévia, na aba
   "Editar na Folha", na impressão e no PDF.
   ============================================================================ */
(function (global) {
  "use strict";

  /* ── Catálogo de campos ────────────────────────────────────────────────
     sel = seletores CSS que representam esse campo nos vários modelos.   */
  const PARTES = [
    { id: "med_nome",  label: "Nome do médico",                    sel: [".rx-emit-name", ".rcem1-medico-nome"] },
    { id: "med_crm",   label: "CRM / registro do médico",          sel: [".rx-emit-line"] },
    { id: "med_sub",   label: "Especialidade, endereço e telefone", sel: [".rx-emit-sub"] },
    { id: "titulo",    label: "Título da receita",                 sel: [".titulo", ".t1", ".am-title", ".b2-title", ".ceo-title", ".ce344-tit", ".rsc-title-text"] },
    { id: "subtitulo", label: "Subtítulos, vias e selos",          sel: [".t2", ".am-sub", ".vias", ".am-vias", ".b2-sub", ".b2-vialabel", ".reno-badge"] },
    { id: "rotulos",   label: "Rótulos (Paciente:, Endereço:…)",   sel: [".rx-field .lbl"] },
    { id: "paciente",  label: "Dados do paciente (preenchidos)",   sel: [".rx-field .val"] },
    { id: "presc_tit", label: "Título PRESCRIÇÃO",                 sel: [".rx-presc-title", ".ceo-presc-l"] },
    { id: "med_item",  label: "Nome do medicamento",               sel: ["ol.rx-list .med"] },
    { id: "med_qtd",   label: "Quantidade do medicamento",         sel: ["ol.rx-list .qtd"] },
    { id: "med_pos",   label: "Posologia / modo de uso",           sel: ["ol.rx-list .pos"] },
    { id: "lista",     label: "Lista da prescrição (geral)",       sel: ["ol.rx-list", "ol.rx-list > li"] },
    { id: "localdata", label: "Cidade e data",                     sel: [".rx-localdata"] },
    { id: "assinatura",label: "Linha da assinatura",               sel: [".rx-sign-line"] },
    { id: "carimbo",   label: "Carimbo (texto gerado)",            sel: [".rx-stampbox .stamp"] },
    { id: "quadros",   label: "Quadros de identificação / rodapé", sel: [".ce-box", ".cbt", ".ce-emit-box", ".rx-foot .campo"] },
    { id: "corpo",     label: "Corpo inteiro da receita",          sel: [".rx-body"] },
  ];

  function defCfg() {
    return { font: "", size: "", bold: null, italic: null, underline: false,
             caps: false, align: "", color: "", ls: "", lh: "" };
  }

  function byId(id) { return PARTES.find(p => p.id === id) || PARTES[0]; }

  // Um campo está personalizado se qualquer propriedade sair do padrão.
  function isCustom(c) {
    if (!c) return false;
    return !!(c.font || c.size || c.bold != null || c.italic != null ||
              c.underline || c.caps || c.align || c.color ||
              (c.ls !== "" && c.ls != null) || (c.lh !== "" && c.lh != null));
  }

  function declarations(c) {
    const d = [];
    if (c.font)  d.push("font-family:" + c.font + " !important");
    if (c.size)  d.push("font-size:" + c.size + "pt !important");
    if (c.bold === true)   d.push("font-weight:700 !important");
    if (c.bold === false)  d.push("font-weight:400 !important");
    if (c.italic === true) d.push("font-style:italic !important");
    if (c.italic === false)d.push("font-style:normal !important");
    if (c.underline) d.push("text-decoration:underline !important");
    if (c.caps)      d.push("text-transform:uppercase !important");
    if (c.align)     d.push("text-align:" + c.align + " !important");
    if (c.color)     d.push("color:" + c.color + " !important");
    if (c.ls !== "" && c.ls != null) d.push("letter-spacing:" + c.ls + "px !important");
    if (c.lh !== "" && c.lh != null) d.push("line-height:" + c.lh + " !important");
    return d.join(";");
  }

  function cssFor(uid, partes) {
    let out = "";
    PARTES.forEach(p => {
      const decl = declarations(Object.assign(defCfg(), partes[p.id] || {}));
      if (!decl) return;
      const sel = p.sel.map(s => '.a4[data-rxf="' + uid + '"] ' + s).join(", ");
      out += sel + "{" + decl + "}\n";
    });
    return out;
  }

  /* ── Injeção das regras no documento ───────────────────────────────── */
  const reg = new Map();
  let seq = 0;

  function styleEl() {
    let el = document.getElementById("rx-campos-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "rx-campos-css";
      document.head.appendChild(el);
    }
    return el;
  }

  function flush(keepUid) {
    Array.from(reg.keys()).forEach(uid => {
      if (uid === keepUid) return;
      if (!document.querySelector('[data-rxf="' + uid + '"]')) reg.delete(uid);
    });
    styleEl().textContent = Array.from(reg.values()).join("\n");
  }

  // Chamada pelo FMT.apply() para cada folha montada.
  function applyTo(a4El, fmt) {
    if (!a4El) return;
    let uid = a4El.getAttribute("data-rxf");
    if (!uid) { uid = "rf" + (++seq); a4El.setAttribute("data-rxf", uid); }
    reg.set(uid, cssFor(uid, (fmt && fmt.partes) || {}));
    flush(uid);
  }

  // Descobre a qual campo pertence um elemento clicado na folha.
  function partAt(el) {
    if (!el || !el.closest) return null;
    let best = null, bestDepth = -1;
    PARTES.forEach(p => {
      p.sel.forEach(s => {
        let m = null;
        try { m = el.closest(s); } catch (_) { m = null; }
        if (!m) return;
        let depth = 0, n = m;
        while (n && !n.classList.contains("a4")) { depth++; n = n.parentElement; }
        if (depth > bestDepth) { bestDepth = depth; best = p.id; }
      });
    });
    return best;
  }

  /* ── Painel de controles ───────────────────────────────────────────── */
  let selecionado = PARTES[0].id;
  function select(id) { if (byId(id)) selecionado = id; }
  function selected() { return selecionado; }

  function fontCatalog() {
    return (global.Fonts && global.Fonts.list) || [
      { label: "Times New Roman", css: "'Times New Roman', Georgia, serif" },
      { label: "Arial", css: "Arial, Helvetica, sans-serif" },
    ];
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, m => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  /* host  = elemento onde o painel é desenhado
     fmt   = objeto de formatação do modelo (fmt.partes)
     onChange(id) = repinta a prévia / salva
     opts  = { onPick: fn, pickAtivo: bool }                                */
  function buildControls(host, fmt, onChange, opts) {
    if (!host) return;
    opts = opts || {};
    fmt.partes = fmt.partes || {};
    const cfg = Object.assign(defCfg(), fmt.partes[selecionado] || {});
    const cat = fontCatalog();

    const tri = (val, on, off) =>
      '<button type="button" class="cp-tg ' + (val === true ? "on" : val === false ? "off" : "") + '" ' +
      'data-tri="' + on + '" title="' + off + '">' + on + "</button>";

    host.innerHTML = `
      <h3 class="cp-h">Formatação de cada campo</h3>
      <p class="cp-hint">Escolha um campo e ajuste só ele — o resto da receita não muda.
        Também dá para clicar direto no texto da folha para selecionar o campo.</p>

      <div class="cp-top">
        <label class="field" style="margin:0;flex:1 1 210px">
          <span>Campo da receita</span>
          <select id="cp-alvo">
            ${PARTES.map(p => '<option value="' + p.id + '"' + (p.id === selecionado ? " selected" : "") + ">" +
              esc(p.label) + (isCustom(fmt.partes[p.id]) ? "  •" : "") + "</option>").join("")}
          </select>
        </label>
        <button type="button" class="btn ghost cp-pick ${opts.pickAtivo ? "on" : ""}" id="cp-pick"
                title="Clique aqui e depois no texto da folha para escolher o campo">🎯 Escolher na folha</button>
      </div>

      <div class="cp-grid">
        <label class="field" style="margin:0">
          <span>Fonte deste campo</span>
          <select id="cp-font">
            <option value="">Padrão do modelo</option>
            ${cat.map(f => '<option value="' + esc(f.css) + '"' + (f.css === cfg.font ? " selected" : "") + ">" +
              esc(f.label) + "</option>").join("")}
          </select>
        </label>

        <label class="field" style="margin:0">
          <span>Tamanho da fonte (pt)</span>
          <input type="number" id="cp-size" min="4" max="48" step="0.5"
                 value="${cfg.size}" placeholder="automático">
        </label>

        <div class="cp-line">
          <span class="cp-lab">Estilo</span>
          <div class="cp-tgs">
            ${tri(cfg.bold, "N", "Negrito: padrão → ligado → desligado")}
            ${tri(cfg.italic, "I", "Itálico: padrão → ligado → desligado")}
            <button type="button" class="cp-tg ${cfg.underline ? "on" : ""}" data-bool="underline" title="Sublinhado">S</button>
            <button type="button" class="cp-tg ${cfg.caps ? "on" : ""}" data-bool="caps" title="Tudo em MAIÚSCULAS">AA</button>
          </div>
        </div>

        <div class="cp-line">
          <span class="cp-lab">Alinhamento</span>
          <div class="cp-tgs">
            <button type="button" class="cp-tg ${cfg.align === "left" ? "on" : ""}" data-al="left" title="À esquerda">⟸</button>
            <button type="button" class="cp-tg ${cfg.align === "center" ? "on" : ""}" data-al="center" title="Centralizado">≡</button>
            <button type="button" class="cp-tg ${cfg.align === "right" ? "on" : ""}" data-al="right" title="À direita">⟹</button>
            <button type="button" class="cp-tg ${cfg.align === "justify" ? "on" : ""}" data-al="justify" title="Justificado">☰</button>
          </div>
        </div>

        <div class="cp-line">
          <span class="cp-lab">Cor do texto</span>
          <div class="cp-tgs">
            <input type="color" id="cp-color" value="${cfg.color || "#111111"}">
            <button type="button" class="btn ghost cp-mini" id="cp-color-clr">cor padrão</button>
          </div>
        </div>

        <label class="field" style="margin:0">
          <span>Espaço entre letras (px)</span>
          <input type="number" id="cp-ls" min="-2" max="12" step="0.5" value="${cfg.ls}" placeholder="automático">
        </label>

        <label class="field" style="margin:0">
          <span>Entrelinha deste campo</span>
          <input type="number" id="cp-lh" min="0.8" max="3" step="0.05" value="${cfg.lh}" placeholder="automático">
        </label>
      </div>

      <div class="cp-foot">
        <button type="button" class="btn ghost" id="cp-reset">↺ Restaurar este campo</button>
        <button type="button" class="btn ghost" id="cp-reset-all">↺ Restaurar todos os campos</button>
      </div>
      <div class="cp-chips" id="cp-chips"></div>`;

    const q = s => host.querySelector(s);

    // Grava a alteração e avisa o app.
    function set(prop, value) {
      const atual = Object.assign(defCfg(), fmt.partes[selecionado] || {});
      atual[prop] = value;
      if (isCustom(atual)) fmt.partes[selecionado] = atual;
      else delete fmt.partes[selecionado];
      onChange && onChange(selecionado);
      buildControls(host, fmt, onChange, opts);   // repinta (chips, marcas •)
    }

    q("#cp-alvo").addEventListener("change", e => {
      selecionado = e.target.value;
      buildControls(host, fmt, onChange, opts);
    });

    const pick = q("#cp-pick");
    if (pick) pick.addEventListener("click", () => { opts.onPick && opts.onPick(); });

    q("#cp-font").addEventListener("change", e => set("font", e.target.value));
    q("#cp-size").addEventListener("change", e => set("size", e.target.value === "" ? "" : parseFloat(e.target.value)));
    q("#cp-ls").addEventListener("change", e => set("ls", e.target.value === "" ? "" : parseFloat(e.target.value)));
    q("#cp-lh").addEventListener("change", e => set("lh", e.target.value === "" ? "" : parseFloat(e.target.value)));

    host.querySelectorAll("[data-tri]").forEach(b => b.addEventListener("click", () => {
      const prop = b.dataset.tri === "N" ? "bold" : "italic";
      const atual = Object.assign(defCfg(), fmt.partes[selecionado] || {})[prop];
      set(prop, atual == null ? true : atual === true ? false : null);
    }));
    host.querySelectorAll("[data-bool]").forEach(b => b.addEventListener("click", () => {
      const prop = b.dataset.bool;
      const atual = Object.assign(defCfg(), fmt.partes[selecionado] || {})[prop];
      set(prop, !atual);
    }));
    host.querySelectorAll("[data-al]").forEach(b => b.addEventListener("click", () => {
      const atual = Object.assign(defCfg(), fmt.partes[selecionado] || {}).align;
      set("align", atual === b.dataset.al ? "" : b.dataset.al);
    }));

    q("#cp-color").addEventListener("change", e => set("color", e.target.value));
    q("#cp-color-clr").addEventListener("click", () => set("color", ""));

    q("#cp-reset").addEventListener("click", () => {
      delete fmt.partes[selecionado];
      onChange && onChange(selecionado);
      buildControls(host, fmt, onChange, opts);
    });
    q("#cp-reset-all").addEventListener("click", () => {
      if (!Object.keys(fmt.partes).length) return;
      if (!confirm("Restaurar a formatação padrão de TODOS os campos desta receita?")) return;
      fmt.partes = {};
      onChange && onChange(null);
      buildControls(host, fmt, onChange, opts);
    });

    // Atalhos para os campos já personalizados.
    const chips = q("#cp-chips");
    const usados = PARTES.filter(p => isCustom(fmt.partes[p.id]));
    chips.innerHTML = usados.length
      ? '<span class="cp-lab">Personalizados:</span> ' + usados.map(p =>
          '<button type="button" class="cp-chip' + (p.id === selecionado ? " sel" : "") +
          '" data-chip="' + p.id + '">' + esc(p.label) + "</button>").join("")
      : '<span class="cp-lab">Nenhum campo personalizado ainda.</span>';
    chips.querySelectorAll("[data-chip]").forEach(b => b.addEventListener("click", () => {
      selecionado = b.dataset.chip;
      buildControls(host, fmt, onChange, opts);
    }));
  }

  global.Campos = {
    lista: PARTES, byId, defCfg, isCustom,
    applyTo, partAt, buildControls, select, selected,
  };
})(window);
