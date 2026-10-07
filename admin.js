function $(id) {
  return document.getElementById(id) || document.createElement("input");
}

window.onerror = function (msg) {
  alert("ERRO NO CÓDIGO: " + msg);
};

async function verificarSessao() {
  const r = await db.auth.getSession();
  if (!r.data.session) return;

  const p = await db.from("perfis").select("papel").eq("id", r.data.session.user.id).single();
  if (p.data && p.data.papel === "dono") {
    $("telaLogin").classList.add("escondido");
    $("telaPainel").classList.remove("escondido");
    $("btnSair").classList.remove("escondido");
    listar();
    return;
  }
  $("msgLogin").textContent = "Este usuário não é dono.";
  await db.auth.signOut();
}

async function entrar() {
  $("msgLogin").textContent = "Entrando...";
  const r = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("senha").value
  });
  if (r.error) {
    $("msgLogin").textContent = "Erro: " + r.error.message;
    return;
  }
  $("msgLogin").textContent = "";
  verificarSessao();
}

async function listar() {
  const r = await db.from("sabores").select("*").order("nome");
  const box = $("listaAdmin");
  box.innerHTML = "";
  if (r.error) { box.textContent = "Erro: " + r.error.message; return; }
  if (r.data.length === 0) { box.textContent = "Nenhum sabor ainda."; return; }

  r.data.forEach(function (s) {
    const item = document.createElement("div");
    item.className = "item";

    const txt = document.createElement("span");
    txt.textContent = s.nome + " - " + dinheiro(s.preco) +
      (s.destaque ? " ⭐" : "") + (s.disponivel ? "" : " (indisponível)");

    const bEd = document.createElement("button");
    bEd.textContent = "Editar";
    bEd.onclick = function () { editar(s); };

    const bDel = document.createElement("button");
    bDel.textContent = "Apagar";
    bDel.onclick = async function () {
      if (!confirm("Apagar " + s.nome + "?")) return;
      await db.from("sabores").delete().eq("id", s.id);
      listar();
    };

    const acoes = document.createElement("span");
    acoes.appendChild(bEd);
    acoes.appendChild(bDel);
    item.appendChild(txt);
    item.appendChild(acoes);
    box.appendChild(item);
  });
}

function editar(s) {
  $("tituloForm").textContent = "Editando: " + s.nome;
  $("idSabor").value = s.id;
  $("nome").value = s.nome;
  $("descricao").value = s.descricao || "";
  $("preco").value = s.preco;
  $("custo").value = s.custo || 0;
  $("categoria").value = s.categoria || "";
  $("codigo").value = s.codigo_barras || "";
  $("destaque").checked = !!s.destaque;
  $("disponivel").checked = !!s.disponivel;
  $("btnCancelar").classList.remove("escondido");
  window.scrollTo(0, 0);
}

function limpar() {
  $("tituloForm").textContent = "Novo sabor";
  $("idSabor").value = "";
  $("nome").value = "";
  $("descricao").value = "";
  $("preco").value = "";
  $("custo").value = "";
  $("categoria").value = "Sorvete";
  $("codigo").value = "";
  $("foto").value = "";
  $("destaque").checked = false;
  $("disponivel").checked = true;
  $("btnCancelar").classList.add("escondido");
}

async function salvar() {
  $("msgForm").textContent = "Salvando...";

  const dados = {
    nome: $("nome").value.trim(),
    descricao: $("descricao").value.trim(),
    preco: Number($("preco").value),
    custo: Number($("custo").value || 0),
    categoria: $("categoria").value.trim(),
    codigo_barras: $("codigo").value.trim() || null,
    destaque: $("destaque").checked,
    disponivel: $("disponivel").checked
  };

  if (!dados.nome || !dados.preco) {
    $("msgForm").textContent = "Preencha nome e preço.";
    return;
  }

  const arquivo = $("foto").files[0];
  if (arquivo) {
    const ext = arquivo.name.split(".").pop().toLowerCase();
    const caminho = Date.now() + "." + ext;
    const up = await db.storage.from("fotos").upload(caminho, arquivo);
    if (up.error) {
      $("msgForm").textContent = "Erro na foto: " + up.error.message;
      return;
    }
    dados.foto_url = db.storage.from("fotos").getPublicUrl(caminho).data.publicUrl;
  }

  const id = $("idSabor").value;
  const r = id
    ? await db.from("sabores").update(dados).eq("id", id).select()
    : await db.from("sabores").insert(dados).select();

  if (r.error) {
    $("msgForm").textContent = "Erro: " + r.error.message;
    return;
  }
  if (!r.data || r.data.length === 0) {
    $("msgForm").textContent = "O banco não salvou (usuário sem permissão de dono).";
    return;
  }

  $("msgForm").textContent = "Salvo!";
  limpar();
  listar();
}

$("btnEntrar").onclick = function () {
  entrar().catch(function (e) { $("msgLogin").textContent = "Erro: " + e.message; });
};
$("btnSair").onclick = async function () {
  await db.auth.signOut();
  location.reload();
};
$("btnCancelar").onclick = limpar;
$("btnSalvar").onclick = function () {
  salvar().catch(function (e) { $("msgForm").textContent = "Erro: " + e.message; });
};

verificarSessao();
