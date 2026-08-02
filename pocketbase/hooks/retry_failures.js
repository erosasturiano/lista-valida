routerAdd(
  'POST',
  '/backend/v1/campaigns/{id}/retry-failures',
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
    var senderName = campaign.getString('sender_name') || ''
    var senderEmail = campaign.getString('sender_email') || ''
    var fromField = senderName ? senderName + ' <' + senderEmail + '>' : senderEmail

    var owner = campaign.getString('owner')
    const subjectTemplate = campaign.getString('subject')
    const bodyTemplate = campaign.getString('body_template')

    let failedLogs = []
    try {
      failedLogs = $app.findRecordsByFilter(
        'email_logs',
        'campaign = "' + campaignId + '" && status = "falhou"',
        '-created',
        500,
        0,
      )
    } catch (_) {}

    var blockedEmails = {}
    try {
      var blockedFilter = owner ? 'owner = "' + owner + '"' : ''
      var blockedRecords = $app.findRecordsByFilter(
        'blocked_contacts',
        blockedFilter,
        '-created',
        500,
        0,
      )
      for (var b = 0; b < blockedRecords.length; b++) {
        blockedEmails[blockedRecords[b].getString('email').toLowerCase()] = true
      }
    } catch (_) {}

    var ignoredBlocked = 0
    var retryableLogs = failedLogs.filter(function (l) {
      var email = l.getString('recipient_email').toLowerCase()
      if (blockedEmails[email]) {
        ignoredBlocked++
        return false
      }
      return true
    })
    var totalRetried = retryableLogs.length

    if (retryableLogs.length === 0) {
      return e.json(200, { sent: 0, failed: 0, total: 0, ignored_blocked: ignoredBlocked })
    }

    campaign.set('status', 'enviando')
    $app.save(campaign)

    var baseUrl = $secrets.get('PB_INSTANCE_URL') || ''
    if (!baseUrl) {
      var proto = e.request.header.get('X-Forwarded-Proto') || 'https'
      baseUrl = proto + '://' + e.request.host
    }
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

    let sent = 0
    let failed = 0

    for (let i = 0; i < retryableLogs.length; i++) {
      const log = retryableLogs[i]
      const email = log.getString('recipient_email')

      if (!email) {
        log.set('status', 'falhou')
        log.set('error_message', 'E-mail do destinatário não encontrado.')
        $app.save(log)
        failed++
        continue
      }

      if (!apiKey) {
        log.set('status', 'falhou')
        log.set(
          'error_message',
          'RESEND_API_KEY não configurada. Acesse Configurações de Domínio para obter e configurar a chave do Resend.',
        )
        $app.save(log)
        failed++
        continue
      }

      if (!senderEmail) {
        log.set('status', 'falhou')
        log.set(
          'error_message',
          'Remetente (sender_email) não configurado na campanha. Edite a campanha e defina um e-mail remetente com domínio verificado no Resend.',
        )
        $app.save(log)
        failed++
        continue
      }

      var name = log.getString('recipient_name') || ''
      var company = ''
      var role = ''
      var suggestedMsg = ''

      var contactId = log.getString('contact')
      if (contactId) {
        try {
          var contact = $app.findRecordById('mailing_contacts', contactId)
          name = contact.getString('name') || name
          company = contact.getString('company') || ''
          role = contact.getString('raw_role') || ''
          suggestedMsg = contact.getString('suggested_message') || ''
        } catch (_) {}
      }

      var subject = subjectTemplate
        .replace(/\{nome\}/g, name)
        .replace(/\{empresa\}/g, company)
        .replace(/\{cargo\}/g, role)

      var body = bodyTemplate
        .replace(/\{nome\}/g, name)
        .replace(/\{empresa\}/g, company)
        .replace(/\{cargo\}/g, role)
        .replace(/\{mensagem_ia\}/g, suggestedMsg)

      var htmlBody = body.replace(/\n/g, '<br>\n')

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

      var siteUrl = $secrets.get('SITE_URL') || ''
      if (!siteUrl) {
        siteUrl = baseUrl
      }
      if (siteUrl.endsWith('/')) {
        siteUrl = siteUrl.slice(0, -1)
      }
      var unsubUrl = siteUrl + '/descadastrar/' + log.id
      trackedBody = trackedBody.replace(/\{link_descadastro\}/g, unsubUrl)
      if (trackedBody.indexOf('Cancelamento de recebimento') === -1) {
        trackedBody += '<hr><p style="font-size:12px;color:#666;margin-top:20px;padding-top:10px;">'
        trackedBody += '<strong>Cancelamento de recebimento de e-mails</strong><br>'
        trackedBody +=
          'Você está recebendo este e-mail porque se cadastrou ou participou de um evento nosso. Caso não deseje mais receber nossas comunicações, você pode cancelar o recebimento a qualquer momento, de forma simples e gratuita.'
        trackedBody += '</p>'
        trackedBody +=
          '<p style="margin-top:10px;"><a href="' +
          unsubUrl +
          '" style="color:#4f46e5;font-weight:bold;">Cancelar meu recebimento</a></p>'
      }

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
          log.set('error_message', '')
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
            lowerErrMsg.indexOf('dominio') !== -1 ||
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

    var totalSent = 0
    var totalFailed = 0
    try {
      var allLogs = $app.findRecordsByFilter(
        'email_logs',
        'campaign = "' + campaignId + '"',
        '-created',
        500,
        0,
      )
      for (var j = 0; j < allLogs.length; j++) {
        if (allLogs[j].getString('status') === 'enviado') {
          totalSent++
        } else if (allLogs[j].getString('status') === 'falhou') {
          totalFailed++
        }
      }
    } catch (_) {}

    campaign.set('total_sent', totalSent)
    campaign.set('total_failed', totalFailed)
    campaign.set('status', totalFailed > 0 ? 'parcialmente_falhou' : 'enviado')
    $app.save(campaign)

    var resultSummary = { sent: sent, failed: failed, total: totalRetried }
    if (ignoredBlocked > 0) {
      resultSummary.ignored_blocked = ignoredBlocked
    }
    if (failed > 0 && sent === 0) {
      try {
        var errLogs = $app.findRecordsByFilter(
          'email_logs',
          'campaign = "' + campaignId + '" && status = "falhou"',
          '-created',
          1,
          0,
        )
        if (errLogs.length > 0) {
          resultSummary.first_error = errLogs[0].getString('error_message') || ''
        }
      } catch (_) {}
    }
    return e.json(200, resultSummary)
  },
  $apis.requireAuth(),
)
