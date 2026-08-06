routerAdd('POST', '/backend/v1/unsubscribe/{logId}', (e) => {
  const logId = e.request.pathValue('logId')

  let log
  try {
    log = $app.findRecordById('email_logs', logId)
  } catch (_) {
    return e.notFoundError('Registro não encontrado')
  }

  const email = log.getString('recipient_email')
  const name = log.getString('recipient_name')
  const userId = log.getString('owner')

  const col = $app.findCollectionByNameOrId('blocked_contacts')
  try {
    $app.findFirstRecordByFilter(
      'blocked_contacts',
      'email = {:email} && owner = {:owner}',
      email,
      userId,
    )
  } catch (_) {
    const blocked = new Record(col)
    blocked.set('email', email)
    blocked.set('name', name)
    blocked.set('reason', 'Descadastro')
    blocked.set('source', 'link_descadastro')
    blocked.set('blocked_at', new Date().toISOString())
    if (userId) blocked.set('owner', userId)

    try {
      const contact = $app.findRecordById('mailing_contacts', log.getString('contact'))
      blocked.set('contact', contact.id)
      blocked.set('event', contact.getString('event'))
    } catch (_) {}

    try {
      const camp = $app.findRecordById('email_campaigns', log.getString('campaign'))
      blocked.set('event', camp.getString('event'))
    } catch (_) {}

    $app.save(blocked)
  }

  return e.json(200, { success: true, message: 'Descadastro confirmado com sucesso.' })
})
