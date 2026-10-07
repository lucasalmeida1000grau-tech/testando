// Conexão com o Supabase
const SUPABASE_URL = "COLE_AQUI_O_PROJECT_URL";
const SUPABASE_KEY = "COLE_AQUI_A_ANON_KEY";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Formata número como dinheiro: 8 -> R$ 8,00
function dinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
