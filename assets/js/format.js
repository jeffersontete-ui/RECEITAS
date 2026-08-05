/* ============================================================================
   format.js — Régua de formatação de cada modelo.
   Controla: fonte, tamanho, espaçamento, margens, ajuste AUTOMÁTICO da altura
   do carimbo e ajuste AUTOMÁTICO da posição da assinatura.
   Escreve tudo em variáveis CSS na folha .a4.
   ============================================================================ */
(function (global) {
  "use strict";

  // Catálogo de fontes vem de fonts.js (window.Fonts). Fallback mínimo caso
  // o script não tenha carregado.
  function fontCatalog() {
    return (global.Fonts && global.Fonts.list) || [
      { id: "times", label: "Times New Roman", css: "'Times New Roman', Georgia, serif" },
      { id: "arial", label: "Arial", css: "Arial, Helvetica, sans-serif" },
    ];
  }
  const TIMES_CSS = "'Times New Roman', Georgia, serif";

  function defaults() {
    return {
      fontFamily: TIMES_CSS,   // corpo / prescrição
      fontHead: TIMES_CSS,     // cabeçalho (nome do médico e títulos)
      fontSize: 12,          // pt
      lineHeight: 1.4,
      margins: { t: 14, r: 16, b: 14, l: 16 }, // mm
      autoStamp: true,
      stampHeight: 22,       // mm  (usado quando autoStamp = false)
      stampScale: 1.0,       //     (usado quando autoStamp = false)
      autoSignature: true,
      sigGap: 10,            // mm  (usado quando autoSignature = false)
      partes: {},            // formatação individual de cada campo (campos.js)
    };
  }

  // Escreve as variáveis na folha e resolve os automáticos.
  function apply(a4El, fmt, hasStamp) {
    const s = a4El.style;
    s.setProperty("--rx-font", fmt.fontFamily);
    s.setProperty("--rx-font-head", fmt.fontHead || fmt.fontFamily);
    s.setProperty("--rx-size", fmt.fontSize + "pt");
    s.setProperty("--rx-lh", fmt.lineHeight);
    s.setProperty("--rx-mt", fmt.margins.t + "mm");
    s.setProperty("--rx-mr", fmt.margins.r + "mm");
    s.setProperty("--rx-mb", fmt.margins.b + "mm");
    s.setProperty("--rx-ml", fmt.margins.l + "mm");

    // ── Ajuste automático da ALTURA DO CARIMBO ──────────────────────────
    // Proporcional ao tamanho da fonte, para as 3 linhas caberem sempre.
    if (fmt.autoStamp) {
      const h = hasStamp ? Math.round(fmt.fontSize * 1.7 + 4) : 12; // mm
      const scale = hasStamp ? Math.min(1.15, Math.max(0.85, fmt.fontSize / 12)) : 1;
      s.setProperty("--stamp-h", h + "mm");
      s.setProperty("--stamp-scale", scale.toFixed(2));
    } else {
      s.setProperty("--stamp-h", fmt.stampHeight + "mm");
      s.setProperty("--stamp-scale", fmt.stampScale.toFixed(2));
    }

    // ── Ajuste automático da POSIÇÃO DA ASSINATURA ──────────────────────
    // Auto: o rodapé é ancorado ao fim da folha pelo flexbox (respiro mínimo).
    // Manual: o usuário empurra o bloco com um respiro maior.
    s.setProperty("--sig-gap", (fmt.autoSignature ? 8 : fmt.sigGap) + "mm");

    // ── Formatação INDIVIDUAL de cada campo (campos.js) ─────────────────
    if (global.Campos) global.Campos.applyTo(a4El, fmt);
  }

  // Constrói os controles no drawer. onChange() é chamado a cada ajuste.
  function buildControls(host, fmt, onChange, opts) {
    const cat = fontCatalog();
    const optsFor = current => cat.map(f =>
      `<option value="${f.css}" ${f.css === current ? "selected" : ""}>${f.label}</option>`
    ).join("");

    host.innerHTML = `
      <h3>Formatação do modelo</h3>
      <div class="fmt-grid">
        <label class="field" style="margin:0">
          <span>Fonte do cabeçalho (nome do médico)</span>
          <select id="f-fonthead">${optsFor(fmt.fontHead || fmt.fontFamily)}</select>
        </label>
        <label class="field" style="margin:0">
          <span>Fonte da prescrição / corpo</span>
          <select id="f-font">${optsFor(fmt.fontFamily)}</select>
        </label>

        <div class="slider">
          <div class="slabel">Tamanho da fonte <b id="f-size-v">${fmt.fontSize}pt</b></div>
          <input type="range" id="f-size" min="8" max="16" step="0.5" value="${fmt.fontSize}">
        </div>

        <div class="slider">
          <div class="slabel">Espaçamento entre linhas <b id="f-lh-v">${fmt.lineHeight}</b></div>
          <input type="range" id="f-lh" min="1" max="2.2" step="0.05" value="${fmt.lineHeight}">
        </div>

        <div>
          <div class="slabel" style="font-size:12px;color:var(--muted);margin-bottom:5px">Margens (mm)</div>
          <div class="margins-grid">
            <label class="field" style="margin:0"><span>Superior</span><input type="number" id="m-t" min="0" max="40" value="${fmt.margins.t}"></label>
            <label class="field" style="margin:0"><span>Direita</span><input type="number" id="m-r" min="0" max="40" value="${fmt.margins.r}"></label>
            <label class="field" style="margin:0"><span>Inferior</span><input type="number" id="m-b" min="0" max="40" value="${fmt.margins.b}"></label>
            <label class="field" style="margin:0"><span>Esquerda</span><input type="number" id="m-l" min="0" max="40" value="${fmt.margins.l}"></label>
          </div>
        </div>

        <div>
          <label class="toggle" style="margin-bottom:8px">
            <input type="checkbox" id="f-autostamp" ${fmt.autoStamp ? "checked" : ""}>
            Ajustar altura do carimbo automaticamente
          </label>
          <div class="slider ${fmt.autoStamp ? "locked" : ""}" id="stamp-manual">
            <div class="slabel">Altura do carimbo <b id="f-sh-v">${fmt.stampHeight}mm</b></div>
            <input type="range" id="f-sh" min="10" max="40" step="1" value="${fmt.stampHeight}" ${fmt.autoStamp ? "disabled" : ""}>
            <div class="slabel" style="margin-top:8px">Escala do carimbo <b id="f-ss-v">${fmt.stampScale.toFixed(2)}×</b></div>
            <input type="range" id="f-ss" min="0.6" max="1.6" step="0.05" value="${fmt.stampScale}" ${fmt.autoStamp ? "disabled" : ""}>
          </div>
        </div>

        <div>
          <label class="toggle" style="margin-bottom:8px">
            <input type="checkbox" id="f-autosig" ${fmt.autoSignature ? "checked" : ""}>
            Posicionar assinatura automaticamente
          </label>
          <div class="slider ${fmt.autoSignature ? "locked" : ""}" id="sig-manual">
            <div class="slabel">Respiro acima da assinatura <b id="f-sg-v">${fmt.sigGap}mm</b></div>
            <input type="range" id="f-sg" min="0" max="60" step="1" value="${fmt.sigGap}" ${fmt.autoSignature ? "disabled" : ""}>
          </div>
        </div>
      </div>

      <div class="campos-box" id="campos-box"><!-- formatação campo a campo --></div>`;

    const $ = id => host.querySelector(id);

    $("#f-font").addEventListener("change", e => { fmt.fontFamily = e.target.value; onChange(); });
    $("#f-fonthead").addEventListener("change", e => { fmt.fontHead = e.target.value; onChange(); });

    $("#f-size").addEventListener("input", e => {
      fmt.fontSize = parseFloat(e.target.value); $("#f-size-v").textContent = fmt.fontSize + "pt"; onChange();
    });
    $("#f-lh").addEventListener("input", e => {
      fmt.lineHeight = parseFloat(e.target.value); $("#f-lh-v").textContent = fmt.lineHeight; onChange();
    });
    ["t", "r", "b", "l"].forEach(k => {
      $("#m-" + k).addEventListener("input", e => {
        fmt.margins[k] = parseInt(e.target.value || "0", 10); onChange();
      });
    });

    $("#f-autostamp").addEventListener("change", e => {
      fmt.autoStamp = e.target.checked;
      $("#stamp-manual").classList.toggle("locked", fmt.autoStamp);
      $("#f-sh").disabled = fmt.autoStamp; $("#f-ss").disabled = fmt.autoStamp;
      onChange();
    });
    $("#f-sh").addEventListener("input", e => {
      fmt.stampHeight = parseInt(e.target.value, 10); $("#f-sh-v").textContent = fmt.stampHeight + "mm"; onChange();
    });
    $("#f-ss").addEventListener("input", e => {
      fmt.stampScale = parseFloat(e.target.value); $("#f-ss-v").textContent = fmt.stampScale.toFixed(2) + "×"; onChange();
    });

    $("#f-autosig").addEventListener("change", e => {
      fmt.autoSignature = e.target.checked;
      $("#sig-manual").classList.toggle("locked", fmt.autoSignature);
      $("#f-sg").disabled = fmt.autoSignature;
      onChange();
    });
    $("#f-sg").addEventListener("input", e => {
      fmt.sigGap = parseInt(e.target.value, 10); $("#f-sg-v").textContent = fmt.sigGap + "mm"; onChange();
    });

    // Painel "Formatação de cada campo".
    if (global.Campos) {
      global.Campos.buildControls($("#campos-box"), fmt, () => onChange(), opts || {});
    }
  }

  global.FMT = { defaults, apply, buildControls };
})(window);
