migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('email_templates')

    var seedTemplates = [
      {
        name: 'Confirmação de Presença - RSVP',
        category: 'RSVP',
        sender_name: 'Equipe do Evento',
        sender_email: 'eventos@exemplo.com',
        subject: '{nome}, confirme sua presença no evento!',
        body_template:
          'Olá {nome},\n\nAgradecemos seu interesse em participar do nosso evento. Como {cargo} da {empresa}, sua presença será muito importante para enriquecer as discussões.\n\nPor favor, confirme sua presença acessando o link: {link_evento}\n\nEstamos ansiosos para recebê-lo(a)!\n\nAtenciosamente,\nEquipe do Evento',
      },
      {
        name: 'Envio de Certificado de Participação',
        category: 'Envio de Certificado',
        sender_name: 'Equipe do Evento',
        sender_email: 'certificados@exemplo.com',
        subject: 'Seu certificado de participação, {nome}!',
        body_template:
          'Olá {nome},\n\nÉ com grande satisfação que enviamos seu certificado de participação em nosso evento. Sua contribuição como {cargo} na {empresa} foi fundamental para o sucesso do encontro.\n\nVocê pode baixar seu certificado através do link: {link_evento}\n\nEsperamos vê-lo(a) em futuros eventos!\n\nAtenciosamente,\nEquipe do Evento',
      },
      {
        name: 'Convite Oficial para Evento',
        category: 'Convite',
        sender_name: 'Equipe do Evento',
        sender_email: 'convites@exemplo.com',
        subject: 'Convite especial: {nome}, você é nosso convidado',
        body_template:
          'Prezado(a) {nome},\n\nTemos a honra de convidá-lo(a), na qualidade de {cargo} da {empresa}, para participar do nosso próximo evento.\n\nO evento reunirá líderes e especialistas para um dia de networking e conhecimento. Todos os detalhes estão disponíveis em: {link_evento}\n\nConfirmamos sua presença?\n\nAtenciosamente,\nEquipe do Evento',
      },
      {
        name: 'Pitch - Apresentação de Oportunidade',
        category: 'Pitch',
        sender_name: 'Equipe do Evento',
        sender_email: 'oportunidades@exemplo.com',
        subject: 'Uma oportunidade única para {empresa}, {nome}',
        body_template:
          'Olá {nome},\n\nGostaríamos de apresentar uma oportunidade estratégica para a {empresa}. Como {cargo}, acreditamos que sua visão será essencial para avaliarmos esta proposta.\n\nPreparamos um pitch completo que demonstra os benefícios e o potencial de impacto. Acesse e conheça: {link_evento}\n\nFicamos à disposição para uma conversa mais detalhada.\n\nAtenciosamente,\nEquipe do Evento',
      },
      {
        name: 'Convite para Comunidade Exclusiva',
        category: 'Convite para Comunidade Exclusiva',
        sender_name: 'Comunidade Exclusiva',
        sender_email: 'comunidade@exemplo.com',
        subject: '{nome}, você foi selecionado(a) para nossa comunidade exclusiva',
        body_template:
          'Olá {nome},\n\nÉ com entusiasmo que convidamos você, na sua condição de {cargo} da {empresa}, para integrar nossa comunidade exclusiva de profissionais de elite.\n\nComo membro, você terá acesso a conteúdos premium, eventos privativos e networking com líderes do setor.\n\nPara aceitar o convite e ativar sua participação, acesse: {link_evento}\n\nBem-vindo(a) à comunidade!\n\nAtenciosamente,\nEquipe da Comunidade Exclusiva',
      },
    ]

    for (var i = 0; i < seedTemplates.length; i++) {
      var t = seedTemplates[i]
      try {
        app.findFirstRecordByData('email_templates', 'name', t.name)
      } catch (_) {
        var rec = new Record(col)
        rec.set('name', t.name)
        rec.set('category', t.category)
        rec.set('sender_name', t.sender_name)
        rec.set('sender_email', t.sender_email)
        rec.set('subject', t.subject)
        rec.set('body_template', t.body_template)
        app.save(rec)
      }
    }
  },
  (app) => {},
)
