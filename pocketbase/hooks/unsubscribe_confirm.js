routerAdd('POST', '/backend/v1/unsubscribe/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  if (!logId) return e.badRequestError('Link inválido')

  const body = e.requestInfo().body || {}

  let log
  try {
    log = $app.findRecordById('email_logs', logId)
  } catch (_) {
    return e.notFoundError('Link de descadastro inválido ou expirado.')
  }

  const email = log.getString('recipient_email')
  if (!email) return e.badRequestError('E-mail não encontrado.')

  const blockedCol = $app.findCollectionByNameOrId('blocked_contacts')

  let existing = null
  try {
    existing = $app.findFirstRecordByData('blocked_contacts', 'email', email)
  } catch (_) {}

  if (existing) {
    existing.set('reason', 'Descadastro')
    existing.set('source', 'link_descadastro')
    if (body.reason) existing.set('notes', body.reason)
    existing.set('blocked_at', new Date().toISOString())
    $app.save(existing)
  } else {
    const record = new Record(blockedCol)
    record.set('email', email)
    record.set('name', log.getString('recipient_name') || '')
    record.set('reason', 'Descadastro')
    record.set('source', 'link_descadastro')
    if (body.reason) record.set('notes', body.reason)
    record.set('blocked_at', new Date().toISOString())

    const contactId = log.getString('contact')
    if (contactId) {
      try {
        const contact = $app.findRecordById('mailing_contacts', contactId)
        record.set('contact', contactId)
        const eventId = contact.getString('event')
        if (eventId) record.set('event', eventId)
      } catch (_) {}
    }

    if (!record.getString('event')) {
      const campaignId = log.getString('campaign')
      if (campaignId) {
        try {
          const campaign = $app.findRecordById('email_campaigns', campaignId)
          const eventId = campaign.getString('event')
          if (eventId) record.set('event', eventId)
        } catch (_) {}
      }
    }

    $app.save(record)
  }

  return e.json(200, { success: true })
})
