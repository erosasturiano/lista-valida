routerAdd(
  'POST',
  '/backend/v1/send-campaign/{id}',
  (e) => {
    const id = e.request.pathValue('id')
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    let campaign
    try {
      campaign = $app.findRecordById('email_campaigns', id)
    } catch (_) {
      return e.notFoundError('Campanha não encontrada')
    }

    if (campaign.getString('owner') !== userId && e.auth?.getString('role') !== 'admin') {
      return e.forbiddenError('Acesso negado')
    }

    campaign.set('status', 'enviando')
    $app.save(campaign)

    const eventId = campaign.getString('event')
    const filters = ['event = "' + eventId + '"']
    const frsvp = campaign.getString('filter_rsvp')
    if (frsvp && frsvp !== 'todos') filters.push('rsvp = "' + frsvp + '"')
    const fpri = campaign.getString('filter_priority')
    if (fpri && fpri !== 'todas') filters.push('priority = "' + fpri + '"')
    const fcat = campaign.getString('filter_category')
    if (fcat && fcat !== 'todas') filters.push('role_category = "' + fcat + '"')

    let contacts = []
    try {
      contacts = $app.findRecordsByFilter(
        'mailing_contacts',
        filters.join(' && '),
        '-created',
        0,
        0,
      )
    } catch (_) {}

    const blocked = new Set()
    try {
      const bl = $app.findRecordsByFilter('blocked_contacts', 'owner = "' + userId + '"', '', 0, 0)
      for (const b of bl) blocked.add(b.getString('email').toLowerCase())
    } catch (_) {}

    const logCol = $app.findCollectionByNameOrId('email_logs')
    const pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
    const siteUrl = $secrets.get('SITE_URL') || ''
    const apiKey = $secrets.get('RESEND_API_KEY') || ''
    const senderName =
      campaign.getString('sender_name') || e.auth.getString('sender_name') || 'Lista Válida'
    const senderEmail =
      campaign.getString('sender_email') ||
      e.auth.getString('sender_email') ||
      'noreply@listavalida.com.br'
    const subject = campaign.getString('subject')
    const template = campaign.getString('body_template')
    let sent = 0,
      failed = 0

    for (const c of contacts) {
      const email = c.getString('email')
      if (blocked.has(email.toLowerCase())) continue
      const name = c.getString('name')
      const company = c.getString('company')
      let body = template
        .replace(/\{\{nome\}\}/g, name)
        .replace(/\{\{email\}\}/g, email)
        .replace(/\{\{empresa\}\}/g, company)

      const log = new Record(logCol)
      log.set('campaign', id)
      log.set('contact', c.id)
      log.set('recipient_email', email)
      log.set('recipient_name', name)
      log.set('subject', subject)
      log.set('body', body)
      log.set('status', 'enviado')
      log.set('owner', userId)
      $app.save(log)

      const trackedBody =
        body +
        '<img src="' +
        pbUrl +
        '/backend/v1/track-open/' +
        log.id +
        '" width="1" height="1" style="display:none"/>' +
        '<p style="margin-top:20px;font-size:11px;color:#999;"><a href="' +
        siteUrl +
        '/descadastrar/' +
        log.id +
        '">Descadastrar</a></p>'

      try {
        const res = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
          body: JSON.stringify({
            from: senderName + ' <' + senderEmail + '>',
            to: email,
            subject: subject,
            html: trackedBody,
          }),
          timeout: 30,
        })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          log.set('sent_at', new Date().toISOString())
          sent++
        } else {
          log.set('status', 'falhou')
          log.set('error_message', 'HTTP ' + res.statusCode)
          failed++
        }
      } catch (err) {
        log.set('status', 'falhou')
        log.set('error_message', String(err.message || err))
        failed++
      }
      $app.save(log)
    }

    campaign.set('status', failed > 0 ? 'parcialmente_falhou' : 'enviado')
    campaign.set('total_sent', sent)
    campaign.set('total_failed', failed)
    $app.save(campaign)

    return e.json(200, { sent: sent, failed: failed, total: sent + failed })
  },
  $apis.requireAuth(),
)
