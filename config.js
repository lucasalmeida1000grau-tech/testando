const SUPABASE_URL = "https://crncaoscmdrisrhgmvgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_rWI-HiEa5k-EZp03xvCRlQ_3WBbtAeE";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function dinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/* ---------- Cor do aplicativo (o dono escolhe; vale para todas as telas) ---------- */
var COR_PADRAO = "#d6336c";

function corValida(h) { return /^#[0-9a-fA-F]{6}$/.test(String(h || "")); }

function hexParaRgb(h) {
  h = h.replace("#", "");
  return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
}
function rgbParaHex(r, g, b) {
  return "#" + [r, g, b].map(function (v) {
    v = Math.max(0, Math.min(255, Math.round(v)));
    return (v < 16 ? "0" : "") + v.toString(16);
  }).join("");
}
// mistura a cor com outra (p = 0 fica igual, p = 1 vira a outra)
function misturar(hex, com, p) {
  var a = hexParaRgb(hex), b = hexParaRgb(com);
  return rgbParaHex(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p);
}
function luminosidade(hex) {
  var c = hexParaRgb(hex).map(function (v) {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function aplicarCor(hex) {
  if (!corValida(hex)) return false;
  var s = document.documentElement.style;
  s.setProperty("--cor-principal", hex);
  s.setProperty("--cor-escura", misturar(hex, "#000000", 0.28));
  s.setProperty("--creme", misturar(hex, "#ffffff", 0.92));
  s.setProperty("--borda", misturar(hex, "#ffffff", 0.8));
  s.setProperty("--cor-clara", misturar(hex, "#ffffff", 0.65));
  s.setProperty("--cor-destaque", misturar(hex, "#ffffff", 0.45));
  // texto dos botões: branco em cor escura, escuro em cor clara (para dar para ler)
  s.setProperty("--sobre-cor", luminosidade(hex) > 0.2 ? "#2b1a12" : "#ffffff");
  try { localStorage.setItem("corLoja", hex); } catch (e) {}
  return true;
}

// usa a última cor conhecida na hora (evita piscar) e depois confere no banco
try { aplicarCor(localStorage.getItem("corLoja")); } catch (e) {}
db.from("config_loja").select("dados").eq("id", 1).maybeSingle().then(function (r) {
  if (r.data && r.data.dados && corValida(r.data.dados.corPrincipal)) aplicarCor(r.data.dados.corPrincipal);
}).catch(function () {});
