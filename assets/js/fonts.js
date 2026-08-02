/* ============================================================================
   fonts.js — Catálogo de fontes das receitas (cabeçalho e prescrição).
   Espelha a lista do sistema original (receita_fontes.php), incluindo as
   fontes do Google (carregadas sob demanda) e as cursivas para o nome do
   médico. Cada fonte tem: id, rótulo, font-family CSS e o slug do Google.
   ============================================================================ */
(function (global) {
  "use strict";

  const FONTS = [
    // ── Serifadas / sistema ────────────────────────────────────────────
    { id: "times",       label: "Times New Roman",      css: "'Times New Roman', Georgia, serif",        g: null },
    { id: "georgia",     label: "Georgia",              css: "Georgia, 'Times New Roman', serif",        g: null },
    { id: "garamond",    label: "EB Garamond",          css: "'EB Garamond', Georgia, serif",            g: "EB+Garamond" },
    { id: "palatino",    label: "Palatino",             css: "'Palatino Linotype', Georgia, serif",      g: null },
    { id: "merriweather",label: "Merriweather",         css: "'Merriweather', Georgia, serif",           g: "Merriweather" },
    { id: "playfair",    label: "Playfair Display",     css: "'Playfair Display', Georgia, serif",       g: "Playfair+Display:wght@400;700" },
    { id: "lora",        label: "Lora",                 css: "'Lora', Georgia, serif",                   g: "Lora:wght@400;500;700" },
    { id: "ptserif",     label: "PT Serif",             css: "'PT Serif', Georgia, serif",               g: "PT+Serif:wght@400;700" },
    { id: "sourceserif", label: "Source Serif 4",       css: "'Source Serif 4', Georgia, serif",         g: "Source+Serif+4:wght@400;600;700" },
    { id: "crimson",     label: "Crimson Text",         css: "'Crimson Text', Georgia, serif",           g: "Crimson+Text:wght@400;600;700" },
    { id: "libre",       label: "Libre Baskerville",    css: "'Libre Baskerville', Georgia, serif",      g: "Libre+Baskerville:wght@400;700" },
    { id: "cormorant",   label: "Cormorant Garamond",   css: "'Cormorant Garamond', Georgia, serif",     g: "Cormorant+Garamond:wght@400;600;700" },
    { id: "bitter",      label: "Bitter",               css: "'Bitter', Georgia, serif",                 g: "Bitter:wght@400;600;700" },
    { id: "slabega",     label: "Roboto Slab",          css: "'Roboto Slab', Georgia, serif",            g: "Roboto+Slab:wght@400;600;700" },
    // ── Sem serifa ─────────────────────────────────────────────────────
    { id: "arial",       label: "Arial",                css: "Arial, Helvetica, sans-serif",             g: null },
    { id: "segoe",       label: "Segoe UI",             css: "'Segoe UI', Roboto, Arial, sans-serif",    g: null },
    { id: "lato",        label: "Lato",                 css: "'Lato', Arial, sans-serif",                g: "Lato" },
    { id: "poppins",     label: "Poppins",              css: "'Poppins', Arial, sans-serif",             g: "Poppins" },
    { id: "raleway",     label: "Raleway",              css: "'Raleway', Arial, sans-serif",             g: "Raleway:wght@400;600;700" },
    { id: "roboto",      label: "Roboto",               css: "'Roboto', Arial, sans-serif",              g: "Roboto:wght@400;500;700" },
    { id: "opensans",    label: "Open Sans",            css: "'Open Sans', Arial, sans-serif",           g: "Open+Sans:wght@400;600;700" },
    { id: "montserrat",  label: "Montserrat",           css: "'Montserrat', Arial, sans-serif",          g: "Montserrat:wght@400;600;700" },
    { id: "notosans",    label: "Noto Sans",            css: "'Noto Sans', Arial, sans-serif",           g: "Noto+Sans:wght@400;600;700" },
    { id: "inter",       label: "Inter",                css: "'Inter', Arial, sans-serif",               g: "Inter:wght@400;600;700" },
    { id: "worksans",    label: "Work Sans",            css: "'Work Sans', Arial, sans-serif",           g: "Work+Sans:wght@400;600;700" },
    { id: "nunito",      label: "Nunito",               css: "'Nunito', Arial, sans-serif",              g: "Nunito:wght@400;600;700" },
    { id: "rubik",       label: "Rubik",                css: "'Rubik', Arial, sans-serif",               g: "Rubik:wght@400;500;700" },
    { id: "mulish",      label: "Mulish",               css: "'Mulish', Arial, sans-serif",              g: "Mulish:wght@400;600;700" },
    { id: "pt_sans",     label: "PT Sans",              css: "'PT Sans', Arial, sans-serif",             g: "PT+Sans:wght@400;700" },
    { id: "sourcesans",  label: "Source Sans 3",        css: "'Source Sans 3', Arial, sans-serif",       g: "Source+Sans+3:wght@400;600;700" },
    // ── Monoespaçadas ──────────────────────────────────────────────────
    { id: "courier",     label: "Courier New",          css: "'Courier New', monospace",                 g: null },
    { id: "robotomono",  label: "Roboto Mono",          css: "'Roboto Mono', monospace",                 g: "Roboto+Mono:wght@400;500;700" },
    { id: "jetbrains",   label: "JetBrains Mono",       css: "'JetBrains Mono', monospace",              g: "JetBrains+Mono:wght@400;600;700" },
    // ── Cursivas / decorativas (nome do médico) ────────────────────────
    { id: "greatvibes",  label: "Great Vibes (cursiva)",css: "'Great Vibes', cursive",                   g: "Great+Vibes" },
    { id: "dancing",     label: "Dancing Script (cursiva)", css: "'Dancing Script', cursive",            g: "Dancing+Script:wght@400;700" },
    { id: "pacifico",    label: "Pacifico (cursiva)",   css: "'Pacifico', cursive",                      g: "Pacifico" },
    { id: "cinzel",      label: "Cinzel Decorative",    css: "'Cinzel Decorative', Georgia, serif",      g: "Cinzel+Decorative:wght@400;700" },
    { id: "sacramento",  label: "Sacramento (cursiva)", css: "'Sacramento', cursive",                    g: "Sacramento" },
    { id: "allura",      label: "Allura (cursiva)",     css: "'Allura', cursive",                        g: "Allura" },
    { id: "satisfy",     label: "Satisfy (cursiva)",    css: "'Satisfy', cursive",                       g: "Satisfy" },
    { id: "parisienne",  label: "Parisienne (cursiva)", css: "'Parisienne', cursive",                    g: "Parisienne" },
    { id: "tangerine",   label: "Tangerine (cursiva)",  css: "'Tangerine', cursive",                     g: "Tangerine:wght@400;700" },
    { id: "alexbrush",   label: "Alex Brush (cursiva)", css: "'Alex Brush', cursive",                    g: "Alex+Brush" },
  ];

  const byId = id => FONTS.find(f => f.id === id) || FONTS[0];

  // Injeta um único <link> do Google Fonts com todas as famílias necessárias.
  function inject() {
    if (document.getElementById("rx-gfonts")) return;
    const slugs = FONTS.filter(f => f.g).map(f => f.g);
    if (!slugs.length) return;
    const link = document.createElement("link");
    link.id = "rx-gfonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + slugs.join("&family=") + "&display=swap";
    document.head.appendChild(link);
  }

  global.Fonts = {
    list: FONTS,
    byId,
    cssOf: id => byId(id).css,
    labelOf: id => byId(id).label,
    inject,
  };
})(window);
