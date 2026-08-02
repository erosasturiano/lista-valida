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

    var apiKey = $secrets.get('RESEND_API_KEY') || ''
    if (!apiKey) {
      return e.badRequestError(
        'RESEND_API_KEY não configurada. Acesse Configurações de Domínio para instruções de como obter e configurar a chave do Resend.',
      )
    }

    var senderName = campaign.getString('sender_name') || ''
    var senderEmail = campaign.getString('sender_email') || ''
    if (!senderEmail) {
      return e.badRequestError(
        'Remetente (sender_email) não configurado na campanha. Edite a campanha e defina um e-mail remetente com domínio verificado no Resend (ex: contato@seudominio.com.br). Acesse Configurações de Domínio para verificar o domínio.',
      )
    }

    var fromField = senderName ? senderName + ' <' + senderEmail + '>' : senderEmail

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

    var baseUrl = $secrets.get('PB_INSTANCE_URL') || ''
    if (!baseUrl) {
      var proto = e.request.header.get('X-Forwarded-Proto') || 'https'
      baseUrl = proto + '://' + e.request.host
    }
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

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

      if (!email) {
        failed++
        continue
      }

      const subject = subjectTemplate
        .replace(/\{nome\}/g, name)
        .replace(/\{empresa\}/g, company)
        .replace(/\{cargo\}/g, role)

      const body = bodyTemplate
        .replace(/\{nome\}/g, name)
        .replace(/\{empresa\}/g, company)
        .replace(/\{cargo\}/g, role)
        .replace(/\{mensagem_ia\}/g, suggestedMsg)

      var htmlBody = body.replace(/\n/g, '<br>\n')

      var log = new Record(logsCol)
      log.set('campaign', campaignId)
      log.set('contact', contact.id)
      log.set('recipient_email', email)
      log.set('recipient_name', name)
      log.set('subject', subject)
      log.set('click_count', 0)
      $app.save(log)

      var trackClickBase = baseUrl + '/backend/v1/track-click/' + log.id + '?url='
      var trackedBody = htmlBody.replace(
        /href=["'](https?:\/\/[^"']+)["']/gi,
        function (match, url) {
          return 'href="' + trackClickBase + encodeURIComponent(url) + '"'
        },
      )
      var pixelUrl = baseUrl + '/backend/v1/track-open/' + log.id
      trackedBody +=
        '<img src="' + pixelUrl + '" width="1" height="1" alt="" style="display:none;" />'

      try {
        var res = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromField,
            to: [email],
            subject: subject,
            html: trackedBody,
          }),
          timeout: 30,
        })

        if (res.statusCode >= 200 && res.statusCode < 300) {
          log.set('body', trackedBody)
          log.set('status', 'enviado')
          log.set('sent_at', new Date().toISOString())
          $app.save(log)
          sent++
        } else {
          var errMsg = 'Resend API error (HTTP ' + res.statusCode + ')'
          try {
            if (res.json) {
              if (res.json.message) {
                errMsg = String(res.json.message)
              } else if (res.json.error) {
                errMsg = String(res.json.error)
              }
            }
          } catch (_) {}
          var lowerErrMsg = errMsg.toLowerCase()
          if (
            res.statusCode === 401 ||
            res.statusCode === 403 ||
            lowerErrMsg.indexOf('api key') !== -1 ||
            lowerErrMsg.indexOf('unauthorized') !== -1 ||
            lowerErrMsg.indexOf('authentication') !== -1
          ) {
            errMsg +=
              ' — A chave RESEND_API_KEY está ausente ou inválida. Acesse Configurações de Domínio para verificar.'
          } else if (
            lowerErrMsg.indexOf('verify') !== -1 ||
            lowerErrMsg.indexOf('domain') !== -1 ||
            lowerMsg.indexOf('dominio') !== -1 ||
            lowerErrMsg.indexOf('sender') !== -1 ||
            lowerErrMsg.indexOf('not allowed') !== -1
          ) {
            errMsg +=
              ' — O remetente (sender_email) ou domínio não está verificado no Resend. Acesse Configurações de Domínio para instruções.'
          } else if (res.statusCode === 429) {
            errMsg +=
              ' — Limite de envio atingido (rate limit). Aguarde alguns minutos e tente novamente.'
          }
          log.set('body', trackedBody)
          log.set('status', 'falhou')
          log.set('error_message', errMsg)
          $app.save(log)
          failed++
        }
      } catch (sendErr) {
        var transportErr = 'Erro de conexão com Resend: ' + String(sendErr.message || sendErr)
        log.set('body', trackedBody)
        log.set('status', 'falhou')
        log.set('error_message', transportErr)
        $app.save(log)
        failed++
      }
    }

    campaign.set('status', failed > 0 ? 'parcialmente_falhou' : 'enviado')
    campaign.set('total_sent', sent)
    campaign.set('total_failed', failed)
    $app.save(campaign)

    var resultSummary = { sent: sent, failed: failed, total: filteredContacts.length }
    if (failed > 0 && sent === 0) {
      var firstError = ''
      for (var j = 0; j < filteredContacts.length; j++) {
        try {
          var errLog = $app.findRecordsByFilter(
            'email_logs',
            'campaign = "' + campaignId + '" && status = "falhou"',
            '-created',
            1,
            0,
          )
          if (errLog.length > 0) {
            firstError = errLog[0].getString('error_message') || ''
            break
          }
        } catch (_) {}
      }
      if (firstError) {
        resultSummary.first_error = firstError
      }
    }
    return e.json(200, resultSummary)
  },
  $apis.requireAuth(),
)
