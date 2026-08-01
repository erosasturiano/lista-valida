migrate(
  (app) => {
    const events = new Collection({
      name: 'events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'event_date', type: 'date' },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_events_created ON events (created DESC)'],
    })
    app.save(events)

    const contacts = new Collection({
      name: 'mailing_contacts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'event',
          type: 'relation',
          required: true,
          collectionId: events.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        { name: 'phone', type: 'text' },
        { name: 'company', type: 'text' },
        { name: 'raw_role', type: 'text' },
        {
          name: 'rsvp',
          type: 'select',
          values: ['Aguardando', 'Confirmou', 'Recusou'],
          maxSelect: 1,
        },
        { name: 'has_degree', type: 'select', values: ['Sim', 'Não'], maxSelect: 1 },
        {
          name: 'classification_status',
          type: 'select',
          values: ['Pendente', 'Classificado', 'Revisado'],
          maxSelect: 1,
        },
        {
          name: 'role_category',
          type: 'select',
          values: [
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
        { name: 'priority', type: 'select', values: ['Alta', 'Média', 'Baixa'], maxSelect: 1 },
        { name: 'interests', type: 'json' },
        { name: 'demands', type: 'json' },
        { name: 'profile_summary', type: 'text' },
        { name: 'suggested_message', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'last_classified_at', type: 'date' },
        { name: 'search_embedding', type: 'vector', dimensions: 1536, distance: 'cosine' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mailing_contacts_event ON mailing_contacts (event)',
        'CREATE INDEX idx_mailing_contacts_rsvp ON mailing_contacts (rsvp)',
        'CREATE INDEX idx_mailing_contacts_status ON mailing_contacts (classification_status)',
        'CREATE INDEX idx_mailing_contacts_category ON mailing_contacts (role_category)',
        'CREATE INDEX idx_mailing_contacts_created ON mailing_contacts (created DESC)',
      ],
    })
    app.save(contacts)
  },
  (app) => {
    try {
      const contacts = app.findCollectionByNameOrId('mailing_contacts')
      app.delete(contacts)
    } catch (_) {}
    try {
      const events = app.findCollectionByNameOrId('events')
      app.delete(events)
    } catch (_) {}
  },
)
