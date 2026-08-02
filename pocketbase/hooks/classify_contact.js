routerAdd(
  'POST',
  '/backend/v1/classify',
  (e) => {
    const body = e.requestInfo().body || {}
    const id = body.id
    if (!id) return e.badRequestError('ID do contato é obrigatório')

    const record = $app.findRecordById('mailing_contacts', id)
    if (!record) return e.notFoundError('Contato não encontrado')

    var auth = e.requestInfo().auth
    var authId = auth ? auth.id : ''
    var authRole = auth ? auth.getString('role') : ''
    var ownerId = record.getString('owner')
    if (ownerId && authId && ownerId !== authId && authRole !== 'admin') {
      return e.forbiddenError('Acesso negado a este contato')
    }

    const name = record.getString('name')
    const company = record.getString('company')
    const rawRole = record.getString('raw_role')
    const rsvp = record.getString('rsvp')
    const degree = record.getString('has_degree')

    const systemPrompt = `Você é um assistente especialista em higienização e classificação de mailings de eventos corporativos em português (Brasil).
Análise os dados do participante e retorne um JSON com a classificação estruturada.
Categorias válidas para role_category: ["C-Level", "Diretoria", "Gerência", "Coordenação", "Analista", "Assistente/Auxiliar", "Estagiário", "Consultor/Autônomo", "Outro"]
Prioridades válidas para priority: ["Alta", "Média", "Baixa"]

Formato estrito do JSON:
{
  "role_category": "categoria válida",
  "priority": "Alta | Média | Baixa",
  "interests": ["interesse 1", "interesse 2"],
  "demands": ["demanda 1", "demanda 2"],
  "profile_summary": "resumo sucinto do perfil em 1-2 frases em português",
  "suggested_message": "mensagem de abordagem personalizada e profissional em português para e-mail/WhatsApp referente ao evento"
}`

    const userPrompt = `Nome: ${name}
Empresa: ${company}
Cargo original: ${rawRole}
RSVP: ${rsvp}
Possui diploma de graduação: ${degree}`

    let jsonResult = null
    try {
      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const content = aiRes.choices[0].message.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonResult = JSON.parse(jsonMatch[0])
      }
    } catch (err) {
      $app.logger().error('Erro AI classificação', 'error', String(err))
    }

    if (!jsonResult) {
      jsonResult = {
        role_category: 'Outro',
        priority: 'Média',
        interests: ['Gestão de Pessoas', 'Desenvolvimento Organizacional'],
        demands: ['Networking e Troca de Experiências'],
        profile_summary: `Profissional atuando como ${rawRole} na empresa ${company}.`,
        suggested_message: `Olá ${name}! Gostaríamos de convidá-lo(a) para participar das discussões no evento.`,
      }
    }

    const validCategories = [
      'C-Level',
      'Diretoria',
      'Gerência',
      'Coordenação',
      'Analista',
      'Assistente/Auxiliar',
      'Estagiário',
      'Consultor/Autônomo',
      'Outro',
    ]
    const validPriorities = ['Alta', 'Média', 'Baixa']

    const roleCategory = validCategories.includes(jsonResult.role_category)
      ? jsonResult.role_category
      : 'Outro'
    const priority = validPriorities.includes(jsonResult.priority) ? jsonResult.priority : 'Média'
    const interests = Array.isArray(jsonResult.interests) ? jsonResult.interests : []
    const demands = Array.isArray(jsonResult.demands) ? jsonResult.demands : []
    const summary = jsonResult.profile_summary || ''
    const suggestedMsg = jsonResult.suggested_message || ''

    record.set('role_category', roleCategory)
    record.set('priority', priority)
    record.set('interests', interests)
    record.set('demands', demands)
    record.set('profile_summary', summary)
    record.set('suggested_message', suggestedMsg)
    record.set('classification_status', 'Classificado')
    record.set('last_classified_at', new Date().toISOString())

    const textToEmbed =
      `${name} ${company} ${rawRole} ${roleCategory} ${interests.join(' ')} ${summary}`.trim()
    try {
      const embedRes = $ai.embed({ input: textToEmbed })
      if (embedRes && embedRes.data && embedRes.data[0] && embedRes.data[0].embedding) {
        record.set('search_embedding', embedRes.data[0].embedding)
      }
    } catch (embedErr) {
      $app.logger().error('Erro embedding', 'error', String(embedErr))
    }

    $app.save(record)
    return e.json(200, record)
  },
  $apis.requireAuth(),
)
