// ===== DADOS PADRÃO DA LOJA (o dono pode mudar pelo site) =====
var LOJA = {
  nome: "Nome da Sorveteria",
  endereco: "Rua Exemplo, 123 - São Paulo/SP",
  horario: "Todos os dias, das 12h às 22h",
  whatsapp: "5511999999999",
  heroTopo: "Momentos doces, felicidade em cada bola",
  heroTitulo: "A vida é melhor com",
  heroDestaque: "sorvete",
  heroTexto: "Cremoso, saboroso e feito com ingredientes frescos. Escolha o seu e retire na loja.",
  heroFoto: "",
  promoAtiva: true,
  promoTopo: "Oferta especial",
  promoTitulo: "Compre 2 bolas, leve 3",
  promoFoto: "",
  pixChave: "",
  pixNome: "",
  pixCidade: "",
  taxaEntrega: 0,
  corPrincipal: "#d6336c"
};
// ==============================================================

var COLUNAS = "id,nome,descricao,preco,foto_url,categoria,destaque,disponivel";
var sabores = [];
var categoriaAtual = "Todos";
var jaVisto = {};
var DONO = false;

function erroNaTela(t) {
  var l = document.getElementById("lista");
  if (l) l.innerHTML = '<p class="aviso">Erro: ' + t + "</p>";
}

function txt(id, v) {
  var e = document.getElementById(id);
  if (e) e.textContent = v;
}

function preencherLoja() {
  aplicarCor(LOJA.corPrincipal);
  document.title = LOJA.nome;
  txt("lojaNome", LOJA.nome);
  txt("lojaEndereco", LOJA.endereco);
  txt("lojaHorario", LOJA.horario);
  txt("lojaRodape", "© " + new Date().getFullYear() + " " + LOJA.nome);
  txt("heroTopo", LOJA.heroTopo);
  txt("heroTexto", LOJA.heroTexto);

  var z = document.getElementById("lojaZap");
  if (z) z.href = "https://wa.me/" + LOJA.whatsapp;

  var h = document.getElementById("heroTitulo");
  if (h) {
    h.textContent = LOJA.heroTitulo + " ";
    var s = document.createElement("span");
    s.textContent = LOJA.heroDestaque;
    h.appendChild(s);
  }

  var f = document.querySelector(".palco .foto");
  if (f && LOJA.heroFoto) f.style.backgroundImage = 'url("' + LOJA.heroFoto + '")';

  var bp = document.getElementById("blocoPromo");
  if (bp) {
    if (LOJA.promoAtiva) bp.classList.remove("escondido");
    else bp.classList.add("escondido");
    txt("promoTopo", LOJA.promoTopo);
    txt("promoTitulo", LOJA.promoTitulo);
    var pi = document.getElementById("promoImg");
    if (pi && LOJA.promoFoto) { pi.src = LOJA.promoFoto; pi.style.display = ""; }
  }
}

var observador = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (e) {
    if (!e.isIntersecting) return;
    var id = e.target.dataset.id;
    if (jaVisto[id]) return;
    jaVisto[id] = true;
    db.from("visitas").insert({ sabor_id: id }).then(function () {});
  });
}, { threshold: 0.6 });

