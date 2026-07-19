/* ============================================================================
   export.js — Impressão e exportação em PDF (A4 retrato).
   Impressão usa a folha visível + CSS @media print.
   PDF usa html2canvas + jsPDF (carregados via CDN). Sem internet, cai na
   janela de impressão (o usuário escolhe "Salvar como PDF").
   ============================================================================ */
(function (global) {
  "use strict";

  function printSheet(a4El) {
    let root = document.getElementById("print-root");
    if (!root) { root = document.createElement("div"); root.id = "print-root"; document.body.appendChild(root); }
    root.innerHTML = "";
    root.appendChild(a4El.cloneNode(true));
    window.print();
    setTimeout(() => { root.innerHTML = ""; }, 400);
  }

  async function exportPdf(a4El, fileName) {
    const jsPDFCtor = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!global.html2canvas || !jsPDFCtor) {
      // Sem bibliotecas → imprime para "Salvar como PDF"
      printSheet(a4El);
      return false;
    }
    // Clona em tamanho A4 exato, fora da tela, sem escala de zoom
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-99999px;top:0;background:#fff;";
    const clone = a4El.cloneNode(true);
    clone.style.transform = "none";
    clone.style.boxShadow = "none";
    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      const canvas = await global.html2canvas(clone, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        windowWidth: clone.scrollWidth, windowHeight: clone.scrollHeight,
      });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDFCtor({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, H = 297;
      const imgH = Math.min(H, (canvas.height * W) / canvas.width);
      pdf.addImage(img, "JPEG", 0, 0, W, imgH);
      pdf.save(fileName || "receita.pdf");
      return true;
    } finally {
      document.body.removeChild(holder);
    }
  }

  global.Exporter = { printSheet, exportPdf };
})(window);
