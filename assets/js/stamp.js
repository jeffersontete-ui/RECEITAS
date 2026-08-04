/* ============================================================================
   stamp.js — Carimbo do médico.

   Três modos:
     • "auto"    → gerado a partir de nome + CRM + UF (estilo fixo por médico)
     • "imagem"  → imagem enviada ou URL da internet
     • "modelo"  → MODELO PRONTO escolhido na galeria (assets/js/carimbos.js),
                   com texto editável linha a linha
   ============================================================================ */
(function (global) {
  "use strict";

  const STYLES = ["st-box", "st-dbl", "st-under", "st-oval", "st-left", "st-plain"];

  function crc32(str) {
    let c, crc = 0xFFFFFFFF;
    for (let i = 0; i < str.length; i++) {
      c = (crc ^ str.charCodeAt(i)) & 0xFF;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, m => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
    ));
  }

  // Retorna o HTML do carimbo. dados: {medico_nome, medico_crm, medico_uf,
  // medico_especialidade, medico_rqe, carimbo_modo, carimbo_url,
  // carimbo_modelo, carimbo_texto, carimbo_icone, carimbo_escala}
  function buildStamp(dados) {
    const sig = dados.assinatura_url
      ? '<img class="sign-img" src="' + esc(dados.assinatura_url) + '" alt="Assinatura" crossorigin="anonymous">'
      : "";

    // ── Carimbo por imagem (URL da internet ou arquivo enviado) ─────────
    if (dados.carimbo_modo === "imagem" && dados.carimbo_url) {
      return sig + '<img class="stamp-img" src="' + esc(dados.carimbo_url) +
             '" alt="Carimbo do médico" crossorigin="anonymous">';
    }

    const nome = (dados.medico_nome || "").trim();
    const uf   = (dados.medico_uf || "").trim();
    const crm  = (dados.medico_crm || "").trim();
    const esp  = (dados.medico_especialidade || "").trim();
    const rqe  = (dados.medico_rqe || "").trim();

    // ── Carimbo por MODELO da galeria ───────────────────────────────────
    if (dados.carimbo_modo === "modelo" && global.Carimbos) {
      const t = dados.carimbo_texto || {};
      const regAuto = (crm || uf) ? ("CRM-" + uf + " " + crm).trim() : "";
      const linhas = {
        l1: (t.l1 || "").trim() || nome,
        l2: (t.l2 || "").trim() || esp,
        l3: (t.l3 || "").trim() || regAuto,
        l4: (t.l4 || "").trim() || (rqe ? "RQE Nº " + rqe : ""),
      };
      return sig + global.Carimbos.build(
        dados.carimbo_modelo, linhas, dados.carimbo_icone, dados.carimbo_escala || 1
      );
    }

    // ── Automático ──────────────────────────────────────────────────────
    if (!nome) {
      return sig + '<span class="stamp st-under"><span class="s1">&nbsp;</span>' +
             '<div class="s3">Carimbo do médico</div></span>';
    }

    let l2 = esp || "MÉDICO(A)";
    if (rqe) l2 += " — RQE Nº " + rqe;
    const l3 = "CRM-" + uf + " " + crm;

    const style = STYLES[crc32(nome + crm + uf) % STYLES.length];

    return (
      sig +
      '<span class="stamp ' + style + '">' +
        '<div class="s1">' + esc(nome.toUpperCase()) + "</div>" +
        '<div class="s2">' + esc(l2) + "</div>" +
        '<div class="s3">' + esc(l3) + "</div>" +
      "</span>"
    );
  }

  global.Stamp = { build: buildStamp };
})(window);
