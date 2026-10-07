const SUPABASE_URL = "https://crncaoscmdrisrhgmvgt.supabase.co";
const SUPABASE_KEY = "sb_publishable_rWI-HiEa5k-EZp03xvCRlQ_3WBbtAeE";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function dinheiro(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
