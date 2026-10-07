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
  $("foto").value = "";
  $("destaque").checked = false;
  $("disponivel").checked = true;
  $("btnCancelar").classList.add("escondido");
}

$("btnCancelar").onclick = limpar;

$("btnSalvar").onclick = async function () {
  $("msgForm").textContent = "Salvando...";

  const dados = {
    nome: $("nome").value.trim(),
    descricao: $("descricao").value.trim(),
    preco: Number($("preco").value),
    custo: Number($("custo").value || 0),
    categoria: $("categoria").value.trim(),
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
    ? await db.from("sabores").update(dados).eq("id", id)
    : await db.from("sabores").insert(dados);

  if (r.error) {
    $("msgForm").textContent = "Erro: " + r.error.message;
    return;
  }

  $("msgForm").textContent = "Salvo!";
  limpar();
  listar();
};

verificarSessao();
