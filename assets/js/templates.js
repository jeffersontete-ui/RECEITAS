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

  /* ── Histórico de receitas emitidas ──────────────────────────────────── */
  const K_HIST = "rx_history";
  function listHistory() { return read(K_HIST, []); }
  function addHistory(entry) {
    const all = listHistory();
    entry.id = "h_" + Date.now();
    entry.emittedAt = new Date().toISOString();
    all.unshift(entry);
    while (all.length > 100) all.pop();   // mantém no máximo 100
    write(K_HIST, all);
    return entry;
  }
  function getHistory(id)  { return listHistory().find(h => h.id === id) || null; }
  function deleteHistory(id) { write(K_HIST, listHistory().filter(h => h.id !== id)); }
  function clearHistory()  { write(K_HIST, []); }

  /* ── Numeração sequencial (por tipo de receita) ──────────────────────── */
  const K_SEQ = "rx_seq";
  function peekSeq(tipo) { const m = read(K_SEQ, {}); return (m[tipo] || 0) + 1; }
  function nextSeq(tipo) {
    const m = read(K_SEQ, {}); m[tipo] = (m[tipo] || 0) + 1; write(K_SEQ, m); return m[tipo];
  }

  /* ── Backup / restauração de TUDO (chaves rx_*) ──────────────────────── */
  function exportAll() {
    const dump = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("rx_") === 0) dump[k] = localStorage.getItem(k);
    }
    return { _app: "modulo-receitas", _version: 1, _exportedAt: new Date().toISOString(), data: dump };
  }
  function importAll(obj, replace) {
    if (!obj || !obj.data || typeof obj.data !== "object") throw new Error("Arquivo de backup inválido.");
    if (replace) {
      const del = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf("rx_") === 0) del.push(k); }
      del.forEach(k => localStorage.removeItem(k));
    }
    let n = 0;
    Object.keys(obj.data).forEach(k => { if (k.indexOf("rx_") === 0) { localStorage.setItem(k, obj.data[k]); n++; } });
    return n;
  }

  /* ── Edição livre na folha (overrides de HTML por modelo) ────────────── */
  const K_OVR = "rx_overrides";
  function allOverrides() { return read(K_OVR, {}); }
  function getOverride(modelId) { const m = allOverrides(); return m[modelId] || null; }
  function setOverride(modelId, html) { const m = allOverrides(); m[modelId] = html; write(K_OVR, m); }
  function clearOverride(modelId) { const m = allOverrides(); delete m[modelId]; write(K_OVR, m); }

  global.Store = {
    hiddenIds, hideModel, restoreModels, isHidden,
    saveFmt, loadFmt,
    listTemplates, saveTemplate, deleteTemplate, getTemplate,
    listHistory, addHistory, getHistory, deleteHistory, clearHistory,
    peekSeq, nextSeq,
    getOverride, setOverride, clearOverride, allOverrides,
    exportAll, importAll,
  };
})(window);
