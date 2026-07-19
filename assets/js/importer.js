/* ============================================================================
   importer.js — Importar Receita.
   Aceita PDF, DOCX, JPG, PNG. Extrai texto (pdf.js / mammoth / OCR Tesseract)
   e reconhece automaticamente: paciente, medicamentos, posologia, médico, CRM
   e data. Devolve os campos para preencher o formulário.
   Bibliotecas carregadas via CDN no index.html (pdfjsLib, mammoth, Tesseract).
   ============================================================================ */
(function (global) {
  "use strict";

  function ext(name) { return (name.split(".").pop() || "").toLowerCase(); }

  async function readAsArrayBuffer(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("Falha ao ler o arquivo."));
      r.readAsArrayBuffer(file);
    });
  }
  async function readAsDataURL(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("Falha ao ler o arquivo."));
      r.readAsDataURL(file);
    });
  }

  /* ── PDF: texto embutido; se vier vazio (digitalizado), cai no OCR ─────── */
  async function extractPdf(file, prog) {
    if (!global.pdfjsLib) throw new Error("Biblioteca de PDF não carregou (verifique a internet).");
    const buf = await readAsArrayBuffer(file);
    const pdf = await global.pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      prog(10 + (p / pdf.numPages) * 30, `Lendo página ${p}/${pdf.numPages}…`);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      text += content.items.map(i => i.str).join(" ") + "\n";
    }
    if (text.replace(/\s/g, "").length > 40) return text;   // tem camada de texto

    // PDF digitalizado → renderiza e faz OCR
    prog(42, "PDF sem texto — aplicando OCR nas páginas…");
    let ocr = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      ocr += await ocrCanvas(canvas, prog, p, pdf.numPages) + "\n";
    }
    return ocr;
  }

  /* ── DOCX ─────────────────────────────────────────────────────────────── */
  async function extractDocx(file, prog) {
    if (!global.mammoth) throw new Error("Biblioteca de DOCX não carregou (verifique a internet).");
    prog(30, "Extraindo texto do DOCX…");
    const buf = await readAsArrayBuffer(file);
    const r = await global.mammoth.extractRawText({ arrayBuffer: buf });
    return r.value || "";
  }

  /* ── Imagem (JPG/PNG) via OCR ─────────────────────────────────────────── */
  async function extractImage(file, prog) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    return ocrCanvas(canvas, prog, 1, 1);
  }

  async function ocrCanvas(canvas, prog, p, total) {
    if (!global.Tesseract) throw new Error("Biblioteca de OCR não carregou (verifique a internet).");
    const { data } = await global.Tesseract.recognize(canvas, "por", {
      logger: m => {
        if (m.status === "recognizing text") {
          const base = 45 + ((p - 1) / total) * 45;
          prog(Math.min(92, base + m.progress * (45 / total)),
               `Reconhecendo texto (OCR) ${Math.round(m.progress * 100)}%…`);
        }
      },
    });
    return data.text || "";
  }

  /* ── Reconhecimento de campos ─────────────────────────────────────────── */
  function parseFields(text) {
    const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");
    const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
    const fields = { medico: "", crm: "", uf: "", data: "", paciente: "", itens: [], raw: text };

    // CRM + UF
    let m = clean.match(/CRM[\s\-\/]*([A-Z]{2})?[\s:\-\.\/]*(\d{3,7})/i);
    if (m) { fields.uf = (m[1] || "").toUpperCase(); fields.crm = m[2]; }
    // UF isolada perto de "CRM" quando não veio junto
    if (!fields.uf) {
      const mu = clean.match(/CRM[^A-Z]{0,6}([A-Z]{2})\b/i);
      if (mu) fields.uf = mu[1].toUpperCase();
    }

    // Data (dd/mm/aaaa e variações)
    let md = clean.match(/(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{2,4})/);
    if (md) {
      let [_, d, mo, y] = md; if (y.length === 2) y = "20" + y;
      fields.data = `${y}-${mo}-${d}`;
    }

    // Médico: linha com Dr./Dra. ou a linha imediatamente antes do CRM
    let dm = clean.match(/\bDr[a]?\.?\s+([A-ZÀ-Ú][^\n,;]{3,60})/);
    if (dm) fields.medico = ("Dr. " + dm[1].trim()).replace(/\s{2,}/g, " ");
    if (!fields.medico) {
      const idx = lines.findIndex(l => /CRM/i.test(l));
      if (idx > 0) {
        const cand = lines[idx - 1];
        if (cand && cand.length >= 4 && cand.length <= 60 && !/receit|prescri|paciente/i.test(cand))
          fields.medico = cand;
      }
    }

    // Paciente
    let pm = clean.match(/paciente\s*[:\-]?\s*([^\n]{2,70})/i);
    if (pm) fields.paciente = pm[1].replace(/\b(end|endere|cpf|idade|data)\b.*$/i, "").trim();

    // Medicamentos + posologia
    fields.itens = extractItens(lines);

    return fields;
  }

  // Sinais FORTES de posologia (modo de uso) — não incluem "mg/ml/comprimido",
  // que também aparecem no nome do medicamento.
  const POS_STRONG = /(tomar|tome|aplicar|apliqu|usar|use|ingerir|via oral|sublingual|inalar|de\s*\d+\s*[\/x]\s*\d+|\d+\s*x\s*ao dia|ao dia|por dia|vezes ao dia|se dor|em caso de|antes de|ap[óo]s|ao deitar|[àa] noite|de manh[ãa]|gotas?)/i;
  const DATA_LINHA = /(^\s*\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}\s*$)|([A-Za-zÀ-ú].*,\s*\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})/;

  function extractItens(lines) {
    let start = lines.findIndex(l => /(prescri[çc][ãa]o|uso interno|uso externo|receit)/i.test(l));
    const body = start >= 0 ? lines.slice(start + 1) : lines;

    const itens = [];
    let atual = null;
    for (let raw of body) {
      // para ao chegar em rodapé, data ou local/data
      if (/(assinatura|carimbo|comprador|fornecedor|farmac[êe]utico|1ª via|2ª via|^data\b)/i.test(raw)) break;
      if (DATA_LINHA.test(raw)) break;

      const numbered = raw.match(/^\s*\d+\s*[\)\.\-]\s*(.+)$/);
      const line = numbered ? numbered[1].trim() : raw.trim();
      const isPos = POS_STRONG.test(line);

      if (numbered) {
        atual = splitMedPos(line); itens.push(atual);
      } else if (isPos && atual) {
        atual.posologia = (atual.posologia ? atual.posologia + " " : "") + line;
      } else if (!isPos && line.length > 3 && /[A-Za-zÀ-ú]/.test(line)) {
        atual = splitMedPos(line); itens.push(atual);
      } else if (atual) {
        atual.posologia = (atual.posologia ? atual.posologia + " " : "") + line;
      }
    }
    return itens.filter(i => i.nome).slice(0, 12);
  }

  // "Losartana 50mg ——— 2cx  tomar 1x ao dia" → {nome, quantidade, posologia}
  function splitMedPos(line) {
    let quantidade = "", work = line;
    const mq = line.match(/^(.*?)\s*[-–—]{2,}\s*(.+)$/); // separa quantidade após traços
    if (mq) { work = mq[1].trim(); quantidade = mq[2].trim(); }

    // se a "quantidade" na verdade for posologia, joga para posologia
    let posologia = "";
    if (quantidade && POS_STRONG.test(quantidade)) { posologia = quantidade; quantidade = ""; }

    const hint = work.search(POS_STRONG);
    if (hint > 6) {
      posologia = (work.slice(hint).trim() + (posologia ? " " + posologia : "")).trim();
      work = work.slice(0, hint);
    }
    return { nome: work.replace(/[-–—:]+$/, "").trim(), quantidade, posologia };
  }

  async function handleFile(file, prog) {
    prog(5, "Preparando…");
    const e = ext(file.name);
    let text = "";
    if (e === "pdf") text = await extractPdf(file, prog);
    else if (e === "docx") text = await extractDocx(file, prog);
    else if (["jpg", "jpeg", "png", "webp", "bmp"].includes(e)) text = await extractImage(file, prog);
    else throw new Error("Formato não suportado. Use PDF, DOCX, JPG ou PNG.");
    prog(95, "Reconhecendo campos…");
    const fields = parseFields(text);
    prog(100, "Concluído.");
    return fields;
  }

  global.Importer = { handleFile, parseFields };
})(window);
