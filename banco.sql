-- =====================================================================
-- BANCO DA SORVETERIA (Supabase / PostgreSQL)
--
-- Como usar:
--   1. Supabase > SQL Editor > New query > cole este arquivo > Run.
--      Pode rodar de novo sem medo: ele é feito para ser repetível.
--   2. Crie o usuário do dono em Authentication > Users.
--   3. Rode o bloco "PRIMEIRO DONO" no fim deste arquivo com o e-mail dele.
--   4. Para cada funcionário do caixa/pedidos: crie o usuário e rode o
--      insert de "FUNCIONÁRIO" (papel 'caixa').
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

create table if not exists public.perfis (
  id     uuid primary key references auth.users(id) on delete cascade,
  nome   text    not null default '',
  papel  text    not null default 'caixa' check (papel in ('dono', 'caixa')),
  ativo  boolean not null default true
);

create table if not exists public.sabores (
  id            uuid primary key default gen_random_uuid(),
  nome          text           not null,
  descricao     text           not null default '',
  preco         numeric(10,2)  not null check (preco > 0),
  custo         numeric(10,2)  not null default 0,
  foto_url      text,
  categoria     text           not null default 'Sorvete',
  codigo_barras text unique,
  destaque      boolean        not null default false,
  disponivel    boolean        not null default true,
  criado_em     timestamptz    not null default now()
);

create table if not exists public.visitas (
  id        bigint generated always as identity primary key,
  sabor_id  uuid not null references public.sabores(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index if not exists visitas_sabor_idx on public.visitas (sabor_id);

-- Textos, fotos, Pix e taxa de entrega do site ficam em um JSON (linha id = 1)
create table if not exists public.config_loja (
  id    int primary key,
  dados jsonb not null default '{}'::jsonb
);

create table if not exists public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  codigo           text not null unique,
  origem           text not null default 'online' check (origem in ('online', 'loja')),
  status           text not null default 'novo'
                   check (status in ('novo', 'preparando', 'pronto', 'saiu_entrega', 'entregue', 'cancelado')),
  tipo_entrega     text not null default 'retirada' check (tipo_entrega in ('retirada', 'entrega')),
  cliente_nome     text,
  cliente_telefone text,
  endereco         text,
  observacao       text,
  forma_pagamento  text not null check (forma_pagamento in ('pix', 'dinheiro', 'credito', 'debito')),
  taxa_entrega     numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  valor_recebido   numeric(10,2),
  pago             boolean not null default false,
  criado_em        timestamptz not null default now()
);
create index if not exists pedidos_criado_idx on public.pedidos (criado_em desc);

create table if not exists public.itens_pedido (
  id         bigint generated always as identity primary key,
  pedido_id  uuid not null references public.pedidos(id) on delete cascade,
  sabor_id   uuid references public.sabores(id) on delete set null,
  nome       text not null,
  quantidade int  not null check (quantidade > 0),
  preco_unit numeric(10,2) not null
);
create index if not exists itens_pedido_pedido_idx on public.itens_pedido (pedido_id);


-- ---------------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------

create or replace function public.eh_dono()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and papel = 'dono' and ativo
  );
$$;

-- dono ou funcionário ativo
create or replace function public.eh_equipe()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and ativo
  );
$$;

-- código curto do pedido (6 caracteres, ex.: 9F2A1C)
create or replace function public.novo_codigo()
returns text
language plpgsql
as $$
declare c text;
begin
  loop
    c := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.pedidos where codigo = c);
  end loop;
  return c;
end;
$$;
revoke execute on function public.novo_codigo() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 3. FUNÇÕES CHAMADAS PELO SITE (rpc)
-- ---------------------------------------------------------------------

