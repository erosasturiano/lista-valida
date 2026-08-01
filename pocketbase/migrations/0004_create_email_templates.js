migrate(
  (app) => {
    const templates = new Collection({
      name: 'email_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'RSVP',
            'Envio de Certificado',
            'Convite',
            'Pitch',
            'Convite para Comunidade Exclusiva',
          ],
          maxSelect: 1,
        },
        { name: 'sender_name', type: 'text' },
        { name: 'sender_email', type: 'text' },
        { name: 'subject', type: 'text', required: true },
        { name: 'body_template', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_email_templates_category ON email_templates (category)',
        'CREATE INDEX idx_email_templates_created ON email_templates (created DESC)',
      ],
    })
    app.save(templates)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('email_templates'))
    } catch (_) {}
  },
)
