function erroNaTela(texto) {
  document.getElementById("lista").innerHTML =
    '<p class="aviso">Erro: ' + texto + '</p>';
}

async function carregar() {
  if (typeof db === "undefined") {
    erroNaTela("o config.js não foi lido");
    return;
  }

  const resposta = await db.from("sabores").select("*").order("nome");

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
    card.className = "card";

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

    box.appendChild(nome);
    box.appendChild(desc);
    box.appendChild(preco);
    card.appendChild(box);
    lista.appendChild(card);
  });
}

carregar().catch(function (e) {
  erroNaTela(e.message);
});
