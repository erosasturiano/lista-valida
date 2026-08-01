migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'erosasturiano@gmail.com')
    } catch (_) {
      const record = new Record(users)
      record.setEmail('erosasturiano@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Eros Asturiano')
      app.save(record)
    }

    const eventsCol = app.findCollectionByNameOrId('events')
    let eventRecord
    try {
      eventRecord = app.findFirstRecordByData('events', 'name', 'Evento DHO')
    } catch (_) {
      eventRecord = new Record(eventsCol)
      eventRecord.set('name', 'Evento DHO')
      eventRecord.set('description', 'Evento de Desenvolvimento Humano e Organizacional')
      eventRecord.set('event_date', new Date().toISOString())
      app.save(eventRecord)
    }

    const contactsCol = app.findCollectionByNameOrId('mailing_contacts')
    const dummyContacts = [
      {
        name: 'Mariana Silva',
        email: 'm.silva@technova.example.com',
        phone: '(41) 99999-1001',
        company: 'TechNova Solutions',
        raw_role: 'Gerente de Pessoas & Culture',
        rsvp: 'Confirmou',
        has_degree: 'Sim',
        classification_status: 'Classificado',
        role_category: 'Gerência',
        priority: 'Alta',
        interests: ['Liderança', 'Treinamento', 'Clima Organizacional'],
        demands: ['Implementação de LNT', 'Estruturação de Plano de Carreira'],
        profile_summary:
          'Gerente de DHO focada em transformação cultural e desenvolvimento de liderança executiva.',
        suggested_message:
          'Olá Mariana! Vi sua confirmação para o Evento DHO. Será um prazer trocar experiências sobre desenvolvimento de liderança com a TechNova Solutions.',
      },
      {
        name: 'Carlos Eduardo Santos',
        email: 'carlos@inovacaodigital.example.com',
        phone: '(41) 99999-1002',
        company: 'Inovação Digital',
        raw_role: 'Diretor de Operações',
        rsvp: 'Aguardando',
        has_degree: 'Sim',
        classification_status: 'Pendente',
        role_category: 'Diretoria',
        priority: 'Média',
        interests: ['Gestão de Mudança', 'People Analytics'],
        demands: ['Dashboard de indicadores de RH'],
        profile_summary:
          'Diretor focado em otimização de processos e tecnologia aplicada à gestão.',
        suggested_message:
          'Olá Carlos! Gostaríamos de contar com sua presença no Evento DHO para debatermos métricas e People Analytics no setor corporativo.',
      },
      {
        name: 'Luciana Costa',
        email: 'luciana@alphaconsultoria.example.com',
        phone: '(41) 99999-1003',
        company: 'Alpha Consultoria',
        raw_role: 'Analista de RH Senior',
        rsvp: 'Recusou',
        has_degree: 'Sim',
        classification_status: 'Revisado',
        role_category: 'Analista',
        priority: 'Baixa',
        interests: ['Recrutamento', 'Benefícios'],
        demands: ['Consultoria de Remuneração'],
        profile_summary: 'Analista sênior com foco em seleção executiva e retenção de talentos.',
        suggested_message:
          'Olá Luciana! Agradecemos seu retorno. Caso precise de resumos ou conteúdos do Evento DHO, estaremos à disposição.',
      },
    ]

    for (let i = 0; i < dummyContacts.length; i++) {
      const c = dummyContacts[i]
      try {
        app.findFirstRecordByData('mailing_contacts', 'email', c.email)
      } catch (_) {
        const rec = new Record(contactsCol)
        rec.set('event', eventRecord.id)
        rec.set('name', c.name)
        rec.set('email', c.email)
        rec.set('phone', c.phone)
        rec.set('company', c.company)
        rec.set('raw_role', c.raw_role)
        rec.set('rsvp', c.rsvp)
        rec.set('has_degree', c.has_degree)
        rec.set('classification_status', c.classification_status)
        rec.set('role_category', c.role_category)
        rec.set('priority', c.priority)
        rec.set('interests', c.interests)
        rec.set('demands', c.demands)
        rec.set('profile_summary', c.profile_summary)
        rec.set('suggested_message', c.suggested_message)
        rec.set('last_classified_at', new Date().toISOString())
        app.save(rec)
      }
    }
  },
  (app) => {
    // down migration
  },
)
