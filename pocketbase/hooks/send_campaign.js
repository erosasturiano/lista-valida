routerAdd(
  'POST',
  '/backend/v1/campaigns/{id}/send',
  (e) => {
    const campaignId = e.request.pathValue('id')
    if (!campaignId) return e.badRequestError('ID da campanha é obrigatório')

    let campaign
    try {
      campaign = $app.findRecordById('email_campaigns', campaignId)
    } catch (_) {
      return e.notFoundError('Campanha não encontrada')
    }

    if (campaign.getString('status') === 'enviando') {
      return e.badRequestError('Campanha já está em processo de envio')
    }

    const eventId = campaign.getString('event')
    const subjectTemplate = campaign.getString('subject')
    const bodyTemplate = campaign.getString('body_template')
    const filterRsvp = campaign.getString('filter_rsvp')
    const filterPriority = campaign.getString('filter_priority')
    const filterCategory = campaign.getString('filter_category')

    const filterStr = 'event = "' + eventId + '"'
    let contacts = []
    try {
      contacts = $app.findRecordsByFilter('mailing_contacts', filterStr, '-created', 500, 0)
    } catch (_) {}

    const filteredContacts = contacts.filter(function (c) {
      if (filterRsvp && filterRsvp !== 'todos' && c.getString('rsvp') !== filterRsvp) return false
      if (
        filterPriority &&
        filterPriority !== 'todas' &&
        c.getString('priority') !== filterPriority
      )
        return false
      if (
        filterCategory &&
        filterCategory !== 'todas' &&
        c.getString('role_category') !== filterCategory
      )
        return false
      return true
    })

    const logsCol = $app.findCollectionByNameOrId('email_logs')

    campaign.set('status', 'enviando')
    $app.save(campaign)

    let sent = 0
    let failed = 0

    for (let i = 0; i < filteredContacts.length; i++) {
      const contact = filteredContacts[i]
      const name = contact.getString('name')
      const email = contact.getString('email')
      const company = contact.getString('company') || ''
      const role = contact.getString('raw_role') || ''
      const suggestedMsg = contact.getString('suggested_message') || ''

      const subject = subjectTemplate
        .replace(/\{nome\}/g, name)
        .replace(/\{empresa\}/g, company)
        .replace(/\{cargo\}/g, role)

      const body = bodyTemplate
        .replace(/\{nome\}/g, name)
        .replace(/\{empresa\}/g, company)
        .replace(/\{cargo\}/g, role)
        .replace(/\{mensagem_ia\}/g, suggestedMsg)

      try {
        var log = new Record(logsCol)
        log.set('campaign', campaignId)
        log.set('contact', contact.id)
        log.set('recipient_email', email)
        log.set('recipient_name', name)
        log.set('subject', subject)
        log.set('body', body)
        log.set('status', 'enviado')
        log.set('sent_at', new Date().toISOString())
        $app.save(log)
        sent++
      } catch (err) {
        var log = new Record(logsCol)
        log.set('campaign', campaignId)
        log.set('contact', contact.id)
        log.set('recipient_email', email)
        log.set('recipient_name', name)
        log.set('subject', subject)
        log.set('body', body)
        log.set('status', 'falhou')
        log.set('error_message', String(err.message || err))
        $app.save(log)
        failed++
      }
    }

    campaign.set('status', failed > 0 ? 'parcialmente_falhou' : 'enviado')
    campaign.set('total_sent', sent)
    campaign.set('total_failed', failed)
    $app.save(campaign)

    return e.json(200, { sent: sent, failed: failed, total: filteredContacts.length })
  },
  $apis.requireAuth(),
)
