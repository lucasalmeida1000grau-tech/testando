// ===== DADOS PADRÃO DA LOJA (o dono pode mudar pelo site) =====
var LOJA = {
  nome: "Nome da Sorveteria",
  endereco: "Rua Exemplo, 123 - São Paulo/SP",
  horario: "Todos os dias, das 12h às 22h",
  whatsapp: "5511999999999",
  heroTitulo: "Sabor que *Encanta*, Experiência que *Marca!*",
  heroDestaque: "",
  heroTexto: "Sorvetes e sobremesas feitas com carinho para momentos especiais.",
  heroBotao: "Saiba mais!",
  heroChamada: "Reserve sua mesa e *viva essa experiência!*",
  heroFoto: "",
  secTitulo: "A escolha está em *suas mãos!*",
  secTexto: "Aproveite os melhores sabores de sorvetes disponíveis pra você e sua família.",
  secBotao: "Saiba mais!",
  secFoto: "",
  tituloCardapio: "Nossos *sabores*",
  instagram: "/Sorveteriachemais",
  site: "www.sorveteriachegamais.com.br",
  promoAtiva: true,
  promoTopo: "Oferta especial",
  promoTitulo: "Compre 2 bolas, leve 3",
  promoFoto: "",
  pixChave: "",
  pixNome: "",
  pixCidade: "",
  taxaEntrega: 0,
  cor1: "#ff9f1c",
  cor2: "#e63946",
  corFundo: "#fdf1dc",
  corTexto: "#3b2417",
  corPrincipal: "#ff9f1c"
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

// *palavra* vira destaque colorido
function destacar(id, texto) {
  var e = document.getElementById(id);
  if (!e) return;
  e.textContent = "";
  String(texto || "").split("*").forEach(function (p, i) {
    if (!p) return;
    if (i % 2) { var sp = document.createElement("span"); sp.className = "dst"; sp.textContent = p; e.appendChild(sp); }
    else e.appendChild(document.createTextNode(p));
  });
}

function cor(v, padrao) { return corValida(v) ? v : padrao; }

// aplica as 4 cores do site (o dono escolhe no painel)
function aplicarCores(o) {
  var c1 = cor(o.cor1, "#ff9f1c"), c2 = cor(o.cor2, "#e63946");
  var st = document.documentElement.style;
  st.setProperty("--c1", c1);
  st.setProperty("--c2", c2);
  st.setProperty("--fundo", cor(o.corFundo, "#fdf1dc"));
  st.setProperty("--texto", cor(o.corTexto, "#3b2417"));
  st.setProperty("--sobre2", luminosidade(c2) > 0.2 ? "#2b1a12" : "#ffffff");
  aplicarCor(c1); // botões do carrinho e --sobre-cor
  try { localStorage.setItem("temaLoja", JSON.stringify({ cor1: c1, cor2: c2, corFundo: o.corFundo, corTexto: o.corTexto })); } catch (e) {}
}
try { aplicarCores(JSON.parse(localStorage.getItem("temaLoja")) || {}); } catch (e) {}

function foto(imgId, arteId, url) {
  var i = document.getElementById(imgId), a = document.getElementById(arteId);
  if (!i) return;
  if (url) { i.src = url; i.hidden = false; if (a) a.style.display = "none"; }
  else { i.hidden = true; if (a) a.style.display = ""; }
}

function preencherLoja() {
  aplicarCores(LOJA);
  LOJA.corPrincipal = cor(LOJA.cor1, "#ff9f1c");
  document.title = LOJA.nome;
  txt("lojaNome", LOJA.nome);
  txt("lojaEndereco", LOJA.endereco);
  txt("lojaHorario", LOJA.horario);
  txt("lojaRodape", "© " + new Date().getFullYear() + " " + LOJA.nome);
  txt("lojaInsta", LOJA.instagram);
  txt("lojaSite", LOJA.site);
  txt("heroTexto", LOJA.heroTexto);
  txt("heroBotao", LOJA.heroBotao);
  txt("secTexto", LOJA.secTexto);
  txt("secBotao", LOJA.secBotao);

  var z = document.getElementById("lojaZap");
  if (z) z.href = "https://wa.me/" + LOJA.whatsapp;

  var ht = String(LOJA.heroTitulo || "");
  if (LOJA.heroDestaque && ht.indexOf("*") === -1) ht += " *" + LOJA.heroDestaque + "*"; // sites antigos
  destacar("heroTitulo", ht);
  destacar("heroChamada", LOJA.heroChamada);
  destacar("secTitulo", LOJA.secTitulo);
  destacar("tituloCardapio", LOJA.tituloCardapio);
  foto("heroImg", "heroArte", LOJA.heroFoto);
  foto("secImg", "secArte", LOJA.secFoto);

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

// animação: cada bloco aparece quando você rola até ele
var revelador = ("IntersectionObserver" in window) ? new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (e.isIntersecting) { e.target.classList.add("vis"); revelador.unobserve(e.target); }
  });
}, { threshold: 0.15 }) : null;
function revelar(el) {
  if (revelador) revelador.observe(el); else el.classList.add("vis");
}
document.querySelectorAll(".rev").forEach(revelar);

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
  card.className = "card rev" + (s.disponivel ? "" : " esgotado") + (s.destaque && s.disponivel ? " destaque" : "");
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
  revelar(card);
  return card;
}

function atualizarQtds() {
  document.querySelectorAll(".passo .n").forEach(function (n) {
    var it = carrinho.find(function (i) { return String(i.id) === n.dataset.id; });
    n.textContent = it ? it.quantidade : 0;
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
