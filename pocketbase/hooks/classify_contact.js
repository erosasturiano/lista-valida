routerAdd(
  'POST',
  '/backend/v1/classify-contact/{id}',
  (e) => {
    const id = e.request.pathValue('id')
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    let record
    try {
      record = $app.findRecordById('mailing_contacts', id)
    } catch (_) {
      return e.notFoundError('Contato não encontrado')
    }

    if (record.getString('owner') !== userId && e.auth?.getString('role') !== 'admin') {
      return e.forbiddenError('Acesso negado')
    }

    const name = record.getString('name')
    const email = record.getString('email')
    const company = record.getString('company')
    const rawRole = record.getString('raw_role')
    const cnpj = record.getString('cnpj')

    const prompt =
      'Analise o seguinte contato de mailing para evento e classifique-o:\n' +
      'Nome: ' +
      name +
      '\nE-mail: ' +
      email +
      '\nEmpresa: ' +
      company +
      '\nCargo: ' +
      rawRole +
      '\nCNPJ: ' +
      cnpj +
      '\n\n' +
      'Responda APENAS com JSON válido contendo:\n' +
      '- role_category: uma de "C-Level","Diretoria","Gerência","Coordenação","Analista","Assistente/Auxiliar","Estagiário","Consultor/Autônomo","Outro"\n' +
      '- priority: "Alta","Média" ou "Baixa"\n' +
      '- interests: array de strings com interesses\n' +
      '- demands: array de strings com demandas\n' +
      '- profile_summary: resumo breve\n' +
      '- suggested_message: mensagem personalizada de abordagem'

    try {
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente especializado em classificação de contatos para eventos. Responda apenas com JSON válido, sem texto adicional.',
          },
          { role: 'user', content: prompt },
        ],
      })

      const content = reply.choices[0].message.content
      let parsed
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content)
      } catch (_) {
        return e.json(500, { error: 'Falha ao processar classificação IA' })
      }

      if (parsed.role_category) record.set('role_category', parsed.role_category)
      if (parsed.priority) record.set('priority', parsed.priority)
      if (parsed.interests) record.set('interests', parsed.interests)
      if (parsed.demands) record.set('demands', parsed.demands)
      if (parsed.profile_summary) record.set('profile_summary', parsed.profile_summary)
      if (parsed.suggested_message) record.set('suggested_message', parsed.suggested_message)
      record.set('classification_status', 'Classificado')
      record.set('last_classified_at', new Date().toISOString().split('T')[0])

      const embedText = [name, company, rawRole, parsed.profile_summary].filter(Boolean).join(' ')
      if (embedText) {
        try {
          const embedRes = $ai.embed({ input: embedText })
          record.set('search_embedding', embedRes.data[0].embedding)
        } catch (embedErr) {
          console.log('Embedding failed for contact ' + id, String(embedErr))
        }
      }

      $app.save(record)
      return e.json(200, record)
    } catch (err) {
      return e.json(503, { error: 'Serviço de IA temporariamente indisponível' })
    }
  },
  $apis.requireAuth(),
)