function criarCard(s) {
  var card = document.createElement("div");
  card.className = "card" + (s.disponivel ? "" : " esgotado") + (s.destaque && s.disponivel ? " destaque" : "");
  card.dataset.id = s.id;

  if (s.foto_url) {
    var img = document.createElement("img");
    img.src = s.foto_url;
    img.alt = s.nome;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    var sf = document.createElement("div");
    sf.className = "sem-foto";
    sf.textContent = s.nome.charAt(0).toUpperCase();
    card.appendChild(sf);
  }

  var box = document.createElement("div");
  box.className = "conteudo";
  var nome = document.createElement("h3");
  nome.textContent = s.nome;
  var desc = document.createElement("p");
  desc.textContent = s.descricao || "";
  box.appendChild(nome);
  box.appendChild(desc);

  var rot = document.createElement("span");
  rot.className = "rot";
  rot.textContent = "Tipo de pedido:";
  var chips = document.createElement("div");
  chips.className = "chips";
  [["retirada", "Retirar"], ["entrega", "Entrega"]].forEach(function (t) {
    var c = document.createElement("button");
    c.type = "button";
    c.className = "chip";
    c.dataset.tipo = t[0];
    c.textContent = t[1];
    c.onclick = function () { el("cTipo").value = t[0]; renderCarrinho(); };
    chips.appendChild(c);
  });
  box.appendChild(rot);
  box.appendChild(chips);

  var linha = document.createElement("div");
  linha.className = "linha";
  var preco = document.createElement("span");
  preco.className = "preco";
  preco.textContent = dinheiro(s.preco);
  linha.appendChild(preco);

  if (s.disponivel) {
    var passo = document.createElement("div");
    passo.className = "passo";
    var menos = document.createElement("button");
    menos.type = "button"; menos.textContent = "−"; menos.setAttribute("aria-label", "Remover");
    menos.onclick = function () { mudarQtd(s.id, -1); };
    var n = document.createElement("span");
    n.className = "n"; n.dataset.id = s.id; n.textContent = "0";
    var mais = document.createElement("button");
    mais.type = "button"; mais.textContent = "+"; mais.setAttribute("aria-label", "Adicionar");
    mais.onclick = function () { adicionarAoCarrinho(s); };
    passo.appendChild(menos); passo.appendChild(n); passo.appendChild(mais);
    linha.appendChild(passo);
  } else {
    var esg = document.createElement("span");
    esg.textContent = "Esgotado";
    linha.appendChild(esg);
  }
  box.appendChild(linha);
  card.appendChild(box);

  if (DONO) card.appendChild(barraCard(s));

  observador.observe(card);
  return card;
}

// mantém quantidades e tipo de pedido dos cards em sincronia com o carrinho
function atualizarQtds() {
  var tipo = el("cTipo").value;
  document.querySelectorAll(".passo .n").forEach(function (n) {
    var it = carrinho.find(function (i) { return String(i.id) === n.dataset.id; });
    n.textContent = it ? it.quantidade : 0;
  });
  document.querySelectorAll(".chip").forEach(function (c) {
    c.classList.toggle("on", c.dataset.tipo === tipo);
  });
}
var _renderCarrinho = renderCarrinho;
renderCarrinho = function () { _renderCarrinho(); atualizarQtds(); };
el("cTipo").onchange = renderCarrinho;

function montarCategorias() {
  var box = document.getElementById("categorias");
  if (!box) return;
  box.innerHTML = "";

  var nomes = ["Todos"];
  sabores.forEach(function (s) {
    if (s.categoria && nomes.indexOf(s.categoria) === -1) nomes.push(s.categoria);
  });
  if (nomes.length < 3) return;

  nomes.forEach(function (c) {
    var b = document.createElement("button");
    b.className = "cat" + (c === categoriaAtual ? " ativo" : "");

    var bola = document.createElement("div");
    bola.className = "bola";
    var ex = sabores.find(function (s) {
      return s.foto_url && (c === "Todos" || s.categoria === c);
    });
    if (ex) {
      var i = document.createElement("img");
      i.src = ex.foto_url;
      i.alt = "";
      bola.appendChild(i);
    } else {
      bola.textContent = c.charAt(0).toUpperCase();
    }

    var l = document.createElement("span");
    l.textContent = c;
    b.appendChild(bola);
    b.appendChild(l);
    b.onclick = function () {
      categoriaAtual = c;
      montarCategorias();
      mostrar();
    };
    box.appendChild(b);
  });
}

function mostrar() {
  var lista = document.getElementById("lista");
  if (!lista) return;
  var itens = sabores.filter(function (s) {
    return categoriaAtual === "Todos" || s.categoria === categoriaAtual;
  });
  lista.innerHTML = "";
  if (itens.length === 0) {
    lista.innerHTML = '<p class="aviso">Nenhum sabor cadastrado ainda.</p>';
    return;
  }
  itens.forEach(function (s) { lista.appendChild(criarCard(s)); });
  atualizarQtds();
}

async function carregar() {
  var c = await db.from("config_loja").select("dados").eq("id", 1).maybeSingle();
  if (c.data && c.data.dados) Object.assign(LOJA, c.data.dados);
  preencherLoja();

  var r = await db.from("sabores").select(COLUNAS)
    .order("destaque", { ascending: false }).order("nome");
  if (r.error) { erroNaTela(r.error.message); return; }
  sabores = r.data;
  montarCategorias();
  mostrar();
}

carregar().catch(function (e) { erroNaTela(e.message); });
