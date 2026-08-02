routerAdd(
  'POST',
  '/backend/v1/import-contacts',
  (e) => {
    const body = e.requestInfo().body || {}
    const eventId = body.event_id
    const contacts = body.contacts
    const allowDuplicates = !!body.allow_duplicates

    if (!eventId) return e.badRequestError('ID do evento é obrigatório')
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return e.badRequestError('Nenhum contato enviado para importação')
    }

    const contactsCol = $app.findCollectionByNameOrId('mailing_contacts')
    var auth = e.requestInfo().auth
    var authId = auth ? auth.id : ''
    let imported = 0
    let skipped = 0
    const errors = []
    const importedIds = []
    const seenEmails = new Set()

    for (let i = 0; i < contacts.length; i++) {
      const item = contacts[i]
      const rowNum = i + 1
      const name = (item.name || '').trim()
      const email = (item.email || '').trim().toLowerCase()

      if (!name) {
        errors.push({ row: rowNum, reason: 'Nome do participante ausente' })
        continue
      }
      if (!email || !email.includes('@')) {
        errors.push({ row: rowNum, reason: 'Endereço de e-mail inválido ou ausente' })
        continue
      }

      if (seenEmails.has(email) && !allowDuplicates) {
        skipped++
        continue
      }
      seenEmails.add(email)

      if (!allowDuplicates) {
        try {
          const existing = $app.findFirstRecordByFilter(
            'mailing_contacts',
            'event = {:event} && email = {:email}',
            { event: eventId, email: email },
          )
          if (existing) {
            skipped++
            continue
          }
        } catch (_) {}
      }

      try {
        const rec = new Record(contactsCol)
        rec.set('event', eventId)
        rec.set('name', name)
        rec.set('email', email)
        rec.set('phone', (item.phone || '').trim())
        rec.set('company', (item.company || '').trim())
        rec.set('raw_role', (item.raw_role || '').trim())

        const rsvpInput = (item.rsvp || '').trim().toLowerCase()
        let rsvpVal = 'Aguardando'
        if (rsvpInput.includes('confirm')) rsvpVal = 'Confirmou'
        else if (rsvpInput.includes('recus')) rsvpVal = 'Recusou'
        rec.set('rsvp', rsvpVal)

        const degreeInput = (item.has_degree || '').trim().toLowerCase()
        let degreeVal = degreeInput.startsWith('s')
          ? 'Sim'
          : degreeInput.startsWith('n')
            ? 'Não'
            : ''
        if (degreeVal) rec.set('has_degree', degreeVal)

        rec.set('classification_status', 'Pendente')
        rec.set('priority', 'Média')
        if (authId) rec.set('owner', authId)

        $app.save(rec)
        importedIds.push(rec.id)
        imported++
      } catch (err) {
        errors.push({ row: rowNum, reason: err.message || 'Erro ao salvar contato no banco' })
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
