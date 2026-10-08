var carrinho = [];

function el(id) { return document.getElementById(id); }
function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function ler(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

/* ---------- Pix (código copia e cola) ---------- */
function semAcento(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim();
}
function tlv(id, v) { var l = String(v.length); if (l.length < 2) l = "0" + l; return id + l + v; }
function crc16(s) {
  var c = 0xFFFF;
  for (var i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (var j = 0; j < 8; j++) { c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1); c &= 0xFFFF; }
  }
  var h = c.toString(16).toUpperCase();
  while (h.length < 4) h = "0" + h;
  return h;
}
function pixPayload(chave, nome, cidade, valor, txid) {
  var conta = tlv("00", "br.gov.bcb.pix") + tlv("01", chave);
  var p = tlv("00", "01") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986") +
    tlv("54", Number(valor).toFixed(2)) + tlv("58", "BR") +
    tlv("59", (semAcento(nome) || "LOJA").slice(0, 25)) +
    tlv("60", (semAcento(cidade) || "BRASIL").slice(0, 15)) +
    tlv("62", tlv("05", String(txid).slice(0, 25))) + "6304";
  return p + crc16(p);
}

/* ---------- Carrinho ---------- */
function adicionarAoCarrinho(s) {
  var ex = carrinho.find(function (i) { return i.id === s.id; });
  if (ex) ex.quantidade++;
  else carrinho.push({ id: s.id, nome: s.nome, preco: Number(s.preco), quantidade: 1 });
  renderCarrinho();
}

function mudarQtd(id, d) {
  var it = carrinho.find(function (i) { return i.id === id; });
  if (!it) return;
  it.quantidade += d;
  if (it.quantidade <= 0) carrinho = carrinho.filter(function (i) { return i.id !== id; });
  renderCarrinho();
}

function subtotal() {
  return carrinho.reduce(function (t, i) { return t + i.preco * i.quantidade; }, 0);
}
function taxa() {
  return el("cTipo").value === "entrega" ? Number(LOJA.taxaEntrega || 0) : 0;
}

function renderCarrinho() {
  el("contador").textContent = carrinho.reduce(function (t, i) { return t + i.quantidade; }, 0);
  var entrega = el("cTipo").value === "entrega";
  el("boxEndereco").classList.toggle("escondido", !entrega);
  el("linhaTaxa").classList.toggle("escondido", !entrega);
  el("subCarrinho").textContent = dinheiro(subtotal());
  el("taxaCarrinho").textContent = dinheiro(taxa());
  el("totalCarrinho").textContent = dinheiro(subtotal() + taxa());

  var box = el("itensCarrinho");
  box.innerHTML = "";
  if (carrinho.length === 0) { box.textContent = "Seu carrinho está vazio."; return; }

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
    ctl.appendChild(menos); ctl.appendChild(num); ctl.appendChild(mais);
    linha.appendChild(nome); linha.appendChild(ctl);
    box.appendChild(linha);
  });
}

function vista(qual) {
  el("vCarrinho").classList.toggle("escondido", qual !== "carrinho");
  el("vConfirma").classList.toggle("escondido", qual !== "confirma");
}

async function finalizar() {
  var msg = el("msgPedido");
  var tipo = el("cTipo").value;
  var tel = el("cTelefone").value.replace(/\D/g, "");

  if (carrinho.length === 0) { msg.textContent = "O carrinho está vazio."; return; }
  if (el("cNome").value.trim().length < 2) { msg.textContent = "Informe o seu nome."; return; }
  if (tel.length < 10) { msg.textContent = "Informe o telefone com DDD."; return; }
  if (tipo === "entrega" && el("cEndereco").value.trim().length < 8) {
    msg.textContent = "Informe o endereço de entrega."; return;
  }

  msg.textContent = "Enviando pedido...";
  var pagamento = el("cPagamento").value;

  var r = await db.rpc("criar_pedido_online", {
    p_nome: el("cNome").value.trim(),
    p_telefone: el("cTelefone").value.trim(),
    p_pagamento: pagamento,
    p_tipo: tipo,
    p_endereco: el("cEndereco").value.trim(),
    p_obs: el("cObs").value.trim(),
    p_itens: carrinho.map(function (i) { return { id: i.id, quantidade: i.quantidade }; })
  });
  if (r.error) { msg.textContent = "Erro: " + r.error.message; return; }

  var d = r.data;
  msg.textContent = "";
  el("confCodigo").textContent = d.codigo;
  el("confResumo").textContent = (tipo === "entrega" ? "Entrega" : "Retirada na loja") +
    " · Total " + dinheiro(d.total) + " · Pagamento: " + pagamento;

  var pix = el("boxPix");
  if (pagamento === "pix" && LOJA.pixChave) {
    el("pixChave").textContent = LOJA.pixChave;
    el("pixValor").textContent = dinheiro(d.total);
    el("pixCopia").value = pixPayload(LOJA.pixChave, LOJA.pixNome || LOJA.nome,
      LOJA.pixCidade || "BRASIL", d.total, d.codigo);
    pix.classList.remove("escondido");
  } else {
    pix.classList.add("escondido");
  }

  guardar("meuPedido", { codigo: d.codigo, telefone: el("cTelefone").value.trim() });
  carrinho = [];
  el("cObs").value = "";
  renderCarrinho();
  vista("confirma");
}

el("btnAbrir").onclick = function () { vista("carrinho"); el("painelCarrinho").classList.remove("escondido"); };
el("btnFechar").onclick = function () { el("painelCarrinho").classList.add("escondido"); };
el("cTipo").onchange = renderCarrinho;
el("btnFinalizar").onclick = function () {
  finalizar().catch(function (e) { el("msgPedido").textContent = "Erro: " + e.message; });
};
el("btnCopiar").onclick = function () {
  var t = el("pixCopia");
  t.select();
  if (navigator.clipboard) navigator.clipboard.writeText(t.value);
  else document.execCommand("copy");
  el("btnCopiar").textContent = "Código copiado!";
};

renderCarrinho();
