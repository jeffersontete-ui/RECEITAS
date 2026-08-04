/* ============================================================================
   carimbos.js — Galeria de MODELOS DE CARIMBO prontos para escolher e editar.

   Cada modelo define: borda, posição do ícone e o estilo de cada linha
   (fonte, tamanho, peso, itálico, caixa alta). O texto é sempre editável —
   se o usuário deixar em branco, o app usa os dados do médico da receita.

   Exposto em: window.Carimbos
     .modelos            → lista de modelos
     .icones             → lista de ícones disponíveis
     .byId(id)           → modelo (ou o primeiro, se não achar)
     .injectFonts()      → carrega as fontes do Google usadas pelos modelos
     .build(id, linhas, iconeId, escala) → HTML do carimbo
   ============================================================================ */
(function (global) {
  "use strict";

  /* ── Fontes usadas pelos modelos ──────────────────────────────────────── */
  const F = {
    allura:     "'Allura', cursive",
    greatv:     "'Great Vibes', cursive",
    parisienne: "'Parisienne', cursive",
    sacramento: "'Sacramento', cursive",
    dancing:    "'Dancing Script', cursive",
    pacifico:   "'Pacifico', cursive",
    tangerine:  "'Tangerine', cursive",
    alexbrush:  "'Alex Brush', cursive",
    caveat:     "'Caveat', cursive",
    shadows:    "'Shadows Into Light', cursive",
    kalam:      "'Kalam', cursive",
    cinzel:     "'Cinzel', Georgia, serif",
    playfair:   "'Playfair Display', Georgia, serif",
    cormorant:  "'Cormorant Garamond', Georgia, serif",
    garamond:   "'EB Garamond', Georgia, serif",
    libre:      "'Libre Baskerville', Georgia, serif",
    times:      "'Times New Roman', Georgia, serif",
    monts:      "'Montserrat', Arial, sans-serif",
    roboto:     "'Roboto', Arial, sans-serif",
    lato:       "'Lato', Arial, sans-serif",
    opensans:   "'Open Sans', Arial, sans-serif",
    poppins:    "'Poppins', Arial, sans-serif",
    josefin:    "'Josefin Sans', Arial, sans-serif",
    arial:      "Arial, Helvetica, sans-serif",
  };

  const GOOGLE = [
    "Allura", "Great+Vibes", "Parisienne", "Sacramento",
    "Dancing+Script:wght@400;700", "Pacifico", "Tangerine:wght@400;700",
    "Alex+Brush", "Caveat:wght@400;700", "Shadows+Into+Light",
    "Kalam:wght@400;700", "Cinzel:wght@400;700",
    "Playfair+Display:ital,wght@0,400;0,700;1,400",
    "Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600",
    "EB+Garamond:ital,wght@0,400;0,600;1,400",
    "Libre+Baskerville:ital,wght@0,400;0,700;1,400",
    "Montserrat:wght@400;500;600;700", "Roboto:wght@400;500;700",
    "Lato:ital,wght@0,400;0,700;1,400", "Open+Sans:wght@400;600;700",
    "Poppins:wght@400;500;600", "Josefin+Sans:wght@400;600",
  ];

  function injectFonts() {
    if (document.getElementById("rx-carimbo-fonts")) return;
    const link = document.createElement("link");
    link.id = "rx-carimbo-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" +
                GOOGLE.join("&family=") + "&display=swap";
    document.head.appendChild(link);
  }

  /* ── Ícones (SVG originais, monocromáticos, herdam a cor do texto) ────── */
  const SVG = {
    nenhum: "",

    asclepio:
      '<svg viewBox="0 0 100 100"><rect x="46" y="8" width="8" height="84" rx="4"/>' +
      '<path d="M50 16c-14 0-16 12-4 16s14 12 0 16-16 12-4 16 14 10 4 14" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="60" cy="16" r="7"/></svg>',

    caduceu:
      '<svg viewBox="0 0 100 100"><rect x="46" y="14" width="8" height="78" rx="4"/>' +
      '<circle cx="50" cy="10" r="8"/>' +
      '<path d="M50 26c-14 0-16 10-4 14s14 10 0 14-16 10-4 14" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M50 30c14 0 16 10 4 14s-14 10 0 14 16 10 4 14" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M46 24C34 18 20 20 12 30c10 8 24 8 34 2zM54 24c12-6 26-4 34 6-10 8-24 8-34 2z"/></svg>',

    farmacia:
      '<svg viewBox="0 0 100 100"><path d="M18 40h64c0 24-12 34-22 38v6h14v8H26v-8h14v-6c-10-4-22-14-22-38z"/>' +
      '<path d="M50 40c-16 0-18-12-6-16s14-10 2-14" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
      '<circle cx="42" cy="10" r="6"/></svg>',

    patinha:
      '<svg viewBox="0 0 100 100"><ellipse cx="26" cy="34" rx="11" ry="14"/><ellipse cx="50" cy="24" rx="11" ry="14"/>' +
      '<ellipse cx="74" cy="34" rx="11" ry="14"/><ellipse cx="86" cy="58" rx="10" ry="12"/>' +
      '<path d="M50 46c16 0 28 12 28 24 0 12-12 16-28 16s-28-4-28-16c0-12 12-24 28-24z"/></svg>',

    patinha_cruz:
      '<svg viewBox="0 0 100 100"><ellipse cx="24" cy="32" rx="11" ry="14"/><ellipse cx="48" cy="22" rx="11" ry="14"/>' +
      '<ellipse cx="72" cy="32" rx="11" ry="14"/><ellipse cx="86" cy="56" rx="10" ry="12"/>' +
      '<path d="M48 44c17 0 29 13 29 25 0 12-12 17-29 17s-29-5-29-17c0-12 12-25 29-25z"/>' +
      '<path d="M44 56h9v9h9v9h-9v9h-9v-9h-9v-9h9z" fill="#fff"/></svg>',

    psi:
      '<svg viewBox="0 0 100 100"><text x="50" y="76" text-anchor="middle" font-size="82" ' +
      'font-family="Georgia, serif" font-weight="700">&#936;</text></svg>',

    lamparina:
      '<svg viewBox="0 0 100 100"><path d="M22 62c0-14 10-22 24-22h20c10 0 16 6 16 14 0 10-8 16-20 16H40c-10 0-18-2-18-8z"/>' +
      '<path d="M30 62l-8 20h44l-6-20z"/><path d="M62 40c0-8 4-12 10-14-2 8 2 10 8 12" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>' +
      '<rect x="18" y="80" width="56" height="8" rx="4"/></svg>',

    radioativo:
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="6"/>' +
      '<circle cx="50" cy="50" r="9"/>' +
      '<path d="M50 12a38 38 0 0 1 33 19l-20 12A15 15 0 0 0 50 35z"/>' +
      '<path d="M83 81a38 38 0 0 1-66 0l20-12a15 15 0 0 0 26 0z"/>' +
      '<path d="M17 31a38 38 0 0 1 0 0l20 12" fill="none"/>' +
      '<path d="M17 31l20 12A15 15 0 0 0 37 62L17 74A38 38 0 0 1 17 31z"/></svg>',

    microscopio:
      '<svg viewBox="0 0 100 100"><rect x="14" y="84" width="72" height="10" rx="5"/>' +
      '<path d="M40 78h40v8H40z"/><rect x="44" y="14" width="16" height="34" rx="6" transform="rotate(20 52 30)"/>' +
      '<path d="M40 46c-14 6-20 18-18 32h12c-2-12 2-20 12-24z"/><rect x="24" y="60" width="34" height="8" rx="4"/>' +
      '<circle cx="72" cy="30" r="8"/></svg>',

    coracao_ecg:
      '<svg viewBox="0 0 100 100"><path d="M50 88C22 68 8 54 8 36 8 22 19 12 32 12c8 0 15 4 18 10 3-6 10-10 18-10 13 0 24 10 24 24 0 18-14 32-42 52z"/>' +
      '<path d="M14 48h18l6-12 9 26 8-18 6 4h25" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>',

    estetoscopio:
      '<svg viewBox="0 0 100 100"><path d="M22 10v26c0 14 10 24 22 24s22-10 22-24V10" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="22" cy="8" r="7"/><circle cx="66" cy="8" r="7"/>' +
      '<path d="M44 60v10c0 12 10 20 22 20s22-8 22-20v-8" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>' +
      '<circle cx="88" cy="48" r="12"/></svg>',

    cruz:
      '<svg viewBox="0 0 100 100"><path d="M38 6h24v32h32v24H62v32H38V62H6V38h32z"/></svg>',

    dente:
      '<svg viewBox="0 0 100 100"><path d="M50 10c12 0 16-4 26-4 12 0 18 10 18 26 0 22-8 30-12 46-3 12-6 16-12 16s-8-8-10-22c-2-12-4-16-10-16s-8 4-10 16c-2 14-4 22-10 22s-9-4-12-16C14 62 6 54 6 32 6 16 12 6 24 6c10 0 14 4 26 4z"/></svg>',

    balanca:
      '<svg viewBox="0 0 100 100"><rect x="46" y="14" width="8" height="70" rx="4"/><rect x="24" y="84" width="52" height="9" rx="4"/>' +
      '<rect x="14" y="20" width="72" height="8" rx="4"/><circle cx="50" cy="14" r="8"/>' +
      '<path d="M18 28L6 56h36zM82 28L70 56h36z"/></svg>',

    livro:
      '<svg viewBox="0 0 100 100"><path d="M8 18c14-6 28-6 40 2v66c-12-8-26-8-40-2z"/>' +
      '<path d="M92 18c-14-6-28-6-40 2v66c12-8 26-8 40-2z"/></svg>',

    olho:
      '<svg viewBox="0 0 100 100"><path d="M50 22c26 0 44 20 46 28-2 8-20 28-46 28S6 58 4 50c2-8 20-28 46-28z" fill="none" stroke="currentColor" stroke-width="8"/>' +
      '<circle cx="50" cy="50" r="14"/></svg>',

    cerebro:
      '<svg viewBox="0 0 100 100"><path d="M50 12c-8-6-22-4-26 6-10 0-16 8-14 18-8 6-8 18 0 24-2 12 6 20 16 20 4 8 16 10 24 4z" />' +
      '<path d="M50 12c8-6 22-4 26 6 10 0 16 8 14 18 8 6 8 18 0 24 2 12-6 20-16 20-4 8-16 10-24 4z" fill="none" stroke="currentColor" stroke-width="7"/></svg>',

    dna:
      '<svg viewBox="0 0 100 100"><path d="M28 6c0 22 44 26 44 44S28 72 28 94M72 6c0 22-44 26-44 44s44 22 44 44" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M33 24h34M28 44h44M28 58h44M33 78h34" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>',

    telefone:
      '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="7"/>' +
      '<path d="M34 26c4 0 6 2 8 8s4 8 0 12c-3 3-3 5 0 10s10 12 15 15 7 3 10 0c4-4 6-2 12 0s8 4 8 8-4 10-12 10c-14 0-28-10-36-18S24 50 24 36c0-8 6-10 10-10z"/></svg>',

    calendario:
      '<svg viewBox="0 0 100 100"><rect x="8" y="18" width="84" height="76" rx="8" fill="none" stroke="currentColor" stroke-width="8"/>' +
      '<rect x="8" y="18" width="84" height="20" rx="8"/><rect x="24" y="6" width="10" height="20" rx="5"/><rect x="66" y="6" width="10" height="20" rx="5"/>' +
      '<rect x="22" y="50" width="14" height="12" rx="3"/><rect x="44" y="50" width="14" height="12" rx="3"/><rect x="66" y="50" width="14" height="12" rx="3"/>' +
      '<rect x="22" y="70" width="14" height="12" rx="3"/><rect x="44" y="70" width="14" height="12" rx="3"/></svg>',

    engrenagem:
      '<svg viewBox="0 0 100 100"><path d="M43 4h14l3 13 11 5 12-7 10 10-7 12 5 11 13 3v14l-13 3-5 11 7 12-10 10-12-7-11 5-3 13H43l-3-13-11-5-12 7-10-10 7-12-5-11L-3 57V43l13-3 5-11-7-12L18 7l12 7 11-5z" transform="translate(4)"/>' +
      '<circle cx="50" cy="50" r="15" fill="#fff"/></svg>',

    folha:
      '<svg viewBox="0 0 100 100"><path d="M88 10C50 10 20 26 14 56c-3 14 2 26 10 34 4-24 16-42 40-56-18 14-28 32-32 52 26 4 46-8 54-30 6-16 4-34 2-46z"/></svg>',
  };

  const ICONES = [
    { id: "nenhum",      label: "Sem ícone" },
    { id: "asclepio",    label: "Bastão de Asclépio" },
    { id: "caduceu",     label: "Caduceu" },
    { id: "farmacia",    label: "Farmácia (taça de Higeia)" },
    { id: "patinha",     label: "Patinha" },
    { id: "patinha_cruz",label: "Patinha com cruz" },
    { id: "psi",         label: "Psi (psicologia)" },
    { id: "lamparina",   label: "Lamparina (enfermagem)" },
    { id: "radioativo",  label: "Radioatividade" },
    { id: "microscopio", label: "Microscópio" },
    { id: "coracao_ecg", label: "Coração com ECG" },
    { id: "estetoscopio",label: "Estetoscópio" },
    { id: "cruz",        label: "Cruz médica" },
    { id: "dente",       label: "Dente (odontologia)" },
    { id: "balanca",     label: "Balança (direito)" },
    { id: "livro",       label: "Livro" },
    { id: "olho",        label: "Olho (oftalmologia)" },
    { id: "cerebro",     label: "Cérebro" },
    { id: "dna",         label: "DNA" },
    { id: "telefone",    label: "Telefone / contato" },
    { id: "calendario",  label: "Calendário / data" },
    { id: "engrenagem",  label: "Engrenagem (engenharia)" },
    { id: "folha",       label: "Folha / natural" },
  ];

  /* ── Atalhos para montar as linhas ────────────────────────────────────── */
  // ff = fonte, s = tamanho (em), w = peso, i = itálico, c = CAIXA ALTA, ls = espaçamento
  const L = (ff, s, o) => Object.assign({ ff, s, w: 400, i: false, c: false, ls: 0 }, o || {});

  /* ── Catálogo de modelos ──────────────────────────────────────────────── */
  const MODELOS = [
    { id: "mod01", nome: "1 · Caduceu + cursiva leve", borda: "nenhuma", icone: "caduceu", ipos: "esq",
      l1: L(F.sacramento, 1.55), l2: L(F.arial, .80, { c: true }), l3: L(F.arial, .80) },

    { id: "mod02", nome: "2 · Cursiva clássica", borda: "nenhuma", icone: "nenhum",
      l1: L(F.parisienne, 1.55), l2: L(F.arial, .80, { c: true }), l3: L(F.arial, .80) },

    { id: "mod03", nome: "3 · Cursiva grande e fina", borda: "nenhuma", icone: "nenhum",
      l1: L(F.allura, 1.85), l2: L(F.opensans, .80, { c: true }), l3: L(F.opensans, .80) },

    { id: "mod04", nome: "4 · Patinha + serifa negrito", borda: "nenhuma", icone: "patinha_cruz", ipos: "esq",
      l1: L(F.playfair, 1.30, { w: 700, i: true }), l2: L(F.cormorant, .90, { c: true, i: true, w: 600 }),
      l3: L(F.cormorant, .88, { i: true }) },

    { id: "mod05", nome: "5 · Serifa negrito centralizado", borda: "nenhuma", icone: "nenhum",
      l1: L(F.playfair, 1.35, { w: 700, i: true }), l2: L(F.cormorant, .92, { c: true, i: true, w: 700 }),
      l3: L(F.cormorant, .88, { i: true }) },

    { id: "mod06", nome: "6 · Manuscrito + sans negrito", borda: "nenhuma", icone: "nenhum",
      l1: L(F.caveat, 1.60), l2: L(F.monts, .78, { c: true, w: 700 }), l3: L(F.monts, .78, { w: 700 }) },

    { id: "mod07", nome: "7 · Sans arredondado", borda: "nenhuma", icone: "nenhum",
      l1: L(F.josefin, 1.45, { w: 600 }), l2: L(F.josefin, .82, { c: true }), l3: L(F.josefin, .82) },

    { id: "mod08", nome: "8 · Script negrito", borda: "nenhuma", icone: "nenhum",
      l1: L(F.pacifico, 1.35), l2: L(F.lato, .84, { c: true }), l3: L(F.lato, .82) },

    { id: "mod09", nome: "9 · Manuscrito fino", borda: "nenhuma", icone: "nenhum",
      l1: L(F.shadows, 1.55), l2: L(F.monts, .80, { c: true, w: 700 }), l3: L(F.monts, .80, { w: 700 }) },

    { id: "mod10", nome: "10 · Coração ECG + serifa alta", borda: "nenhuma", icone: "coracao_ecg", ipos: "esq",
      l1: L(F.cinzel, 1.10, { ls: .5 }), l2: L(F.cormorant, .88, { c: true, ls: .5 }), l3: L(F.cormorant, .86) },

    { id: "mod11", nome: "11 · Caixa simples (sans)", borda: "caixa", icone: "nenhum",
      l1: L(F.arial, 1.02), l2: L(F.arial, .92), l3: L(F.arial, .92) },

    { id: "mod12", nome: "12 · Caixa + Asclépio (itálico)", borda: "caixa", icone: "asclepio", ipos: "esq",
      l1: L(F.times, 1.02, { i: true }), l2: L(F.times, .92, { i: true }), l3: L(F.times, .92, { i: true }) },

    { id: "mod13", nome: "13 · Caixa + Farmácia", borda: "caixa", icone: "farmacia", ipos: "esq",
      l1: L(F.times, 1.02, { i: true }), l2: L(F.times, .92, { i: true }), l3: L(F.times, .92, { i: true }) },

    { id: "mod14", nome: "14 · Caixa larga (sans)", borda: "caixa", icone: "nenhum",
      l1: L(F.opensans, 1.02), l2: L(F.opensans, .92), l3: L(F.opensans, .92) },

    { id: "mod15", nome: "15 · Caixa + Patinha", borda: "caixa", icone: "patinha", ipos: "esq",
      l1: L(F.garamond, 1.06, { i: true }), l2: L(F.garamond, .94, { i: true }), l3: L(F.garamond, .94, { i: true }) },

    { id: "mod16", nome: "16 · Caixa serifada itálica", borda: "caixa", icone: "nenhum",
      l1: L(F.garamond, 1.10, { i: true }), l2: L(F.garamond, .98, { i: true }), l3: L(F.garamond, .96, { i: true }) },

    { id: "mod17", nome: "17 · Caixa + Psi (psicologia)", borda: "caixa", icone: "psi", ipos: "esq",
      l1: L(F.lato, 1.05), l2: L(F.lato, .92), l3: L(F.lato, .92) },

    { id: "mod18", nome: "18 · Caixa + Lamparina", borda: "caixa", icone: "lamparina", ipos: "esq",
      l1: L(F.garamond, 1.08, { i: true }), l2: L(F.opensans, .90), l3: L(F.opensans, .90) },

    { id: "mod19", nome: "19 · Caixa + Radioatividade", borda: "caixa", icone: "radioativo", ipos: "esq",
      l1: L(F.times, 1.02, { i: true }), l2: L(F.opensans, .92), l3: L(F.opensans, .92) },

    { id: "mod20", nome: "20 · Caixa + Microscópio", borda: "caixa", icone: "microscopio", ipos: "esq",
      l1: L(F.opensans, 1.00), l2: L(F.opensans, .92), l3: L(F.opensans, .92) },

    { id: "mod21", nome: "21 · Caixa + Estetoscópio", borda: "caixa", icone: "estetoscopio", ipos: "esq",
      l1: L(F.playfair, 1.05, { i: true }), l2: L(F.opensans, .90), l3: L(F.opensans, .90) },

    { id: "mod22", nome: "22 · Caixa 4 linhas (registro duplo)", borda: "caixa", icone: "nenhum",
      l1: L(F.times, 1.00, { i: true }), l2: L(F.times, .90, { i: true }),
      l3: L(F.times, .90, { i: true }), l4: L(F.times, .90, { i: true }) },

    { id: "mod23", nome: "23 · Caixa + Telefone (contato)", borda: "caixa", icone: "telefone", ipos: "esq",
      l1: L(F.playfair, 1.25, { i: true }), l2: L(F.playfair, 1.00, { i: true }), l3: L(F.opensans, 1.00, { w: 600 }) },

    { id: "mod24", nome: "24 · Caixa dupla (destaque)", borda: "dupla", icone: "nenhum",
      l1: L(F.libre, 1.02, { w: 700 }), l2: L(F.libre, .86, { i: true }), l3: L(F.libre, .86) },

    { id: "mod25", nome: "25 · Linha inferior (discreto)", borda: "linha", icone: "nenhum",
      l1: L(F.monts, 1.05, { w: 600, ls: .4 }), l2: L(F.monts, .82), l3: L(F.monts, .82) },

    { id: "mod26", nome: "26 · Cantos arredondados", borda: "arred", icone: "cruz", ipos: "esq",
      l1: L(F.poppins, 1.05, { w: 600 }), l2: L(F.poppins, .84), l3: L(F.poppins, .84) },

    { id: "mod27", nome: "27 · Ícone em cima (empilhado)", borda: "nenhuma", icone: "asclepio", ipos: "cima",
      l1: L(F.cormorant, 1.30, { w: 600 }), l2: L(F.cormorant, .92, { c: true }), l3: L(F.cormorant, .90) },

    { id: "mod28", nome: "28 · Cursiva + linha (elegante)", borda: "linha", icone: "nenhum",
      l1: L(F.greatv, 1.75), l2: L(F.cormorant, .92, { c: true, ls: 1 }), l3: L(F.cormorant, .90) },
  ];

  const byId = id => MODELOS.find(m => m.id === id) || MODELOS[0];
  const iconeSvg = id => SVG[id] || "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, m => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
    ));
  }

  function estilo(d) {
    if (!d) return "";
    return "font-family:" + d.ff + ";font-size:" + d.s + "em;font-weight:" + d.w + ";" +
           "font-style:" + (d.i ? "italic" : "normal") + ";" +
           (d.c ? "text-transform:uppercase;" : "") +
           (d.ls ? "letter-spacing:" + d.ls + "px;" : "");
  }

  /* Monta o HTML do carimbo.
     linhas = { l1, l2, l3, l4 }  ·  iconeId sobrescreve o ícone do modelo
     escala = multiplicador de tamanho (1 = padrão)                        */
  function build(modeloId, linhas, iconeId, escala) {
    const m = byId(modeloId);
    const t = linhas || {};
    const ico = (iconeId === undefined || iconeId === null || iconeId === "") ? m.icone : iconeId;
    const svg = ico === "nenhum" ? "" : iconeSvg(ico);
    const ipos = m.ipos || "esq";

    let txt = "";
    if (t.l1) txt += '<div class="cx-l cx-l1" style="' + estilo(m.l1) + '">' + esc(t.l1) + "</div>";
    if (t.l2) txt += '<div class="cx-l cx-l2" style="' + estilo(m.l2) + '">' + esc(t.l2) + "</div>";
    if (t.l3) txt += '<div class="cx-l cx-l3" style="' + estilo(m.l3) + '">' + esc(t.l3) + "</div>";
    if (t.l4) txt += '<div class="cx-l cx-l4" style="' + estilo(m.l4 || m.l3) + '">' + esc(t.l4) + "</div>";
    if (!txt) txt = '<div class="cx-l cx-l1" style="' + estilo(m.l1) + '">Carimbo do médico</div>';

    const cls = ["cx", "cx-b-" + m.borda, svg ? "cx-i-" + ipos : "cx-i-sem"].join(" ");
    const sc = (escala && escala !== 1) ? ' style="font-size:' + escala + 'em"' : "";

    return '<span class="' + cls + '"' + sc + ">" +
             (svg ? '<span class="cx-ico">' + svg + "</span>" : "") +
             '<span class="cx-txt">' + txt + "</span>" +
           "</span>";
  }

  global.Carimbos = {
    modelos: MODELOS,
    icones: ICONES,
    byId,
    iconeSvg,
    injectFonts,
    build,
  };
})(window);
