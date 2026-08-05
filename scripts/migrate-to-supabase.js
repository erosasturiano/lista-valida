#!/usr/bin/env node
// Fase 6: migra os dados do PocketBase para o Supabase. Idempotente por
// padrao - reruns so adicionam o que ainda nao existe (por uuid
// deterministico), nunca sobrescrevem uma linha ja migrada. Isso e
// deliberado: os services do frontend (fase 5) ja estao gravando direto
// no Supabase, entao um rerun que sobrescrevesse tudo poderia apagar
// edicoes feitas depois da primeira migracao. Se algo mudou no
// PocketBase e precisa ressincronizar, ajuste o onConflict das funcoes
// upsertRows() abaixo pra `ignoreDuplicates: false` conscientemente.
//
// Requer credenciais de admin dos dois lados - NUNCA commitar essas
// variaveis. Use um arquivo .env.migration (ja no .gitignore via
// `.env*`) ou exporte no shell antes de rodar.
//
// Variaveis de ambiente obrigatorias:
//   PB_URL                     URL do PocketBase (VITE_POCKETBASE_URL)
//   PB_ADMIN_EMAIL              e-mail de um usuario com role "admin" no app
//   PB_ADMIN_PASSWORD           senha desse usuario
//   SUPABASE_URL                 URL do projeto Supabase
//   SUPABASE_SERVICE_ROLE_KEY    service_role key (NUNCA a anon key)
//
// Opcional:
//   SITE_URL                    usado no link do e-mail de redefinicao de senha
//   MIGRATE_DRY_RUN=true         so mostra o que faria, nao escreve nada
//
// Uso:
//   node scripts/migrate-to-supabase.js

import PocketBase from 'pocketbase'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const PB_URL = requireEnv('PB_URL')
const PB_ADMIN_EMAIL = requireEnv('PB_ADMIN_EMAIL')
const PB_ADMIN_PASSWORD = requireEnv('PB_ADMIN_PASSWORD')
const SUPABASE_URL = requireEnv('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const SITE_URL = process.env.SITE_URL || 'http://localhost:8080'
const DRY_RUN = process.env.MIGRATE_DRY_RUN === 'true'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`Variavel de ambiente obrigatoria ausente: ${name}`)
    process.exit(1)
  }
  return value
}

// Replica exatamente o cast (md5('pb:' || old_id))::uuid do Postgres:
// so insere hifens nas posicoes padrao do formato uuid, sem forcar
// versao/variante - preserva a mesma referencia cruzada entre tabelas
// sem precisar de uma tabela de mapeamento a parte.
function deterministicUuid(oldId) {
  const hash = crypto.createHash('md5').update(`pb:${oldId}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`
}

function randomPassword() {
  return crypto.randomBytes(24).toString('base64')
}

const CAMPAIGN_STATUS_PT_TO_DB = {
  rascunho: 'draft',
  enviando: 'sending',
  enviado: 'sent',
  parcialmente_falhou: 'partially_failed',
}

const LOG_STATUS_PT_TO_DB = {
  enviado: 'sent',
  falhou: 'failed',
}

async function upsertRows(supabase, table, rows, onConflict) {
  if (rows.length === 0) return { count: 0 }
  if (DRY_RUN) return { count: rows.length, dryRun: true }
  const { error, count } = await supabase
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates: true, count: 'exact' })
  if (error) throw new Error(`upsert ${table}: ${error.message}`)
  return { count: count ?? rows.length }
}

async function migrateUsers(pb, supabase) {
  const pbUsers = await pb.collection('users').getFullList()
  let created = 0
  let skipped = 0
  let emailed = 0

  for (const u of pbUsers) {
    const id = deterministicUuid(u.id)
    const { data: existing } = await supabase.auth.admin.getUserById(id)

    if (existing?.user) {
      skipped++
      continue
    }

    console.log(`[users] criando ${u.email} (role=${u.role || 'user'})`)
    if (DRY_RUN) {
      created++
      continue
    }

    const { data: createdUser, error } = await supabase.auth.admin.createUser({
      id,
      email: u.email,
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { name: u.name || u.email.split('@')[0] },
    })
    if (error) {
      console.error(`  falhou: ${error.message}`)
      continue
    }
    // handle_new_user (trigger) ja criou o profile com valores default -
    // aqui sobrescrevemos com os dados reais vindos do PocketBase.
    await supabase
      .from('profiles')
      .update({
        role: u.role === 'admin' ? 'admin' : 'user',
        sender_name: u.sender_name || null,
        sender_email: u.sender_email || null,
        created_at: u.created,
        updated_at: u.updated,
      })
      .eq('id', createdUser.user.id)

    await supabase.auth.resetPasswordForEmail(u.email, {
      redirectTo: `${SITE_URL}/redefinir-senha`,
    })
    emailed++
    created++
  }

  console.log(`[users] criados: ${created}, ja existiam: ${skipped}, e-mails de redefinicao enviados: ${emailed}`)
}

async function migrateEvents(pb, supabase) {
  const records = await pb.collection('events').getFullList()
  const rows = records.map((r) => ({
    id: deterministicUuid(r.id),
    owner_id: deterministicUuid(r.owner),
    name: r.name,
    event_date: r.event_date || null,
    description: r.description || null,
    created_at: r.created,
    updated_at: r.updated,
  }))
  const { count } = await upsertRows(supabase, 'events', rows, 'id')
  console.log(`[events] migrados: ${count} de ${records.length}`)
}

async function migrateTemplates(pb, supabase) {
  const records = await pb.collection('email_templates').getFullList()
  const rows = records.map((r) => ({
    id: deterministicUuid(r.id),
    owner_id: deterministicUuid(r.owner),
    name: r.name,
    category: r.category || null,
    sender_name: r.sender_name || null,
    sender_email: r.sender_email || null,
    subject: r.subject,
    body: r.body_template,
    created_at: r.created,
    updated_at: r.updated,
  }))
  const { count } = await upsertRows(supabase, 'email_templates', rows, 'id')
  console.log(`[email_templates] migrados: ${count} de ${records.length}`)
}

async function migrateContacts(pb, supabase) {
  const records = await pb.collection('mailing_contacts').getFullList()
  const rows = records.map((r) => ({
    id: deterministicUuid(r.id),
    owner_id: deterministicUuid(r.owner),
    event_id: deterministicUuid(r.event),
    name: r.name,
    email: r.email,
    phone: r.phone || null,
    company: r.company || null,
    raw_role: r.raw_role || null,
    rsvp: r.rsvp || null,
    has_degree: r.has_degree || null,
    classification_status: r.classification_status || null,
    role_category: r.role_category || null,
    priority: r.priority || null,
    interests: r.interests || [],
    demands: r.demands || [],
    profile_summary: r.profile_summary || null,
    suggested_message: r.suggested_message || null,
    notes: r.notes || null,
    last_classified_at: r.last_classified_at || null,
    created_at: r.created,
    updated_at: r.updated,
    // search_embedding: fora de escopo (fase 2 de IA), coluna nem existe ainda
  }))
  const { count } = await upsertRows(supabase, 'mailing_contacts', rows, 'id')
  console.log(`[mailing_contacts] migrados: ${count} de ${records.length}`)
}

async function migrateCampaigns(pb, supabase) {
  const records = await pb.collection('email_campaigns').getFullList()
  const rows = records.map((r) => ({
    id: deterministicUuid(r.id),
    owner_id: deterministicUuid(r.owner),
    event_id: deterministicUuid(r.event),
    name: r.name,
    subject: r.subject,
    body: r.body_template,
    sender_name: r.sender_name || null,
    sender_email: r.sender_email || null,
    status: CAMPAIGN_STATUS_PT_TO_DB[r.status] || 'draft',
    filter_rsvp: r.filter_rsvp || 'todos',
    filter_priority: r.filter_priority || 'todas',
    filter_category: r.filter_category || 'todas',
    total_sent: r.total_sent || 0,
    total_failed: r.total_failed || 0,
    created_at: r.created,
    updated_at: r.updated,
  }))
  const { count } = await upsertRows(supabase, 'email_campaigns', rows, 'id')
  console.log(`[email_campaigns] migrados: ${count} de ${records.length}`)
}

async function migrateLogs(pb, supabase) {
  const records = await pb.collection('email_logs').getFullList()
  const rows = records.map((r) => {
    const campaign = pb.collection('email_campaigns')
    return {
      id: deterministicUuid(r.id),
      owner_id: deterministicUuid(r.campaign), // dono real resolvido abaixo
      campaign_id: deterministicUuid(r.campaign),
      contact_id: r.contact ? deterministicUuid(r.contact) : null,
      recipient_email: r.recipient_email,
      recipient_name: r.recipient_name || null,
      subject: r.subject || null,
      body: r.body || null,
      status: LOG_STATUS_PT_TO_DB[r.status] || 'sent',
      error_message: r.error_message || null,
      sent_at: r.sent_at || null,
      opened_at: r.opened_at || null,
      clicked_at: r.clicked_at || null,
      click_count: r.click_count || 0,
      created_at: r.created,
      updated_at: r.updated,
    }
  })
  // email_logs.owner_id precisa ser o owner da campanha, nao um id
  // derivado do proprio log - resolve via lookup nas campanhas ja lidas.
  const campaigns = await pb.collection('email_campaigns').getFullList()
  const ownerByCampaignId = new Map(campaigns.map((c) => [c.id, deterministicUuid(c.owner)]))
  for (let i = 0; i < records.length; i++) {
    rows[i].owner_id = ownerByCampaignId.get(records[i].campaign) || rows[i].owner_id
  }

  const { count } = await upsertRows(supabase, 'email_logs', rows, 'id')
  console.log(`[email_logs] migrados: ${count} de ${records.length}`)
}

async function migrateBlockedContacts(pb, supabase) {
  const records = await pb.collection('blocked_contacts').getFullList()
  const rows = records.map((r) => ({
    id: deterministicUuid(r.id),
    owner_id: deterministicUuid(r.owner),
    contact_id: r.contact ? deterministicUuid(r.contact) : null,
    event_id: r.event ? deterministicUuid(r.event) : null,
    name: r.name || null,
    email: r.email,
    reason: r.reason || 'Manual',
    source: r.source || 'manual',
    notes: r.notes || null,
    blocked_at: r.blocked_at || r.created,
    created_at: r.created,
    updated_at: r.updated,
  }))
  const { count } = await upsertRows(supabase, 'blocked_contacts', rows, 'owner_id,email')
  console.log(`[blocked_contacts] migrados: ${count} de ${records.length}`)
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (nada sera escrito) ===' : '=== MIGRACAO REAL ===')

  const pb = new PocketBase(PB_URL)
  await pb.collection('users').authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Ordem importa: cada etapa referencia ids gerados pela anterior.
  await migrateUsers(pb, supabase)
  await migrateEvents(pb, supabase)
  await migrateTemplates(pb, supabase)
  await migrateContacts(pb, supabase)
  await migrateCampaigns(pb, supabase)
  await migrateLogs(pb, supabase)
  await migrateBlockedContacts(pb, supabase)

  console.log('=== concluido ===')
}

main().catch((err) => {
  console.error('Migracao falhou:', err)
  process.exit(1)
})
