/* ============================================================================
   stamp.js — Carimbo gerado automaticamente a partir de nome + CRM + UF.
   Mesma ideia do sistema original: o estilo é fixo por médico (determinístico),
   então o mesmo médico sai sempre com o mesmo carimbo.
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
  // medico_especialidade, medico_rqe, carimbo_modo, carimbo_url}
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
    if (!nome) {
      return sig + '<span class="stamp st-under"><span class="s1">&nbsp;</span>' +
             '<div class="s3">Carimbo do médico</div></span>';
    }
    const uf   = (dados.medico_uf || "").trim();
    const crm  = (dados.medico_crm || "").trim();
    const esp  = (dados.medico_especialidade || "").trim();
    const rqe  = (dados.medico_rqe || "").trim();

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