-- Cliente faz o pedido no site. Os preços vêm do banco, nunca do navegador.
create or replace function public.criar_pedido_online(
  p_nome text, p_telefone text, p_pagamento text, p_tipo text,
  p_endereco text, p_obs text, p_itens jsonb
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_id     uuid;
  v_codigo text;
  v_sub    numeric(10,2) := 0;
  v_taxa   numeric(10,2);
  v_total  numeric(10,2);
  v_item   jsonb;
  v_sabor  public.sabores;
  v_qtd    int;
begin
  if length(trim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Informe o seu nome.';
  end if;
  if length(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Informe o telefone com DDD.';
  end if;
  if p_pagamento not in ('pix', 'dinheiro', 'credito', 'debito') then
    raise exception 'Forma de pagamento inválida.';
  end if;
  if p_tipo not in ('retirada', 'entrega') then
    raise exception 'Tipo de pedido inválido.';
  end if;
  if p_tipo = 'entrega' and length(trim(coalesce(p_endereco, ''))) < 8 then
    raise exception 'Informe o endereço de entrega.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 50 then
    raise exception 'Carrinho inválido.';
  end if;

  v_codigo := public.novo_codigo();

  insert into public.pedidos
    (codigo, origem, status, tipo_entrega, cliente_nome, cliente_telefone,
     endereco, observacao, forma_pagamento)
  values
    (v_codigo, 'online', 'novo', p_tipo, trim(p_nome), trim(p_telefone),
     case when p_tipo = 'entrega' then trim(p_endereco) else null end,
     nullif(trim(coalesce(p_obs, '')), ''), p_pagamento)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item ->> 'quantidade')::int;
    if v_qtd is null or v_qtd < 1 or v_qtd > 99 then
      raise exception 'Quantidade inválida.';
    end if;

    select * into v_sabor from public.sabores where id = (v_item ->> 'id')::uuid;
    if not found or not v_sabor.disponivel then
      raise exception 'Um dos sabores não está mais disponível.';
    end if;

    insert into public.itens_pedido (pedido_id, sabor_id, nome, quantidade, preco_unit)
    values (v_id, v_sabor.id, v_sabor.nome, v_qtd, v_sabor.preco);

    v_sub := v_sub + v_sabor.preco * v_qtd;
  end loop;

  v_taxa := 0;
  if p_tipo = 'entrega' then
    select coalesce(nullif(dados ->> 'taxaEntrega', '')::numeric, 0)
      into v_taxa from public.config_loja where id = 1;
    v_taxa := coalesce(v_taxa, 0);
  end if;

  v_total := v_sub + v_taxa;
  update public.pedidos set total = v_total, taxa_entrega = v_taxa where id = v_id;

  return json_build_object('codigo', v_codigo, 'total', v_total);
end;
$$;

-- Cliente acompanha o pedido com código + telefone
create or replace function public.consultar_pedido(p_codigo text, p_telefone text)
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'total',  total,
    'pago',   pago,
    'status', status,
    'tipo',   tipo_entrega
  )
  from public.pedidos
  where origem = 'online'
    and codigo = upper(trim(p_codigo))
    and regexp_replace(coalesce(cliente_telefone, ''), '\D', '', 'g')
      = regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')
  limit 1;
$$;

-- Venda no balcão (caixa). Só equipe logada.
create or replace function public.criar_venda_loja(
  p_pagamento text, p_recebido numeric, p_itens jsonb
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_id    uuid;
  v_total numeric(10,2) := 0;
  v_item  jsonb;
  v_sabor public.sabores;
  v_qtd   int;
begin
  if not public.eh_equipe() then
    raise exception 'Sem permissão de caixa.';
  end if;
  if p_pagamento not in ('pix', 'dinheiro', 'credito', 'debito') then
    raise exception 'Forma de pagamento inválida.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda está vazia.';
  end if;

  insert into public.pedidos
    (codigo, origem, status, tipo_entrega, forma_pagamento, pago)
  values
    (public.novo_codigo(), 'loja', 'entregue', 'retirada', p_pagamento, true)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (v_item ->> 'quantidade')::int;
    if v_qtd is null or v_qtd < 1 or v_qtd > 999 then
      raise exception 'Quantidade inválida.';
    end if;

    select * into v_sabor from public.sabores where id = (v_item ->> 'id')::uuid;
    if not found or not v_sabor.disponivel then
      raise exception 'Produto indisponível.';
    end if;

    insert into public.itens_pedido (pedido_id, sabor_id, nome, quantidade, preco_unit)
    values (v_id, v_sabor.id, v_sabor.nome, v_qtd, v_sabor.preco);

    v_total := v_total + v_sabor.preco * v_qtd;
  end loop;

  if p_pagamento = 'dinheiro' and coalesce(p_recebido, 0) < v_total then
    raise exception 'Valor recebido menor que o total.';
  end if;

  update public.pedidos
     set total = v_total,
         valor_recebido = case when p_pagamento = 'dinheiro' then p_recebido else null end
   where id = v_id;

  return json_build_object('total', v_total);
end;
$$;

-- Equipe muda o status e/ou confirma o pagamento
create or replace function public.atualizar_pedido(
  p_id uuid, p_status text, p_pago boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.eh_equipe() then
    raise exception 'Sem permissão.';
  end if;
  if p_status is not null
     and p_status not in ('novo', 'preparando', 'pronto', 'saiu_entrega', 'entregue', 'cancelado') then
    raise exception 'Status inválido.';
  end if;

  update public.pedidos
     set status = coalesce(p_status, status),
         pago   = coalesce(p_pago, pago)
   where id = p_id;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
end;
$$;


-- ---------------------------------------------------------------------
-- 4. SEGURANÇA (RLS)
-- ---------------------------------------------------------------------

alter table public.perfis       enable row level security;
alter table public.sabores      enable row level security;
alter table public.visitas      enable row level security;
alter table public.config_loja  enable row level security;
alter table public.pedidos      enable row level security;
alter table public.itens_pedido enable row level security;

-- perfis: cada um lê o seu; o dono lê todos
drop policy if exists perfis_ler on public.perfis;
create policy perfis_ler on public.perfis for select
  to authenticated using (id = auth.uid() or public.eh_dono());

-- sabores: todos veem; só o dono altera
drop policy if exists sabores_ler on public.sabores;
create policy sabores_ler on public.sabores for select using (true);
drop policy if exists sabores_inserir on public.sabores;
create policy sabores_inserir on public.sabores for insert
  to authenticated with check (public.eh_dono());
drop policy if exists sabores_alterar on public.sabores;
create policy sabores_alterar on public.sabores for update
  to authenticated using (public.eh_dono()) with check (public.eh_dono());
drop policy if exists sabores_apagar on public.sabores;
create policy sabores_apagar on public.sabores for delete
  to authenticated using (public.eh_dono());

-- O visitante NÃO pode ler custo nem código de barras (só as colunas do cardápio).
revoke select on public.sabores from anon;
grant select (id, nome, descricao, preco, foto_url, categoria, destaque, disponivel, criado_em)
  on public.sabores to anon;

-- visitas: qualquer um registra; só o dono lê
drop policy if exists visitas_inserir on public.visitas;
create policy visitas_inserir on public.visitas for insert
  to anon, authenticated with check (true);
drop policy if exists visitas_ler on public.visitas;
create policy visitas_ler on public.visitas for select
  to authenticated using (public.eh_dono());

-- config_loja: todos leem (o site precisa); só o dono grava
drop policy if exists config_ler on public.config_loja;
create policy config_ler on public.config_loja for select using (true);
drop policy if exists config_inserir on public.config_loja;
create policy config_inserir on public.config_loja for insert
  to authenticated with check (public.eh_dono());
drop policy if exists config_alterar on public.config_loja;
create policy config_alterar on public.config_loja for update
  to authenticated using (public.eh_dono()) with check (public.eh_dono());

-- pedidos e itens: só a equipe lê. Ninguém grava direto: tudo passa pelas funções acima.
drop policy if exists pedidos_ler on public.pedidos;
create policy pedidos_ler on public.pedidos for select
  to authenticated using (public.eh_equipe());
drop policy if exists itens_ler on public.itens_pedido;
create policy itens_ler on public.itens_pedido for select
  to authenticated using (public.eh_equipe());


-- ---------------------------------------------------------------------
-- 5. FOTOS (Storage)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists fotos_ler on storage.objects;
create policy fotos_ler on storage.objects for select
  using (bucket_id = 'fotos');
drop policy if exists fotos_enviar on storage.objects;
create policy fotos_enviar on storage.objects for insert
  to authenticated with check (bucket_id = 'fotos' and public.eh_dono());
drop policy if exists fotos_alterar on storage.objects;
create policy fotos_alterar on storage.objects for update
  to authenticated using (bucket_id = 'fotos' and public.eh_dono());
drop policy if exists fotos_apagar on storage.objects;
create policy fotos_apagar on storage.objects for delete
  to authenticated using (bucket_id = 'fotos' and public.eh_dono());


-- ---------------------------------------------------------------------
-- 6. PRIMEIRO DONO  (troque o e-mail e rode só este bloco)
-- ---------------------------------------------------------------------
-- insert into public.perfis (id, nome, papel)
-- select id, 'Dono', 'dono' from auth.users where email = 'SEU_EMAIL_AQUI'
-- on conflict (id) do update set papel = 'dono', ativo = true;

-- FUNCIONÁRIO (caixa e tela de pedidos):
-- insert into public.perfis (id, nome, papel)
-- select id, 'Nome do funcionário', 'caixa' from auth.users where email = 'EMAIL_DO_FUNCIONARIO'
-- on conflict (id) do update set papel = 'caixa', ativo = true;
