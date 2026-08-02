migrate(
  (app) => {
    const eventsCol = app.findCollectionByNameOrId('events')
    const contactsCol = app.findCollectionByNameOrId('mailing_contacts')

    const blocked = new Collection({
      name: 'blocked_contacts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contact',
          type: 'relation',
          required: false,
          collectionId: contactsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'event',
          type: 'relation',
          required: false,
          collectionId: eventsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'name', type: 'text' },
        { name: 'email', type: 'text', required: true },
        {
          name: 'reason',
          type: 'select',
          values: ['Reclamação', 'Descadastro', 'Bounce', 'Manual'],
          maxSelect: 1,
        },
        {
          name: 'source',
          type: 'select',
          values: ['link_descadastro', 'formulario', 'provedor', 'manual'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'blocked_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_blocked_contacts_email ON blocked_contacts (email) WHERE email != ""',
        'CREATE INDEX idx_blocked_contacts_reason ON blocked_contacts (reason)',
        'CREATE INDEX idx_blocked_contacts_event ON blocked_contacts (event)',
        'CREATE INDEX idx_blocked_contacts_blocked_at ON blocked_contacts (blocked_at)',
      ],
    })
    app.save(blocked)

    var templates = []
    try {
      templates = app.findRecordsByFilter('email_templates', '', '-created', 100, 0)
    } catch (_) {}

    var unsubBlock =
      '\n\n---\nCancelamento de recebimento de e-mails\n\nVocê está recebendo este e-mail porque se cadastrou ou participou de um evento nosso. Caso não deseje mais receber nossas comunicações, você pode cancelar o recebimento a qualquer momento, de forma simples e gratuita.\n\nCancelar meu recebimento: {link_descadastro}'

    for (var t = 0; t < templates.length; t++) {
      var tmpl = templates[t]
      var body = tmpl.getString('body_template')
      if (body.indexOf('Cancelamento de recebimento') === -1) {
        tmpl.set('body_template', body + unsubBlock)
        app.save(tmpl)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('blocked_contacts'))
    } catch (_) {}
  },
)
