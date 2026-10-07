function $(id) { return document.getElementById(id); }

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

$("btnEntrar").onclick = async function () {
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
};

$("btnSair").onclick = async function () {
  await db.auth.signOut();
  location.reload();
};
