var carrinho = [];

function el(id) { return document.getElementById(id); }

function adicionarAoCarrinho(s) {
  var existente = carrinho.find(function (i) { return i.id === s.id; });
  if (existente) {
    existente.quantidade++;
  } else {
    carrinho.push({ id: s.id, nome: s.nome, preco: Number(s.preco), quantidade: 1 });
  }
  renderCarrinho();
}

function mudarQtd(id, delta) {
  var item = carrinho.find(function (i) { return i.id === id; });
  if (!item) return;
  item.quantidade += delta;
  if (item.quantidade <= 0) {
    carrinho = carrinho.filter(function (i) { return i.id !== id; });
  }
  renderCarrinho();
}

function totalCarrinho() {
  return carrinho.reduce(function (t, i) { return t + i.preco * i.quantidade; }, 0);
}

function renderCarrinho() {
  var qtd = carrinho.reduce(function (t, i) { return t + i.quantidade; }, 0);
  el("contador").textContent = qtd;
  el("totalCarrinho").textContent = dinheiro(totalCarrinho());

  var box = el("itensCarrinho");
  box.innerHTML = "";
  if (carrinho.length === 0) {
    box.textContent = "Seu carrinho está vazio.";
    return;
  }

  carrinho.forEach(function (i) {
    var linha = document.createElement("div");
    linha.className = "linha-item";

    var nome = document.createElement("span");
    nome.textContent = i.nome + " (" + dinheiro(i.preco * i.quantidade) + ")";

    var ctl = document.createElement("span");
    ctl.className = "qtd";

    var menos = document.createElement("button");
    menos.textContent = "−";
    menos.onclick = function () { mudarQtd(i.id, -1); };

    var num = document.createElement("b");
    num.textContent = i.quantidade;

    var mais = document.createElement("button");
    mais.textContent = "+";
    mais.onclick = function () { mudarQtd(i.id, 1); };

    ctl.appendChild(menos);
    ctl.appendChild(num);
    ctl.appendChild(mais);
    linha.appendChild(nome);
    linha.appendChild(ctl);
    box.appendChild(linha);
  });
}

async function finalizar() {
  var msg = el("msgPedido");

  if (carrinho.length === 0) { msg.textContent = "O carrinho está vazio."; return; }
  if (el("cNome").value.trim().length < 2) { msg.textContent = "Informe o seu nome."; return; }

  msg.textContent = "Enviando pedido...";

  var r = await db.rpc("criar_pedido_online", {
    p_nome: el("cNome").value.trim(),
    p_telefone: el("cTelefone").value.trim(),
    p_pagamento: el("cPagamento").value,
    p_itens: carrinho.map(function (i) { return { id: i.id, quantidade: i.quantidade }; })
  });

  if (r.error) {
    msg.textContent = "Erro: " + r.error.message;
    return;
  }

  msg.textContent = "Pedido enviado! Número: " + String(r.data).slice(0, 8).toUpperCase();
  carrinho = [];
  renderCarrinho();
}

el("btnAbrir").onclick = function () { el("painelCarrinho").classList.remove("escondido"); };
el("btnFechar").onclick = function () { el("painelCarrinho").classList.add("escondido"); };
el("btnFinalizar").onclick = function () {
  finalizar().catch(function (e) { el("msgPedido").textContent = "Erro: " + e.message; });
};

renderCarrinho();
