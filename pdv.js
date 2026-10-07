function $(id) { return document.getElementById(id); }

window.onerror = function (msg) {
  var alvo = $("msgVenda") || $("msgLogin");
  if (alvo) alvo.textContent = "ERRO NO CÓDIGO: " + msg;
};

var produtos = [];
var venda = [];

async function verificarSessao() {
  var r = await db.auth.getSession();
  if (!r.data.session) return;

  var p = await db.from("perfis").select("nome,papel,ativo")
    .eq("id", r.data.session.user.id).single();

  if (p.data && p.data.ativo) {
    $("telaLogin").classList.add("escondido");
    $("telaPdv").classList.remove("escondido");
    $("btnSair").classList.remove("escondido");
    $("quemEsta").textContent = p.data.nome;
    await carregarProdutos();
    $("busca").focus();
    return;
  }
  $("msgLogin").textContent = "Usuário sem permissão de caixa.";
  await db.auth.signOut();
}

async function entrar() {
  $("msgLogin").textContent = "Entrando...";
  var r = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("senha").value
  });
  if (r.error) { $("msgLogin").textContent = "Erro: " + r.error.message; return; }
  $("msgLogin").textContent = "";
  verificarSessao();
}

async function carregarProdutos() {
  var r = await db.from("sabores").select("*").eq("disponivel", true).order("nome");
  if (r.error) { $("msgBusca").textContent = "Erro: " + r.error.message; return; }
  produtos = r.data;
  desenharGrade(produtos);
}

function desenharGrade(lista) {
  var g = $("grade");
  g.innerHTML = "";
  lista.forEach(function (p) {
    var b = document.createElement("button");
    b.className = "prod";
    var n = document.createElement("b");
    n.textContent = p.nome;
    var v = document.createElement("small");
    v.textContent = dinheiro(p.preco);
    b.appendChild(n);
    b.appendChild(v);
    b.onclick = function () { adicionar(p); $("busca").focus(); };
    g.appendChild(b);
  });
}

function adicionar(p) {
  var it = venda.find(function (i) { return i.id === p.id; });
  if (it) { it.quantidade++; }
  else { venda.push({ id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: 1 }); }
  desenharVenda();
}

function mudar(id, delta) {
  var it = venda.find(function (i) { return i.id === id; });
  if (!it) return;
  it.quantidade += delta;
  if (it.quantidade <= 0) venda = venda.filter(function (i) { return i.id !== id; });
  desenharVenda();
}

function total() {
  return venda.reduce(function (t, i) { return t + i.preco * i.quantidade; }, 0);
}

function desenharVenda() {
  var box = $("itensVenda");
  box.innerHTML = "";
  venda.forEach(function (i) {
    var l = document.createElement("div");
    l.className = "venda-linha";

    var t = document.createElement("span");
    t.textContent = i.quantidade + "x " + i.nome + " - " + dinheiro(i.preco * i.quantidade);

    var c = document.createElement("span");
    var m = document.createElement("button");
    m.textContent = "−";
    m.onclick = function () { mudar(i.id, -1); };
    var p = document.createElement("button");
    p.textContent = "+";
    p.onclick = function () { mudar(i.id, 1); };
    c.appendChild(m);
    c.appendChild(p);

    l.appendChild(t);
    l.appendChild(c);
    box.appendChild(l);
  });
  $("totalVenda").textContent = dinheiro(total());
  calcularTroco();
}

function calcularTroco() {
  var din = $("pagamento").value === "dinheiro";
  $("boxRecebido").classList.toggle("escondido", !din);
  if (!din) { $("troco").textContent = ""; return; }
  var rec = Number($("recebido").value || 0);
  var t = total();
  $("troco").textContent = rec >= t && t > 0 ? "Troco: " + dinheiro(rec - t) : "";
}

function buscar(texto) {
  texto = texto.trim().toLowerCase();
  if (!texto) { desenharGrade(produtos); return; }
  var achados = produtos.filter(function (p) {
    return p.nome.toLowerCase().indexOf(texto) > -1;
  });
  desenharGrade(achados);
}

function enter(texto) {
  texto = texto.trim();
  if (!texto) return;
  var porCodigo = produtos.find(function (p) { return p.codigo_barras === texto; });
  if (porCodigo) {
    adicionar(porCodigo);
    $("msgBusca").textContent = "Adicionado: " + porCodigo.nome;
    $("busca").value = "";
    desenharGrade(produtos);
    return;
  }
  var porNome = produtos.filter(function (p) {
    return p.nome.toLowerCase().indexOf(texto.toLowerCase()) > -1;
  });
  if (porNome.length === 1) {
    adicionar(porNome[0]);
    $("msgBusca").textContent = "Adicionado: " + porNome[0].nome;
    $("busca").value = "";
    desenharGrade(produtos);
  } else {
    $("msgBusca").textContent = porNome.length === 0
      ? "Produto não encontrado."
      : "Vários resultados: escolha na lista.";
  }
}

async function concluir() {
  var msg = $("msgVenda");
  if (venda.length === 0) { msg.textContent = "A venda está vazia."; return; }

  var din = $("pagamento").value === "dinheiro";
  var rec = Number($("recebido").value || 0);
  if (din && rec < total()) { msg.textContent = "Valor recebido menor que o total."; return; }

  msg.textContent = "Registrando...";
  var r = await db.rpc("criar_venda_loja", {
    p_pagamento: $("pagamento").value,
    p_recebido: din ? rec : null,
    p_itens: venda.map(function (i) { return { id: i.id, quantidade: i.quantidade }; })
  });
  if (r.error) { msg.textContent = "Erro: " + r.error.message; return; }

  var troco = din ? " | Troco: " + dinheiro(rec - r.data.total) : "";
  msg.textContent = "Venda concluída! Total: " + dinheiro(r.data.total) + troco;
  venda = [];
  $("recebido").value = "";
  desenharVenda();
  $("busca").focus();
}

$("btnEntrar").onclick = function () {
  entrar().catch(function (e) { $("msgLogin").textContent = "Erro: " + e.message; });
};
$("btnSair").onclick = async function () { await db.auth.signOut(); location.reload(); };
$("busca").oninput = function () { buscar(this.value); };
$("busca").onkeydown = function (e) { if (e.key === "Enter") enter(this.value); };
$("pagamento").onchange = calcularTroco;
$("recebido").oninput = calcularTroco;
$("btnConcluir").onclick = function () {
  concluir().catch(function (e) { $("msgVenda").textContent = "Erro: " + e.message; });
};
$("btnLimpar").onclick = function () { venda = []; desenharVenda(); $("msgVenda").textContent = ""; };

desenharVenda();
verificarSessao();
