function erroNaTela(texto) {
  document.getElementById("lista").innerHTML =
    '<p class="aviso">Erro: ' + texto + '</p>';
}

async function carregar() {
  const resposta = await db
    .from("sabores")
    .select("*")
    .order("destaque", { ascending: false })
    .order("nome");

  if (resposta.error) {
    erroNaTela(resposta.error.message);
    return;
  }

  const lista = document.getElementById("lista");

  if (resposta.data.length === 0) {
    lista.innerHTML = '<p class="aviso">Nenhum sabor cadastrado ainda.</p>';
    return;
  }

  lista.innerHTML = "";

  resposta.data.forEach(function (s) {
    const card = document.createElement("div");
    card.className = "card" + (s.disponivel ? "" : " esgotado");

    if (s.destaque && s.disponivel) {
      const selo = document.createElement("span");
      selo.className = "selo";
      selo.textContent = "⭐ Destaque";
      card.appendChild(selo);
    }

    if (s.foto_url) {
      const img = document.createElement("img");
      img.src = s.foto_url;
      card.appendChild(img);
    }

    const box = document.createElement("div");
    box.className = "conteudo";

    const nome = document.createElement("h3");
    nome.textContent = s.nome;

    const desc = document.createElement("p");
    desc.textContent = s.descricao || "";

    const preco = document.createElement("span");
    preco.className = "preco";
    preco.textContent = dinheiro(s.preco);

    const botao = document.createElement("button");
    botao.className = "botao";
    if (s.disponivel) {
      botao.textContent = "Adicionar ao carrinho";
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
    lista.appendChild(card);
  });
}

carregar().catch(function (e) {
  erroNaTela(e.message);
});
