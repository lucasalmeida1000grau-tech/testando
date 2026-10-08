function fecharForm() {
  var f = document.getElementById("formDono");
  if (f) f.remove();
}

function abrirForm(titulo, campos, aoSalvar, rotulo) {
  fecharForm();
  var fundo = document.createElement("div");
  fundo.className = "fundo";
  fundo.id = "formDono";
  var p = document.createElement("div");
  p.className = "painel";

  var x = document.createElement("button");
  x.className = "fechar";
  x.textContent = "×";
  x.onclick = fecharForm;
  var t = document.createElement("h2");
  t.textContent = titulo;
  p.appendChild(x);
  p.appendChild(t);

  campos.forEach(function (c) {
    var i = c.tipo === "textarea" ? document.createElement("textarea") : document.createElement("input");
    if (c.tipo !== "textarea") i.type = c.tipo;
    i.id = "f_" + c.id;
    if (c.tipo === "checkbox") i.checked = !!c.valor;
    else if (c.tipo !== "file") i.value = c.valor == null ? "" : c.valor;
    if (c.tipo === "number") i.step = "0.01";
    if (c.tipo === "file") i.accept = "image/*";

    var l = document.createElement("label");
    if (c.tipo === "checkbox") {
      l.className = "check";
      l.appendChild(i);
      l.appendChild(document.createTextNode(c.rotulo));
      p.appendChild(l);
    } else {
      l.textContent = c.rotulo;
      p.appendChild(l);
      p.appendChild(i);
    }
  });

  var b = document.createElement("button");
  b.className = "botao";
  b.textContent = rotulo || "Salvar";
  var m = document.createElement("p");
  m.className = "msg-pedido";

  b.onclick = async function () {
    m.textContent = "Aguarde...";
    var v = {};
    campos.forEach(function (c) {
      var e = document.getElementById("f_" + c.id);
      if (c.tipo === "checkbox") v[c.id] = e.checked;
      else if (c.tipo === "file") v[c.id] = e.files[0] || null;
      else if (c.tipo === "number") v[c.id] = e.value === "" ? null : Number(e.value);
      else v[c.id] = e.value.trim();
    });
    try {
      await aoSalvar(v);
      fecharForm();
    } catch (err) {
      m.textContent = "Erro: " + (err.message || err);
    }
  };

  p.appendChild(b);
  p.appendChild(m);
  fundo.appendChild(p);
  document.body.appendChild(fundo);
}

async function enviarFoto(arq) {
  var ext = arq.name.split(".").pop().toLowerCase();
  var cam = Date.now() + "_" + Math.random().toString(36).slice(2, 6) + "." + ext;
  var up = await db.storage.from("fotos").upload(cam, arq);
  if (up.error) throw up.error;
  return db.storage.from("fotos").getPublicUrl(cam).data.publicUrl;
}

/* ---------- Sabores ---------- */

async function salvarSabor(id, v) {
  var d = {
    nome: v.nome,
    descricao: v.descricao,
    preco: v.preco,
    custo: v.custo || 0,
    categoria: v.categoria,
    codigo_barras: v.codigo || null,
    destaque: v.destaque,
    disponivel: v.disponivel
  };
  if (!d.nome || !d.preco) throw new Error("Preencha nome e preço.");
  if (v.foto) d.foto_url = await enviarFoto(v.foto);

  var r = id
    ? await db.from("sabores").update(d).eq("id", id).select()
    : await db.from("sabores").insert(d).select();
  if (r.error) throw r.error;
  if (!r.data || r.data.length === 0) throw new Error("O banco não salvou (sem permissão de dono).");
  carregar();
}

function formSabor(d) {
  abrirForm(d.id ? "Editar sabor" : "Novo sabor", [
    { id: "nome", rotulo: "Nome", tipo: "text", valor: d.nome },
    { id: "descricao", rotulo: "Descrição", tipo: "textarea", valor: d.descricao },
    { id: "preco", rotulo: "Preço (R$)", tipo: "number", valor: d.preco },
    { id: "custo", rotulo: "Custo (R$)", tipo: "number", valor: d.custo },
    { id: "categoria", rotulo: "Categoria", tipo: "text", valor: d.categoria || "Sorvete" },
    { id: "codigo", rotulo: "Código de barras", tipo: "text", valor: d.codigo_barras },
    { id: "foto", rotulo: "Foto", tipo: "file" },
    { id: "destaque", rotulo: "Destaque", tipo: "checkbox", valor: d.destaque },
    { id: "disponivel", rotulo: "Disponível", tipo: "checkbox", valor: d.id ? d.disponivel : true }
  ], function (v) { return salvarSabor(d.id, v); });
}

