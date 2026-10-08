// ===== DADOS DA LOJA: troque aqui =====
var LOJA = {
  nome: "Nome da Sorveteria",
  endereco: "Rua Exemplo, 123 - São Paulo/SP",
  horario: "Todos os dias, das 12h às 22h",
  whatsapp: "5511999999999",
  heroTopo: "Momentos doces, felicidade em cada bola",
  heroTitulo: "A vida é melhor com",
  heroDestaque: "sorvete",
  heroTexto: "Cremoso, saboroso e feito com ingredientes frescos. Escolha o seu e retire na loja.",
  promoAtiva: true,
  promoTopo: "Oferta especial",
  promoTitulo: "Compre 2 bolas, leve 3"
};
// ======================================

var COLUNAS = "id,nome,descricao,preco,foto_url,categoria,destaque,disponivel";
var sabores = [];
var categoriaAtual = "Todos";
var jaVisto = {};

function erroNaTela(t) {
  document.getElementById("lista").innerHTML = '<p class="aviso">Erro: ' + t + "</p>";
}
function txt(id, v) { document.getElementById(id).textContent = v; }

function preencherLoja() {
  document.title = LOJA.nome;
  txt("lojaNome", LOJA.nome);
  txt("lojaEndereco", LOJA.endereco);
  txt("lojaHorario", LOJA.horario);
  txt("lojaRodape", "© " + new Date().getFullYear() + " " + LOJA.nome);
  document.getElementById("lojaZap").href = "https://wa.me/" + LOJA.whatsapp;
  txt("heroTopo", LOJA.heroTopo);
  txt("heroTexto", LOJA.heroTexto);
  var h = document.getElementById("heroTitulo");
  h.textContent = LOJA.heroTitulo + " ";
  var s = document.createElement("span");
  s.textContent = LOJA.heroDestaque;
  h.appendChild(s);
  if (LOJA.promoAtiva) {
    document.getElementById("blocoPromo").classList.remove("escondido");
    txt("promoTopo", LOJA.promoTopo);
    txt("promoTitulo", LOJA.promoTitulo);
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
  card.className = "card" + (s.disponivel ? "" : " esgotado");
  card.dataset.id = s.id;

  if (s.destaque && s.disponivel) {
    var selo = document.createElement("span");
    selo.className = "selo";
    selo.textContent = "Destaque";
    card.appendChild(selo);
  }
  if (s.foto_url) {
    var img = document.createElement("img");
    img.src = s.foto_url; img.alt = s.nome; img.loading = "lazy";
    card.appendChild(img);
  } else {
    var sf = document.createElement("div");
    sf.className = "sem-foto";
    sf.textContent = s.nome.charAt(0).toUpperCase();
    card.appendChild(sf);
  }

  var box = document.createElement("div");
  box.className = "conteudo";
  var nome = document.createElement("h3"); nome.textContent = s.nome;
  var desc = document.createElement("p"); desc.textContent = s.descricao || "";
  var preco = document.createElement("span"); preco.className = "preco"; preco.textContent = dinheiro(s.preco);
  var botao = document.createElement("button"); botao.className = "botao";
  if (s.disponivel) {
    botao.textContent = "Adicionar ao pedido";
    botao.onclick = function () { adicionarAoCarrinho(s); };
  } else {
    botao.textContent = "Esgotado";
    botao.disabled = true;
  }
  box.appendChild(nome); box.appendChild(desc); box.appendChild(preco); box.appendChild(botao);
  card.appendChild(box);
  observador.observe(card);
  return card;
}

function montarCategorias() {
  var box = document.getElementById("categorias");
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
    var ex = sabores.find(function (s) { return s.foto_url && (c === "Todos" || s.categoria === c); });
    if (ex) { var i = document.createElement("img"); i.src = ex.foto_url; i.alt = ""; bola.appendChild(i); }
    else { bola.textContent = c.charAt(0).toUpperCase(); }
    var l = document.createElement("span"); l.textContent = c;
    b.appendChild(bola); b.appendChild(l);
    b.onclick = function () { categoriaAtual = c; montarCategorias(); mostrar(); };
    box.appendChild(b);
  });
}

function mostrar() {
  var lista = document.getElementById("lista");
  var itens = sabores.filter(function (s) { return categoriaAtual === "Todos" || s.categoria === categoriaAtual; });
  lista.innerHTML = "";
  if (itens.length === 0) { lista.innerHTML = '<p class="aviso">Nenhum sabor cadastrado ainda.</p>'; return; }
  itens.forEach(function (s) { lista.appendChild(criarCard(s)); });
}

async function carregar() {
  preencherLoja();
  var r = await db.from("sabores").select(COLUNAS).order("destaque", { ascending: false }).order("nome");
  if (r.error) { erroNaTela(r.error.message); return; }
  sabores = r.data;
  montarCategorias();
  mostrar();
}

carregar().catch(function (e) { erroNaTela(e.message); });
