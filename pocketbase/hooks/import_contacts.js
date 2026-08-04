routerAdd(
  'POST',
  '/backend/v1/import-contacts',
  (e) => {
    const body = e.requestInfo().body || {}
    const eventId = body.event_id || body.eventId || ''
    const contacts = body.contacts || []
    const allowDuplicates = body.allow_duplicates || body.allowDuplicates || false
    const userId = e.auth?.id

    if (!userId) return e.unauthorizedError('Autenticação necessária')
    if (!eventId) return e.badRequestError('event_id é obrigatório')

    const col = $app.findCollectionByNameOrId('mailing_contacts')
    let imported = 0
    let skipped = 0
    const errors = []
    const importedIds = []

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      const rowNum = i + 2

      if (!c.name || !c.email) {
        errors.push({ row: rowNum, reason: 'Nome e e-mail são obrigatórios' })
        continue
      }

      if (!allowDuplicates) {
        try {
          const existing = $app.findFirstRecordByFilter(
            'mailing_contacts',
            'event = {:eventId} && email = {:email}',
            eventId,
            c.email,
          )
          skipped++
          continue
        } catch (_) {}
      }

      try {
        const record = new Record(col)
        record.set('event', eventId)
        record.set('name', c.name)
        record.set('email', c.email)
        if (c.phone) record.set('phone', c.phone)
        if (c.company) record.set('company', c.company)
        if (c.raw_role) record.set('raw_role', c.raw_role)
        if (c.cnpj) record.set('cnpj', c.cnpj)
        if (c.rsvp) record.set('rsvp', c.rsvp)
        if (c.has_degree) record.set('has_degree', c.has_degree)
        if (c.notes) record.set('notes', c.notes)
        record.set('classification_status', 'Pendente')
        record.set('rsvp', c.rsvp || 'Aguardando')
        record.set('owner', userId)

        $app.save(record)
        imported++
        importedIds.push(record.id)
      } catch (err) {
        errors.push({ row: rowNum, reason: String(err.message || err) })
      }
    }

    return e.json(200, {
      imported: imported,
      skipped: skipped,
      errors: errors,
      imported_ids: importedIds,
    })
  },
  $apis.requireAuth(),
)