async function editarSabor(s) {
  var r = await db.from("sabores").select("*").eq("id", s.id).single();
  formSabor(r.data || s);
}

async function apagarSabor(s) {
  if (!confirm("Apagar " + s.nome + "?")) return;
  var r = await db.from("sabores").delete().eq("id", s.id);
  if (r.error) { alert("Erro: " + r.error.message); return; }
  carregar();
}

function barraCard(s) {
  var box = document.createElement("div");
  box.className = "dono-acoes";
  var e = document.createElement("button");
  e.className = "botao contorno";
  e.textContent = "Editar";
  e.onclick = function () { editarSabor(s); };
  var a = document.createElement("button");
  a.className = "botao perigo";
  a.textContent = "Apagar";
  a.onclick = function () { apagarSabor(s); };
  box.appendChild(e);
  box.appendChild(a);
  return box;
}

/* ---------- Textos e fotos do site ---------- */

var CAMPOS_TEXTO = ["nome","endereco","horario","whatsapp","heroTitulo","heroTexto","heroBotao","heroChamada",
  "secTitulo","secTexto","secBotao","tituloCardapio","instagram","site","promoTopo","promoTitulo","pixChave","pixNome","pixCidade"];

async function salvarSite(v) {
  var novo = Object.assign({}, LOJA);
  CAMPOS_TEXTO.forEach(function (k) { novo[k] = v[k]; });
  novo.heroDestaque = "";
  novo.promoAtiva = v.promoAtiva;
  novo.taxaEntrega = v.taxaEntrega || 0;
  ["cor1", "cor2", "corFundo", "corTexto"].forEach(function (k) { if (corValida(v[k])) novo[k] = v[k]; });
  novo.corPrincipal = novo.cor1;
  if (v.heroFoto) novo.heroFoto = await enviarFoto(v.heroFoto);
  if (v.secFoto) novo.secFoto = await enviarFoto(v.secFoto);
  if (v.promoFoto) novo.promoFoto = await enviarFoto(v.promoFoto);

  var r = await db.from("config_loja").upsert({ id: 1, dados: novo }).select();
  if (r.error) throw r.error;
  if (!r.data || r.data.length === 0) throw new Error("O banco não salvou (sem permissão de dono).");
  Object.assign(LOJA, novo);
  preencherLoja();
}

