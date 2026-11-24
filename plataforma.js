/* Plataforma de simuladores - Prof. João Victor Mariano de Almeida - @experimentajoao */
var P = (function () {
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function fmt(n, d) {
    if (d === undefined) d = 2;
    if (!isFinite(n)) return '—';
    return Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }
  function sci(n, d) {
    if (d === undefined) d = 2;
    if (n === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(n)));
    var m = n / Math.pow(10, e);
    if (Math.abs(m) >= 9.995) { m /= 10; e += 1; }
    if (e >= -2 && e <= 4) return fmt(n, d);
    return fmt(m, d) + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function slider(pai, rotulo, o, on) {
    var box = el('div', 'ctrl'), r = el('div', 'rot'), a = el('span', '', rotulo), b = el('span');
    r.appendChild(a); r.appendChild(b);
    var inp = el('input'); inp.type = 'range'; inp.min = o.min; inp.max = o.max; inp.step = o.step || 1; inp.value = o.value;
    box.appendChild(r); box.appendChild(inp); pai.appendChild(box);
    function txt() { var v = Number(inp.value); b.textContent = (o.fmt ? o.fmt(v) : fmt(v, 3)) + (o.unit ? ' ' + o.unit : ''); }
    inp.addEventListener('input', function () { txt(); if (on) on(Number(inp.value)); });
    txt();
    return { get: function () { return Number(inp.value); }, set: function (v) { inp.value = v; txt(); }, el: box };
  }
  function seg(pai, rotulo, opcoes, valor, on) {
    if (rotulo) pai.appendChild(el('div', 'segrot', rotulo));
    var box = el('div', 'seg'), atual = valor, bts = [];
    opcoes.forEach(function (op) {
      var bt = el('button', op[0] === valor ? 'on' : '', op[1]); bt.type = 'button';
      bt.onclick = function () { atual = op[0]; bts.forEach(function (x) { x.classList.toggle('on', x === bt); }); if (on) on(atual); };
      bts.push(bt); box.appendChild(bt);
    });
    pai.appendChild(box);
    return { get: function () { return atual; }, el: box };
  }
  function leituras(pai, defs) {
    var box = el('div', 'leit'), mapa = {};
    defs.forEach(function (d) {
      var c = el('div'); c.appendChild(el('small', '', d[1])); var b = el('b', '', '—'); c.appendChild(b);
      box.appendChild(c); mapa[d[0]] = b;
    });
    pai.appendChild(box);
    return { set: function (k, t) { mapa[k].textContent = t; } };
  }
  function formula(pai, html) { var f = el('div', 'formula'); f.innerHTML = html; pai.appendChild(f); return f; }
  function dica(pai, t) { var d = el('p', 'dica', t); pai.appendChild(d); return d; }
  /* Perguntas: o aluno marca tudo, confere no final; só vê as explicações quando acertar todas */
  function perguntas(pai, lista) {
    var box = el('div', 'card perg'); box.appendChild(el('h3', '', 'Perguntas rápidas'));
    box.appendChild(el('p', 'dica', 'Responda todas e depois toque em Conferir. Se errar alguma, volte ao simulador, teste de novo e corrija.'));
    var marc = [], blocos = [], fbs = [];
    lista.forEach(function (q, qi) {
      var d = el('div', 'q'); d.appendChild(el('p', '', (qi + 1) + '. ' + q.p));
      var fb = el('div', 'fb');
      q.a.forEach(function (alt, i) {
        var bt = el('button', '', alt); bt.type = 'button';
        bt.onclick = function () {
          if (box.classList.contains('feito')) return;
          d.querySelectorAll('button').forEach(function (x) { x.classList.remove('marcado'); });
          bt.classList.add('marcado'); marc[qi] = i; d.classList.remove('qerro');
          res.textContent = ''; atualiza();
        };
        d.appendChild(bt);
      });
      d.appendChild(fb); box.appendChild(d); blocos.push(d); fbs.push(fb);
    });
    var conf = el('button', 'bt', 'Conferir respostas'); conf.type = 'button';
    var res = el('div', 'resultado');
    box.appendChild(conf); box.appendChild(res);
    function atualiza() { var n = lista.filter(function (q, i) { return marc[i] !== undefined; }).length; conf.disabled = n < lista.length; conf.textContent = n < lista.length ? 'Conferir respostas (' + n + ' de ' + lista.length + ' marcadas)' : 'Conferir respostas'; }
    conf.onclick = function () {
      var erros = 0;
      lista.forEach(function (q, i) { var ok = marc[i] === q.c; blocos[i].classList.toggle('qerro', !ok); if (!ok) erros++; });
      if (erros) {
        res.className = 'resultado ruim';
        res.textContent = 'Você acertou ' + (lista.length - erros) + ' de ' + lista.length + '. As perguntas marcadas em vermelho estão erradas: volte ao simulador, teste e responda de novo.';
      } else {
        res.className = 'resultado bom';
        res.textContent = 'Parabéns! Todas certas. Veja as explicações abaixo de cada pergunta.';
        box.classList.add('feito'); conf.style.display = 'none';
        lista.forEach(function (q, i) { blocos[i].querySelectorAll('button')[q.c].classList.add('certo'); fbs[i].textContent = q.e; fbs[i].style.color = 'var(--ok)'; fbs[i].classList.add('mostra'); });
      }
    };
    atualiza();
    pai.appendChild(box);
  }
  /* Canvas com coordenadas lógicas fixas (L x A), ajustado à largura da tela */
  function tela(pai, L, A) {
    var cv = el('canvas', 'tela'); pai.appendChild(cv);
    var ctx = cv.getContext('2d');
    function ajusta() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = L * dpr; cv.height = A * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ajusta();
    cv.style.aspectRatio = L + ' / ' + A;
    function ponto(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * L / r.width, y: (ev.clientY - r.top) * A / r.height };
    }
    return { cv: cv, ctx: ctx, L: L, A: A, ponto: ponto };
  }
  function seta(ctx, x1, y1, x2, y2, cor, larg) {
    var ang = Math.atan2(y2 - y1, x2 - x1), t = 8 + (larg || 2) * 1.5;
    ctx.strokeStyle = ctx.fillStyle = cor; ctx.lineWidth = larg || 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (Math.hypot(x2 - x1, y2 - y1) < 3) return;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - t * Math.cos(ang - 0.4), y2 - t * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - t * Math.cos(ang + 0.4), y2 - t * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }
  function texto(ctx, t, x, y, o) {
    o = o || {};
    ctx.font = (o.peso || '600') + ' ' + (o.tam || 14) + 'px system-ui,-apple-system,Segoe UI,Roboto,Arial';
    ctx.fillStyle = o.cor || '#1c2333'; ctx.textAlign = o.al || 'center'; ctx.textBaseline = o.base || 'middle';
    ctx.fillText(t, x, y);
  }
  /* Monta a página: abas, uma seção por simulador, animação só do simulador aberto */
  var sims = [], ativo = null, quadros = {};
  function pagina(lista) {
    var abas = document.getElementById('abas'), main = document.getElementById('main');
    lista.forEach(function (s, i) {
      var bt = el('button', '', (i + 1) + '. ' + s.nome); bt.type = 'button';
      var sec = el('section', 'sim'); sec.id = s.id;
      sec.appendChild(el('h2', '', s.titulo || s.nome));
      if (s.intro) sec.appendChild(el('p', 'intro', s.intro));
      var g = el('div', 'grid'), esq = el('div'), dir = el('div');
      var c1 = el('div', 'card'), c2 = el('div', 'card');
      esq.appendChild(c1); dir.appendChild(c2); g.appendChild(esq); g.appendChild(dir); sec.appendChild(g);
      main.appendChild(sec);
      s._bt = bt; s._sec = sec; s._areas = { tela: c1, ctrl: c2, esq: esq, dir: dir };
      bt.onclick = function () { abrir(s.id); };
      abas.appendChild(bt); sims.push(s);
    });
    function topo() { var t = document.querySelector('.topo'); if (t) document.documentElement.style.setProperty('--topo', t.offsetHeight + 'px'); }
    topo(); window.addEventListener('resize', topo);
    var h = location.hash.replace('#', '');
    abrir(sims.some(function (s) { return s.id === h; }) ? h : sims[0].id);
    var ult = performance.now();
    function loop(t) {
      var dt = Math.min((t - ult) / 1000, 0.05); ult = t;
      if (ativo && quadros[ativo]) quadros[ativo](dt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  function abrir(id) {
    sims.forEach(function (s) {
      var on = s.id === id;
      s._bt.classList.toggle('on', on); s._sec.classList.toggle('on', on);
      if (on && !s._ok) { s._ok = true; var f = s.init(s._areas); if (f) quadros[s.id] = f; }
      if (on) s._bt.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    ativo = id;
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    window.scrollTo(0, 0);
  }
  return { fmt: fmt, sci: sci, el: el, slider: slider, seg: seg, leituras: leituras, formula: formula, dica: dica,
           perguntas: perguntas, tela: tela, seta: seta, texto: texto, pagina: pagina };
})();
