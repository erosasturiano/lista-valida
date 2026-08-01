migrate(
  (app) => {
    const eventsCol = app.findCollectionByNameOrId('events')
    const contactsCol = app.findCollectionByNameOrId('mailing_contacts')

    const campaigns = new Collection({
      name: 'email_campaigns',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'event',
          type: 'relation',
          required: true,
          collectionId: eventsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'subject', type: 'text', required: true },
        { name: 'body_template', type: 'text', required: true },
        { name: 'sender_name', type: 'text' },
        { name: 'sender_email', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['rascunho', 'enviando', 'enviado', 'parcialmente_falhou'],
          maxSelect: 1,
        },
        {
          name: 'filter_rsvp',
          type: 'select',
          values: ['todos', 'Confirmou', 'Aguardando', 'Recusou'],
          maxSelect: 1,
        },
        {
          name: 'filter_priority',
          type: 'select',
          values: ['todas', 'Alta', 'Média', 'Baixa'],
          maxSelect: 1,
        },
        {
          name: 'filter_category',
          type: 'select',
          values: [
            'todas',
            'C-Level',
            'Diretoria',
            'Gerência',
            'Coordenação',
            'Analista',
            'Assistente/Auxiliar',
            'Estagiário',
            'Consultor/Autônomo',
            'Outro',
          ],
          maxSelect: 1,
        },
        { name: 'total_sent', type: 'number', onlyInt: true },
        { name: 'total_failed', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_email_campaigns_event ON email_campaigns (event)',
        'CREATE INDEX idx_email_campaigns_status ON email_campaigns (status)',
      ],
    })
    app.save(campaigns)

    const logs = new Collection({
      name: 'email_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'campaign',
          type: 'relation',
          required: true,
          collectionId: campaigns.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'contact',
          type: 'relation',
          required: false,
          collectionId: contactsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'recipient_email', type: 'text', required: true },
        { name: 'recipient_name', type: 'text' },
        { name: 'subject', type: 'text' },
        { name: 'body', type: 'text' },
        { name: 'status', type: 'select', values: ['enviado', 'falhou'], maxSelect: 1 },
        { name: 'error_message', type: 'text' },
        { name: 'sent_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_email_logs_campaign ON email_logs (campaign)',
        'CREATE INDEX idx_email_logs_status ON email_logs (status)',
      ],
    })
    app.save(logs)

    try {
      const event = app.findFirstRecordByData('events', 'name', 'Evento DHO')
      const cCol = app.findCollectionByNameOrId('email_campaigns')
      const c = new Record(cCol)
      c.set('name', 'Convite Evento DHO - Lote 1')
      c.set('event', event.id)
      c.set('subject', 'Convite especial: {nome}, sua presença no Evento DHO')
      c.set(
        'body_template',
        'Olá {nome},\n\n{mensagem_ia}\n\nConfirme sua presença!\n\nAbraços,\nEquipe Evento DHO',
      )
      c.set('sender_name', 'Equipe Evento DHO')
      c.set('sender_email', 'contato@eventodho.com.br')
      c.set('status', 'rascunho')
      c.set('filter_rsvp', 'todos')
      c.set('filter_priority', 'todas')
      c.set('filter_category', 'todas')
      c.set('total_sent', 0)
      c.set('total_failed', 0)
      app.save(c)
    } catch (_) {}
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('email_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('email_campaigns'))
    } catch (_) {}
  },
)