function editarSite() {
  var c = function (k, d) { return corValida(LOJA[k]) ? LOJA[k] : d; };
  abrirForm("Editar o site", [
    { id: "nome", rotulo: "Nome da sorveteria", tipo: "text", valor: LOJA.nome },
    { id: "endereco", rotulo: "Endereço", tipo: "text", valor: LOJA.endereco },
    { id: "horario", rotulo: "Horário", tipo: "text", valor: LOJA.horario },
    { id: "whatsapp", rotulo: "WhatsApp (só números, com 55 e DDD)", tipo: "text", valor: LOJA.whatsapp },
    { id: "cor1", rotulo: "COR 1 (círculos, botões, destaques)", tipo: "color", valor: c("cor1", "#ff9f1c") },
    { id: "cor2", rotulo: "COR 2 (anel, segundo destaque, promoção)", tipo: "color", valor: c("cor2", "#e63946") },
    { id: "corFundo", rotulo: "COR do fundo", tipo: "color", valor: c("corFundo", "#fdf1dc") },
    { id: "corTexto", rotulo: "COR dos textos", tipo: "color", valor: c("corTexto", "#3b2417") },
    { id: "heroTitulo", rotulo: "Tela 1: título (coloque *asteriscos* nas palavras coloridas)", tipo: "textarea", valor: LOJA.heroTitulo },
    { id: "heroTexto", rotulo: "Tela 1: texto", tipo: "textarea", valor: LOJA.heroTexto },
    { id: "heroBotao", rotulo: "Tela 1: texto do botão", tipo: "text", valor: LOJA.heroBotao },
    { id: "heroChamada", rotulo: "Tela 1: frase final (*asteriscos* = colorido)", tipo: "text", valor: LOJA.heroChamada },
    { id: "heroFoto", rotulo: "Tela 1: foto (trocar) — ideal PNG sem fundo", tipo: "file" },
    { id: "secTitulo", rotulo: "Tela 2: título (*asteriscos* = colorido)", tipo: "textarea", valor: LOJA.secTitulo },
    { id: "secTexto", rotulo: "Tela 2: texto", tipo: "textarea", valor: LOJA.secTexto },
    { id: "secBotao", rotulo: "Tela 2: texto do botão", tipo: "text", valor: LOJA.secBotao },
    { id: "secFoto", rotulo: "Tela 2: foto (trocar)", tipo: "file" },
    { id: "instagram", rotulo: "Instagram (aparece na tela 2 e pode ser o que quiser)", tipo: "text", valor: LOJA.instagram },
    { id: "site", rotulo: "Endereço do site", tipo: "text", valor: LOJA.site },
    { id: "tituloCardapio", rotulo: "Título do cardápio (*asteriscos* = colorido)", tipo: "text", valor: LOJA.tituloCardapio },
    { id: "promoAtiva", rotulo: "Mostrar a promoção", tipo: "checkbox", valor: LOJA.promoAtiva },
    { id: "promoTopo", rotulo: "Promoção: frase pequena", tipo: "text", valor: LOJA.promoTopo },
    { id: "promoTitulo", rotulo: "Promoção: título", tipo: "text", valor: LOJA.promoTitulo },
    { id: "promoFoto", rotulo: "Promoção: foto (trocar)", tipo: "file" },
    { id: "taxaEntrega", rotulo: "Taxa de entrega (R$)", tipo: "number", valor: LOJA.taxaEntrega },
    { id: "pixChave", rotulo: "Chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)", tipo: "text", valor: LOJA.pixChave },
    { id: "pixNome", rotulo: "Nome do recebedor do Pix (como no banco)", tipo: "text", valor: LOJA.pixNome },
    { id: "pixCidade", rotulo: "Cidade do recebedor do Pix", tipo: "text", valor: LOJA.pixCidade }
  ], salvarSite);

  // prévia ao vivo: ao escolher uma cor, o site já muda
  var ids = ["cor1", "cor2", "corFundo", "corTexto"];
  ids.forEach(function (k) {
    document.getElementById("f_" + k).oninput = function () {
      var o = {};
      ids.forEach(function (j) { o[j] = document.getElementById("f_" + j).value; });
      aplicarCores(o);
    };
  });
  // se fechar sem salvar, volta às cores salvas
  var x = document.querySelector("#formDono .fechar");
  if (x) x.addEventListener("click", function () { aplicarCores(LOJA); });
}

/* ---------- Login e modo dono ---------- */

async function verificarDono() {
  var s = await db.auth.getSession();
  if (!s.data.session) return false;
  var p = await db.from("perfis").select("papel").eq("id", s.data.session.user.id).maybeSingle();
  if (p.data && p.data.papel === "dono") {
    ligarModoDono();
    return true;
  }
  return false;
}

function ligarModoDono() {
  if (DONO) return;
  DONO = true;
  document.body.classList.add("modo-dono");

  var barra = document.createElement("div");
  barra.id = "barraDono";
  var rot = document.createElement("span");
  rot.textContent = "Modo dono";

  function botao(texto, fn) {
    var b = document.createElement("button");
    b.className = "botao";
    b.textContent = texto;
    b.onclick = fn;
    return b;
  }

  barra.appendChild(rot);
  barra.appendChild(botao("Editar site", editarSite));
  barra.appendChild(botao("Novo sabor", function () { formSabor({}); }));
  barra.appendChild(botao("Sair", async function () {
    await db.auth.signOut();
    location.reload();
  }));
  document.body.insertBefore(barra, document.body.firstChild);
  carregar();
}

function abrirLogin() {
  abrirForm("Entrar como dono", [
    { id: "email", rotulo: "E-mail", tipo: "email" },
    { id: "senha", rotulo: "Senha", tipo: "password" }
  ], async function (v) {
    var r = await db.auth.signInWithPassword({ email: v.email, password: v.senha });
    if (r.error) throw r.error;
    var ok = await verificarDono();
    if (!ok) {
      await db.auth.signOut();
      throw new Error("Este usuário não é dono.");
    }
  }, "Entrar");
}

document.getElementById("btnDono").onclick = function (e) {
  e.preventDefault();
  if (!DONO) abrirLogin();
};

verificarDono().then(function (ok) {
  if (!ok && location.hash === "#dono") abrirLogin();
});
