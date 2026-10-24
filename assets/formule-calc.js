// =====================================================================
// Tính nhóm món và combo — MỘT bản duy nhất, dùng cho cả trình duyệt
// (window.XIU_CALC) và máy chủ (worker/index.js import tệp này).
// =====================================================================
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.XIU_CALC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function has(a, x) { return (a || []).indexOf(x) >= 0; }

  // nhóm của một món: ưu tiên danh sách items, rồi đến danh mục (trừ exclude)
  function groupOf(cfg, id, cat) {
    var gs = (cfg && cfg.groups) || [];
    for (var i = 0; i < gs.length; i++) if (has(gs[i].items, id)) return gs[i].key;
    for (var j = 0; j < gs.length; j++) if (has(gs[j].cats, cat) && !has(gs[j].exclude, id)) return gs[j].key;
    return 'autre';
  }
  function groupOrder(cfg) {
    return ((cfg && cfg.groups) || []).map(function (g) { return g.key; }).concat(['autre']);
  }

  // items  : [{id, qty, cents, cat}]  (cents = giá thường của 1 phần)
  // decline: {formuleId: số nước tự thêm mà khách bỏ}
  // auto   : {id, cents, cat} món nước tự thêm (có thể null)
  // Trả về: lines [{id, qty, cents, base, group, fid, auto, max}], total, formulas, upsell
  function compute(cfg, items, decline, auto) {
    cfg = cfg || {};
    decline = decline || {};
    var G = {};
    items.forEach(function (it) { it.group = groupOf(cfg, it.id, it.cat); G[it.group] = (G[it.group] || 0) + it.qty; });

    // 1) số combo: mỗi combo = 1 khai vị + 1 món chính; khai vị dùng lần lượt theo thứ tự combo
    var used = {}, slots = [], formulas = [], upsell = false;
    (cfg.formules || []).forEach(function (f) {
      var s = (G[f.starter] || 0) - (used[f.starter] || 0), m = G[f.main] || 0;
      var n = Math.max(0, Math.min(s, m));
      used[f.starter] = (used[f.starter] || 0) + n;
      if (m > n) upsell = true;
      formulas.push({ id: f.id, n: n });
      for (var k = 0; k < n; k++) slots.push({ fid: f.id, cents: Math.max(0, f.drink_cents | 0), taken: false });
    });

    // 2) nước khách đã chọn (soda, trà, cà phê): giảm giá, ưu tiên nước đắt nhất cho suất tặng
    var units = [];
    items.forEach(function (it) { if (has(cfg.drinks, it.id)) for (var k = 0; k < it.qty; k++) units.push(it); });
    units.sort(function (a, b) { return b.cents - a.cents || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
    var assigned = {};
    units.forEach(function (u) {
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (!s.taken && s.cents < u.cents) { s.taken = true; var key = u.id + '|' + s.fid; assigned[key] = (assigned[key] || 0) + 1; return; }
      }
    });

    // 3) các dòng
    var lines = [];
    items.forEach(function (it) {
      var rest = it.qty;
      (cfg.formules || []).forEach(function (f) {
        var c = assigned[it.id + '|' + f.id] || 0;
        if (c) { lines.push({ id: it.id, qty: c, cents: Math.max(0, f.drink_cents | 0), base: it.cents, group: it.group, fid: f.id }); rest -= c; }
      });
      if (rest > 0) lines.push({ id: it.id, qty: rest, cents: it.cents, base: it.cents, group: it.group, fid: null });
    });

    // 4) combo còn thiếu nước → tự thêm (khách có thể bỏ)
    if (auto && auto.id) {
      var autoGroup = groupOf(cfg, auto.id, auto.cat);
      (cfg.formules || []).forEach(function (f) {
        if (f.auto === false) return;
        var left = slots.filter(function (s) { return !s.taken && s.fid === f.id; }).length;
        if (!left) return;
        var d = Math.min(left, Math.max(0, decline[f.id] | 0)), q = left - d;
        lines.push({ id: auto.id, qty: q, cents: Math.max(0, f.drink_cents | 0), base: auto.cents || 0, group: autoGroup, fid: f.id, auto: true, max: left });
      });
    }

    var order = groupOrder(cfg);
    lines.forEach(function (l, i) { l._i = i; });
    lines.sort(function (a, b) { return order.indexOf(a.group) - order.indexOf(b.group) || a._i - b._i; });
    lines.forEach(function (l) { delete l._i; });
    var total = 0;
    lines.forEach(function (l) { total += l.qty * l.cents; });
    return { lines: lines, total: total, formulas: formulas, upsell: upsell };
  }

  return { groupOf: groupOf, groupOrder: groupOrder, compute: compute };
});
