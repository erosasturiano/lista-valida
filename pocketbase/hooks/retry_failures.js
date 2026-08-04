routerAdd(
  'POST',
  '/backend/v1/retry-failures/{id}',
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

    let failedLogs = []
    try {
      failedLogs = $app.findRecordsByFilter(
        'email_logs',
        'campaign = "' + id + '" && status = "falhou"',
        '-created',
        0,
        0,
      )
    } catch (_) {}

    const apiKey = $secrets.get('RESEND_API_KEY') || ''
    const pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
    const senderName =
      campaign.getString('sender_name') || e.auth.getString('sender_name') || 'Lista Válida'
    const senderEmail =
      campaign.getString('sender_email') ||
      e.auth.getString('sender_email') ||
      'noreply@listavalida.com.br'
    const subject = campaign.getString('subject')
    let retried = 0,
      stillFailed = 0

    for (const log of failedLogs) {
      let body = log.getString('body')
      body +=
        '<img src="' +
        pbUrl +
        '/backend/v1/track-open/' +
        log.id +
        '" width="1" height="1" style="display:none"/>'

      try {
        const res = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
          body: JSON.stringify({
            from: senderName + ' <' + senderEmail + '>',
            to: log.getString('recipient_email'),
            subject: subject,
            html: body,
          }),
          timeout: 30,
        })
        if (res.statusCode >= 200 && res.statusCode < 300) {
          log.set('status', 'enviado')
          log.set('sent_at', new Date().toISOString())
          log.set('error_message', '')
          retried++
        } else {
          log.set('error_message', 'HTTP ' + res.statusCode + ' (retry)')
          stillFailed++
        }
      } catch (err) {
        log.set('error_message', String(err.message || err) + ' (retry)')
        stillFailed++
      }
      $app.save(log)
    }

    const totalSent = (campaign.getInt('total_sent') || 0) + retried
    campaign.set('total_sent', totalSent)
    campaign.set('total_failed', stillFailed)
    campaign.set('status', stillFailed > 0 ? 'parcialmente_falhou' : 'enviado')
    $app.save(campaign)

    return e.json(200, { retried: retried, stillFailed: stillFailed })
  },
  $apis.requireAuth(),
)
