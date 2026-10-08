function $(id) { return document.getElementById(id); }

var filtro = "ativos";
var vistos = null;
var timer = null;
var audio = null;
var ATIVOS = ["novo", "preparando", "pronto", "saiu_entrega"];
var NOMES = { novo: "Novo", preparando: "Em preparo", pronto: "Pronto", saiu_entrega: "Saiu para entrega", entregue: "Finalizado", cancelado: "Cancelado" };
var PAGTO = { pix: "Pix", dinheiro: "Dinheiro", credito: "Cartão de crédito", debito: "Cartão de débito" };
var LIMITE = 30; // minutos; o dono ajusta no painel (aba Resumo)

function minutosDesde(p) { return Math.floor((Date.now() - new Date(p.criado_em).getTime()) / 60000); }
function atrasado(p) { return ATIVOS.indexOf(p.status) > -1 && minutosDesde(p) > LIMITE; }
function tempo(m) { return m < 60 ? m + " min" : Math.floor(m / 60) + "h" + (m % 60 < 10 ? "0" : "") + (m % 60); }

async function carregarLimite() {
  try {
    var c = await db.from("config_loja").select("dados").eq("id", 1).maybeSingle();
    var v = c.data && c.data.dados ? Number(c.data.dados.minutosAtraso) : 0;
    if (v > 0) LIMITE = v;
  } catch (e) {}
}

function proximo(p) {
  if (p.status === "novo") return "preparando";
  if (p.status === "preparando") return "pronto";
  if (p.status === "pronto") return p.tipo_entrega === "entrega" ? "saiu_entrega" : "entregue";
  if (p.status === "saiu_entrega") return "entregue";
  return null;
}
function rotulo(s, p) {
  var e = p.tipo_entrega === "entrega";
  return { preparando: "Começar preparo", pronto: "Marcar como pronto", saiu_entrega: "Saiu para entrega", entregue: e ? "Marcar como entregue" : "Marcar como retirado" }[s];
}

function bip() {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    var o = audio.createOscillator(), g = audio.createGain();
    o.connect(g); g.connect(audio.destination);
    o.frequency.value = 880; g.gain.value = 0.15;
    o.start(); o.stop(audio.currentTime + 0.3);
  } catch (e) {}
}

async function sessao() {
  var s = await db.auth.getSession();
  if (!s.data.session) return;
  var p = await db.from("perfis").select("nome,ativo").eq("id", s.data.session.user.id).maybeSingle();
  if (p.data && p.data.ativo) {
    $("telaLogin").classList.add("escondido");
    $("telaPedidos").classList.remove("escondido");
    $("btnSair").classList.remove("escondido");
    $("quem").textContent = p.data.nome;
    await carregarLimite();
    montarFiltros();
    carregar();
    timer = setInterval(carregar, 10000);
    return;
  }
  $("msgLogin").textContent = "Este usuário não tem permissão.";
  await db.auth.signOut();
}

async function entrar() {
  $("msgLogin").textContent = "Entrando...";
  var r = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("senha").value });
  if (r.error) { $("msgLogin").textContent = "Erro: " + r.error.message; return; }
  $("msgLogin").textContent = "";
  bip();
  sessao();
}

function montarFiltros() {
  var box = $("filtros");
  box.innerHTML = "";
  [["ativos", "Em andamento"], ["atrasados", "Atrasados"], ["finalizados", "Finalizados"], ["todos", "Todos"]].forEach(function (f) {
    var b = document.createElement("button");
    b.textContent = f[1];
    if (filtro === f[0]) b.className = "ativo";
    b.onclick = function () { filtro = f[0]; montarFiltros(); carregar(); };
    box.appendChild(b);
  });
}

function whats(t) {
  var d = String(t || "").replace(/\D/g, "");
  if (d.length <= 11) d = "55" + d;
  return "https://wa.me/" + d;
}

async function acao(p, status, pago) {
  var r = await db.rpc("atualizar_pedido", { p_id: p.id, p_status: status || null, p_pago: pago === undefined ? null : pago });
  if (r.error) { alert("Erro: " + r.error.message); return; }
  carregar();
}

function botao(txt, cls, fn) {
  var b = document.createElement("button");
  b.className = "botao " + (cls || "");
  b.textContent = txt;
  b.onclick = fn;
  return b;
}

