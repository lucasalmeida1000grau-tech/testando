var timerAcomp = null;

function etapasDo(tipo) {
  return tipo === "entrega"
    ? ["novo", "preparando", "pronto", "saiu_entrega", "entregue"]
    : ["novo", "preparando", "pronto", "entregue"];
}

function nomeEtapa(e, tipo) {
  var n = {
    novo: "Pedido recebido",
    preparando: "Em preparo",
    pronto: tipo === "entrega" ? "Pronto" : "Pronto para retirar",
    saiu_entrega: "Saiu para entrega",
    entregue: tipo === "entrega" ? "Entregue" : "Retirado"
  };
  return n[e];
}

async function consultarPedido() {
  var box = el("resultadoAcomp");
  var codigo = el("aCodigo").value.trim();
  var tel = el("aTelefone").value.trim();
  if (!codigo || !tel) { box.textContent = "Preencha o código e o telefone."; return; }

  var r = await db.rpc("consultar_pedido", { p_codigo: codigo, p_telefone: tel });
  box.innerHTML = "";
  if (r.error) { box.textContent = "Erro: " + r.error.message; return; }
  var p = r.data;
  if (!p) { box.textContent = "Pedido não encontrado. Confira o código e o telefone."; return; }

  var topo = document.createElement("p");
  topo.className = "cod";
  topo.textContent = "Total: " + dinheiro(p.total);
  box.appendChild(topo);

  var pago = document.createElement("span");
  pago.className = "selo-pago " + (p.pago ? "sim" : "nao");
  pago.textContent = p.pago ? "Pagamento confirmado" : "Aguardando pagamento";
  box.appendChild(pago);

  if (p.status === "cancelado") {
    var c = document.createElement("p");
    c.textContent = "Este pedido foi cancelado. Fale com a loja se precisar.";
    box.appendChild(c);
    return;
  }

  var etapas = etapasDo(p.tipo);
  var atual = etapas.indexOf(p.status);
  var ul = document.createElement("ul");
  ul.className = "passos";
  etapas.forEach(function (e, i) {
    var li = document.createElement("li");
    li.className = i < atual ? "feito" : (i === atual ? "feito agora" : "");
    var b = document.createElement("i");
    b.textContent = i <= atual ? "✓" : String(i + 1);
    var t = document.createElement("span");
    t.textContent = nomeEtapa(e, p.tipo);
    li.appendChild(b); li.appendChild(t);
    ul.appendChild(li);
  });
  box.appendChild(ul);
}

function abrirAcomp(auto) {
  var salvo = ler("meuPedido");
  if (salvo) {
    if (!el("aCodigo").value) el("aCodigo").value = salvo.codigo;
    if (!el("aTelefone").value) el("aTelefone").value = salvo.telefone;
  }
  el("painelAcomp").classList.remove("escondido");
  clearInterval(timerAcomp);
  if (auto && salvo) {
    consultarPedido();
    timerAcomp = setInterval(consultarPedido, 15000);
  }
}

el("btnAcomp").onclick = function () { abrirAcomp(true); };
el("btnFecharAcomp").onclick = function () {
  el("painelAcomp").classList.add("escondido");
  clearInterval(timerAcomp);
};
el("btnConsultar").onclick = function () {
  consultarPedido().catch(function (e) { el("resultadoAcomp").textContent = "Erro: " + e.message; });
  clearInterval(timerAcomp);
  timerAcomp = setInterval(consultarPedido, 15000);
};
el("btnIrAcomp").onclick = function () {
  el("painelCarrinho").classList.add("escondido");
  abrirAcomp(true);
};
