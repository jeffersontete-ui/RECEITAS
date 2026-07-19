/* ============================================================================
   templates.js — Persistência local (localStorage):
     • modelos ocultos (excluir modelos que não serão usados)
     • formatação salva por modelo
     • receitas salvas como modelo (salvar como modelo)
   ============================================================================ */
(function (global) {
  "use strict";

  const K_HIDDEN = "rx_models_hidden";
  const K_FMT    = id => "rx_fmt:" + id;
  const K_TPL    = "rx_templates";

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (_) { return false; }
  }

  /* ── Modelos ocultos ─────────────────────────────────────────────────── */
  function hiddenIds()        { return read(K_HIDDEN, []); }
  function hideModel(id)      { const h = hiddenIds(); if (!h.includes(id)) h.push(id); write(K_HIDDEN, h); }
  function restoreModels()    { write(K_HIDDEN, []); }
  function isHidden(id)       { return hiddenIds().includes(id); }

  /* ── Formatação por modelo ───────────────────────────────────────────── */
  function saveFmt(id, fmt)   { write(K_FMT(id), fmt); }
  function loadFmt(id)        { return read(K_FMT(id), null); }

  /* ── Receitas salvas como modelo ─────────────────────────────────────── */
  function listTemplates()    { return read(K_TPL, []); }
  function saveTemplate(tpl) {
    const all = listTemplates();
    tpl.id = tpl.id || ("tpl_" + Date.now());
    tpl.createdAt = tpl.createdAt || new Date().toISOString();
    const i = all.findIndex(t => t.id === tpl.id);
    if (i >= 0) all[i] = tpl; else all.push(tpl);
    write(K_TPL, all);
    return tpl;
  }
  function deleteTemplate(id) { write(K_TPL, listTemplates().filter(t => t.id !== id)); }
  function getTemplate(id)    { return listTemplates().find(t => t.id === id) || null; }

  global.Store = {
    hiddenIds, hideModel, restoreModels, isHidden,
    saveFmt, loadFmt,
    listTemplates, saveTemplate, deleteTemplate, getTemplate,
  };
})(window);
