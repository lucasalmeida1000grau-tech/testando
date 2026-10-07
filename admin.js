function $(id) { return document.getElementById(id); }

// Qualquer erro de JavaScript aparece escrito na tela
window.onerror = function (msg) {
  var alvo = $("msgForm") || $("msgLogin");
  if (alvo) alvo.textContent = "ERRO NO CÓDIGO: " + msg;
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
    password:
