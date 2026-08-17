// Testes de src/lib/errors.ts (extractFieldErrors, getErrorMessage).
// Lógica pura, sem rede/estado global -> roda direto sob Vitest.
// Ver relatório do agente de testes para o comando de instalação/execução.

import { describe, expect, it } from 'vitest'
import { extractFieldErrors, getErrorMessage } from './errors'

describe('extractFieldErrors', () => {
  it('dado_erro_23505_com_coluna_conhecida_quando_extrai_entao_retorna_mensagem_de_duplicidade', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "mailing_contacts_email_key"',
      details: 'Key (email)=(a@b.com) already exists.',
    }

    expect(extractFieldErrors(error)).toEqual({ email: 'Este valor já está cadastrado.' })
  })

  it('dado_mensagem_com_duplicate_key_sem_code_quando_extrai_entao_ainda_reconhece_duplicidade', () => {
    const error = {
      message: 'duplicate key value violates unique constraint on name',
    }

    expect(extractFieldErrors(error)).toEqual({ name: 'Este valor já está cadastrado.' })
  })

  it('dado_erro_23502_com_coluna_conhecida_quando_extrai_entao_retorna_mensagem_de_campo_obrigatorio', () => {
    const error = {
      code: '23502',
      message: 'null value in column "subject" of relation "email_campaigns" violates not-null constraint',
    }

    expect(extractFieldErrors(error)).toEqual({ subject: 'Campo obrigatório.' })
  })

  // Regressao: "email_campaigns" (nome da tabela) contem a substring "email".
  // Antes da correcao, extractFieldErrors varria a mensagem inteira e batia
  // em "email" antes de olhar para a coluna estruturada, atribuindo o erro
  // de not-null de "subject" ao campo errado do formulario.
  it('dado_erro_23502_em_coluna_subject_de_tabela_cujo_nome_contem_email_quando_extrai_entao_nao_atribui_o_erro_ao_campo_email', () => {
    const error = {
      code: '23502',
      message: 'null value in column "subject" of relation "email_campaigns" violates not-null constraint',
    }

    const result = extractFieldErrors(error)
    expect(result).not.toHaveProperty('email')
    expect(result).toEqual({ subject: 'Campo obrigatório.' })
  })

  it('dado_erro_23505_com_key_estruturada_em_tabela_cujo_nome_contem_name_quando_extrai_entao_atribui_ao_campo_correto_da_key', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "sender_name_domain_key" on relation "domain_name_registry"',
      details: 'Key (sender_name)=(Equipe Lista Válida) already exists.',
    }

    const result = extractFieldErrors(error)
    expect(result).not.toHaveProperty('name')
    expect(result).toEqual({ sender_name: 'Este valor já está cadastrado.' })
  })

  it('dado_coluna_estruturada_que_nao_esta_em_known_columns_quando_extrai_entao_nao_faz_fallback_para_varredura_e_retorna_vazio', () => {
    // A coluna estruturada ("status") nao tem campo no formulario, mas a
    // mensagem completa contem "name" (de "relation") - a extracao nao deve
    // cair na varredura textual quando ja encontrou uma coluna estruturada,
    // mesmo que essa coluna nao esteja mapeada.
    const error = {
      code: '23502',
      message: 'null value in column "status" of relation "campaign_name_status" violates not-null constraint',
    }

    expect(extractFieldErrors(error)).toEqual({})
  })

  it('dado_key_estruturada_que_nao_esta_em_known_columns_quando_extrai_entao_retorna_vazio_sem_cair_na_varredura', () => {
    const error = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "mailing_contacts_cnpj_key"',
      details: 'Key (cnpj)=(00.000.000/0001-00) already exists.',
    }

    expect(extractFieldErrors(error)).toEqual({})
  })

  it('dado_erro_com_coluna_conhecida_mas_code_desconhecido_quando_extrai_entao_retorna_objeto_vazio', () => {
    const error = {
      code: '42501',
      message: 'permission denied for table category',
    }

    expect(extractFieldErrors(error)).toEqual({})
  })

  it('dado_erro_generico_do_supabase_sem_coluna_conhecida_quando_extrai_entao_retorna_objeto_vazio', () => {
    const error = { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }

    expect(extractFieldErrors(error)).toEqual({})
  })

  it('dado_instancia_de_error_comum_quando_extrai_entao_retorna_objeto_vazio', () => {
    expect(extractFieldErrors(new Error('email already used'))).toEqual({})
  })

  it('dado_null_ou_undefined_quando_extrai_entao_retorna_objeto_vazio', () => {
    expect(extractFieldErrors(null)).toEqual({})
    expect(extractFieldErrors(undefined)).toEqual({})
  })

  it('dado_objeto_sem_propriedade_message_quando_extrai_entao_retorna_objeto_vazio', () => {
    expect(extractFieldErrors({ code: '23505', details: 'email' })).toEqual({})
  })
})

describe('getErrorMessage', () => {
  it('dado_erro_supabase_com_message_string_quando_formata_entao_retorna_a_message', () => {
    const error = { message: 'Invalid login credentials', code: '400' }

    expect(getErrorMessage(error)).toBe('Invalid login credentials')
  })

  it('dado_instancia_de_error_comum_quando_formata_entao_retorna_error_message', () => {
    expect(getErrorMessage(new Error('falha de rede'))).toBe('falha de rede')
  })

  it('dado_null_ou_undefined_quando_formata_entao_retorna_mensagem_padrao', () => {
    expect(getErrorMessage(null)).toBe('Ocorreu um erro inesperado.')
    expect(getErrorMessage(undefined)).toBe('Ocorreu um erro inesperado.')
  })

  it('dado_objeto_sem_message_quando_formata_entao_retorna_mensagem_padrao', () => {
    expect(getErrorMessage({ code: '23505' })).toBe('Ocorreu um erro inesperado.')
  })

  it('dado_string_pura_quando_formata_entao_retorna_mensagem_padrao', () => {
    expect(getErrorMessage('algum texto solto')).toBe('Ocorreu um erro inesperado.')
  })

  it('dado_erro_com_message_vazia_quando_formata_entao_cai_na_mensagem_padrao', () => {
    // message: '' é falsy -> não é usada como asSupabaseError válido para o
    // early-return de getErrorMessage (err?.message), então cai no fallback.
    expect(getErrorMessage({ message: '' })).toBe('Ocorreu um erro inesperado.')
  })
})
