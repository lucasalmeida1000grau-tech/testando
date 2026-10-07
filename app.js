// ===== DADOS DA LOJA: troque aqui =====
var LOJA = {
  nome: "Nome da Sorveteria",
  endereco: "📍 Rua Exemplo, 123 - São Paulo/SP",
  horario: "🕒 Todos os dias, das 12h às 22h",
  whatsapp: "5511999999999"
};
// ======================================

var COLUNAS = "id,nome,descricao,preco,foto_url,categoria,destaque,disponivel";
var sabores = [];
var categoriaAtual = "Todos";
var jaVisto = {};

function erroNaTela(texto) {
  document.getElementById("lista").innerHTML =
    '<p class="aviso">Erro: ' + texto + "</p>";
}

function preencherLoja() {
  document.title = LOJA.nome;
  document.getElementById("lojaNome").textContent = "🍦 " + LOJA.nome;
  document.getElementById("lojaEndereco").textContent = LOJA.endereco;
  document.getElementById("lojaHorario").textContent = LOJA.horario;
  document.getElementById("lojaZap").href = "https://wa.me/" + LOJA.whatsapp;
  document.getElementById("lojaRodape").textContent =
    "© " + new Date().getFullYear() + " " + LOJA.nome;
}

// Conta 1 visita por sabor por acesso, quando o card aparece na tela
var observador = new IntersectionObserver(function (entradas) {
  entradas.forEach(function (e) {
    if (!e.isIntersecting) return;
    var id = e.target.dataset.id;
    if (jaVisto[id]) return;
    jaVisto[id] = true;
    db.from("visitas").insert({ sabor_id: id }).then(function () {});
  });
}, { threshold: 0.6 });

function criarCard(s, combo) {
  var card = document.createElement("div");
  card.className = "card" + (combo ? " combo" : "") + (s.disponivel ? "" : " esgotado");
  card.dataset.id = s.id;

  if (s.destaque && s.disponivel && !combo) {
    var selo = document.createElement("span");
    selo.className = "selo";
    selo.textContent = "⭐ Destaque";
    card.appendChild(selo);
  }

  if (s.foto_url) {
    var img = document.createElement("img");
    img.src = s.foto_url;
    img.alt = s.nome;
    img.loading = "lazy";
    card.appendChild(img);
  } else {
    var sf = document.createElement("div");
    sf.className = "sem-foto";
    sf.textContent = "🍨";
    card.appendChild(sf);
  }

  var box = document.createElement("div");
  box.className = "conteudo";

  var nome = document.createElement("h3");
  nome.textContent = s.nome;
  var desc = document.createElement("p");
  desc.textContent = s.descricao || "";
  var preco = document.createElement("span");
  preco.className = "preco";
  preco.textContent = dinheiro(s.preco);

  var botao = document.createElement("button");
  botao.className = "botao";
  if (s.disponivel) {
    botao.textContent = "Adicionar ao pedido";
    botao.onclick = function () { adicionarAoCarrinho(s); };
  } else {
    botao.textContent = "Esgotado";
    botao.disabled = true;
  }

  box.appendChild(nome);
  box.appendChild(desc);
  box.appendChild(preco);
  box.appendChild(botao);
  card.appendChild(box);
  observador.observe(card);
  return card;
}

function montarFiltros() {
  var cats = ["Todos"];
  sabores.forEach(function (s) {
    if (s.categoria && cats.indexOf(s.categoria) === -1) cats.push(s.categoria);
  });
  var box = document.getElementById("filtros");
  box.innerHTML = "";
  if (cats.length < 3) return;
  cats.forEach(function (c) {
    var b = document.createElement("button");
    b.textContent = c;
    if (c === categoriaAtual) b.className = "ativo";
    b.onclick = function () { categoriaAtual = c; montarFiltros(); mostrar(); };
    box.appendChild(b);
  });
}

function mostrar() {
  var lista = document.getElementById("lista");
  var itens = sabores.filter(function (s) {
    return categoriaAtual === "Todos" || s.categoria === categoriaAtual;
  });
  lista.innerHTML = "";
  if (itens.length === 0) {
    lista.innerHTML = '<p class="aviso">Nenhum sabor cadastrado ainda.</p>';
    return;
  }
  itens.forEach(function (s) { lista.appendChild(criarCard(s, false)); });
}

function mostrarDestaques() {
  var dest = sabores.filter(function (s) { return s.destaque && s.disponivel; });
  var bloco = document.getElementById("blocoDestaques");
  var lista = document.getElementById("listaDestaques");
  lista.innerHTML = "";
  if (dest.length === 0) { bloco.classList.add("escondido"); return; }
  bloco.classList.remove("escondido");
  dest.forEach(function (s) { lista.appendChild(criarCard(s, true)); });
}

async function carregar() {
  preencherLoja();
  var r = await db.from("sabores").select(COLUNAS)
    .order("destaque", { ascending: false }).order("nome");
  if (r.error) { erroNaTela(r.error.message); return; }
  sabores = r.data;
  montarFiltros();
  mostrarDestaques();
  mostrar();
}

carregar().catch(function (e) { erroNaTela(e.message); });