function card(p) {
  var c = document.createElement("div");
  c.className = "ped" + (atrasado(p) ? " atrasado" : "");

  var topo = document.createElement("div");
  topo.className = "ped-topo";
  var cod = document.createElement("span");
  cod.className = "ped-cod";
  var hora = new Date(p.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  cod.textContent = "Pedido #" + p.codigo + " · " + hora;
  var st = document.createElement("span");
  st.className = "badge " + p.status;
  st.textContent = NOMES[p.status] || p.status;
  topo.appendChild(cod);
  var dir = document.createElement("span");
  dir.appendChild(st);
  if (atrasado(p)) {
    var at = document.createElement("span");
    at.className = "badge atrasado";
    at.textContent = "Atrasado há " + tempo(minutosDesde(p));
    dir.appendChild(document.createTextNode(" "));
    dir.appendChild(at);
  } else if (ATIVOS.indexOf(p.status) > -1) {
    var ha = document.createElement("span");
    ha.className = "ped-tempo";
    ha.textContent = "há " + tempo(minutosDesde(p));
    dir.appendChild(ha);
  }
  topo.appendChild(dir);
  c.appendChild(topo);

  var info = document.createElement("div");
  if (p.origem === "online") {
    var l1 = document.createElement("p");
    l1.textContent = (p.cliente_nome || "") + " · ";
    var a = document.createElement("a");
    a.href = whats(p.cliente_telefone); a.target = "_blank"; a.rel = "noopener";
    a.textContent = p.cliente_telefone || "";
    l1.appendChild(a);
    info.appendChild(l1);
    var l2 = document.createElement("p");
    l2.textContent = p.tipo_entrega === "entrega" ? "Entrega: " + (p.endereco || "") : "Retirada na loja";
    info.appendChild(l2);
    if (p.observacao) {
      var l3 = document.createElement("p");
      l3.textContent = "Obs: " + p.observacao;
      info.appendChild(l3);
    }
  } else {
    var lb = document.createElement("p");
    lb.textContent = "Venda no balcão";
    info.appendChild(lb);
  }
  c.appendChild(info);

  var ul = document.createElement("ul");
  (p.itens_pedido || []).forEach(function (i) {
    var li = document.createElement("li");
    li.textContent = i.quantidade + "x " + i.nome;
    ul.appendChild(li);
  });
  c.appendChild(ul);

  var fim = document.createElement("p");
  var tot = document.createElement("b");
  tot.textContent = dinheiro(p.total);
  fim.appendChild(tot);
  fim.appendChild(document.createTextNode(" · " + (PAGTO[p.forma_pagamento] || p.forma_pagamento || "") +
    (Number(p.taxa_entrega) > 0 ? " · inclui entrega " + dinheiro(p.taxa_entrega) : "") + " "));
  var pg = document.createElement("span");
  pg.className = "selo-pago " + (p.pago ? "sim" : "nao");
  pg.textContent = p.pago ? "Pago" : "Não pago";
  fim.appendChild(pg);
  c.appendChild(fim);

  if (p.origem === "online") {
    var ac = document.createElement("div");
    ac.className = "ped-acoes";
    var prox = proximo(p);
    if (prox) ac.appendChild(botao(rotulo(prox, p), "", function () { acao(p, prox); }));
    if (!p.pago && p.status !== "cancelado") ac.appendChild(botao("Confirmar pagamento", "contorno", function () { acao(p, null, true); }));
    if (ATIVOS.indexOf(p.status) > -1) ac.appendChild(botao("Cancelar", "cinza", function () {
      if (confirm("Cancelar este pedido?")) acao(p, "cancelado");
    }));
    c.appendChild(ac);
  }
  return c;
}

async function carregar() {
  var r = await db.from("pedidos")
    .select("*, itens_pedido(nome,quantidade)")
    .order("criado_em", { ascending: false }).limit(100);
  var lista = $("lista");
  if (r.error) { lista.textContent = "Erro: " + r.error.message; return; }

  var ids = {};
  var novoChegou = false;
  r.data.forEach(function (p) {
    ids[p.id] = true;
    if (vistos && !vistos[p.id] && p.origem === "online") novoChegou = true;
  });
  if (novoChegou) { bip(); document.title = "Novo pedido! - Pedidos"; }
  vistos = ids;

  var itens = r.data.filter(function (p) {
    if (filtro === "ativos") return ATIVOS.indexOf(p.status) > -1;
    if (filtro === "atrasados") return atrasado(p);
    if (filtro === "finalizados") return ATIVOS.indexOf(p.status) === -1;
    return true;
  });

  if (filtro === "ativos" || filtro === "atrasados") itens.reverse(); // mais antigo primeiro
  lista.innerHTML = "";
  if (itens.length === 0) {
    var v = document.createElement("p");
    v.className = "aviso";
    v.textContent = "Nenhum pedido aqui.";
    lista.appendChild(v);
    return;
  }
  itens.forEach(function (p) { lista.appendChild(card(p)); });
}

$("btnEntrar").onclick = function () {
  entrar().catch(function (e) { $("msgLogin").textContent = "Erro: " + e.message; });
};
$("btnSair").onclick = async function () { await db.auth.signOut(); location.reload(); };
sessao();
