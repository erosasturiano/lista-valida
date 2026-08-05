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

    let eventRecord
    try {
      eventRecord = $app.findRecordById('events', eventId)
    } catch (_) {
      return e.badRequestError('Mailing (lista) não encontrado')
    }

    if (eventRecord.getString('owner') !== userId && e.auth?.getString('role') !== 'admin') {
      return e.forbiddenError('Acesso negado a este mailing')
    }

    const col = $app.findCollectionByNameOrId('mailing_contacts')
    let imported = 0
    let skipped = 0
    let blocked = 0
    const errors = []
    const importedIds = []

    const validRsvp = ['Aguardando', 'Confirmou', 'Recusou']
    const validDegree = ['Sim', 'Não']

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i]
      const rowNum = i + 2

      if (!c.name || !String(c.name).trim()) {
        errors.push({ row: rowNum, reason: 'Nome é obrigatório' })
        continue
      }
      if (!c.email || !String(c.email).trim()) {
        errors.push({ row: rowNum, reason: 'E-mail é obrigatório' })
        continue
      }

      const emailStr = String(c.email).trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        errors.push({ row: rowNum, reason: 'E-mail inválido: ' + emailStr })
        continue
      }

      try {
        $app.findFirstRecordByFilter('blocked_contacts', 'email = {:email} && owner = {:ownerId}', {
          email: emailStr,
          ownerId: userId,
        })
        blocked++
        continue
      } catch (_) {}

      if (!allowDuplicates) {
        try {
          $app.findFirstRecordByFilter(
            'mailing_contacts',
            'event = {:eventId} && email = {:email}',
            { eventId: eventId, email: emailStr },
          )
          skipped++
          continue
        } catch (_) {}
      }

      try {
        const record = new Record(col)
        record.set('event', eventId)
        record.set('name', String(c.name).trim())
        record.set('email', emailStr)
        if (c.phone) record.set('phone', String(c.phone).trim())
        if (c.company) record.set('company', String(c.company).trim())
        if (c.raw_role) record.set('raw_role', String(c.raw_role).trim())
        if (c.cnpj) record.set('cnpj', String(c.cnpj).trim())

        const rsvpVal = c.rsvp && validRsvp.indexOf(c.rsvp) >= 0 ? c.rsvp : 'Aguardando'
        record.set('rsvp', rsvpVal)

        if (c.has_degree && validDegree.indexOf(c.has_degree) >= 0) {
          record.set('has_degree', c.has_degree)
        }

        if (c.notes) record.set('notes', String(c.notes).trim())
        record.set('classification_status', 'Pendente')
        record.set('owner', userId)

        $app.save(record)
        imported++
        importedIds.push(record.id)
      } catch (err) {
        let reason = 'Erro ao salvar registro'
        if (err && err.message) {
          reason = String(err.message)
        } else if (typeof err === 'string') {
          reason = err
        } else {
          reason = String(err)
        }
        errors.push({ row: rowNum, reason: reason })
      }
    }

    return e.json(200, {
      imported: imported,
      skipped: skipped,
      blocked: blocked,
      errors: errors,
      imported_ids: importedIds,
    })
  },
  $apis.requireAuth(),
)
