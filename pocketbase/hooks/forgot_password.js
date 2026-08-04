routerAdd('POST', '/backend/v1/forgot-password', (e) => {
  var body = e.requestInfo().body || {}
  var email = (body.email || '').trim()

  if (!email) return e.badRequestError('E-mail é obrigatório')

  var GENERIC_MSG = 'Se o e-mail estiver cadastrado, você receberá uma nova senha provisória.'

  var user = null
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.json(200, { message: GENERIC_MSG })
  }

  if (!user) return e.json(200, { message: GENERIC_MSG })

  var tempPassword = $security.randomString(12)

  try {
    user.setPassword(tempPassword)
    $app.save(user)
  } catch (saveErr) {
    $app
      .logger()
      .error(
        'Failed to update user password',
        'error',
        String(saveErr.message || saveErr),
        'email',
        email,
      )
    return e.json(200, { message: GENERIC_MSG })
  }

  var apiKey = $secrets.get('RESEND_API_KEY') || ''
  if (!apiKey) {
    $app.logger().error('RESEND_API_KEY not configured for password recovery')
    return e.json(200, { message: GENERIC_MSG })
  }

  var senderName = 'Lista Válida'
  var senderEmail = 'contato@listavalida.com.br'

  var siteUrl = $secrets.get('SITE_URL') || ''
  if (!siteUrl) {
    var proto = e.request.header.get('X-Forwarded-Proto') || 'https'
    siteUrl = proto + '://' + e.request.host
  }
  if (siteUrl.endsWith('/')) siteUrl = siteUrl.slice(0, -1)

  var loginUrl = siteUrl + '/'

  var htmlBody =
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
  htmlBody +=
    '<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background-color:#f8fafc;">'
  htmlBody +=
    '<div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">'
  htmlBody += '<div style="text-align:center;margin-bottom:24px;">'
  htmlBody += '<h1 style="color:#4f46e5;font-size:24px;margin:0;">Lista Válida</h1>'
  htmlBody += '<p style="color:#64748b;font-size:14px;margin:4px 0 0;">Recuperação de Senha</p>'
  htmlBody += '</div>'
  htmlBody += '<p style="color:#334155;font-size:14px;line-height:1.6;">Olá,</p>'
  htmlBody +=
    '<p style="color:#334155;font-size:14px;line-height:1.6;">Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Lista Válida. Sua senha foi redefinida e abaixo está sua nova senha provisória:</p>'
  htmlBody +=
    '<div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">'
  htmlBody += '<p style="color:#64748b;font-size:12px;margin:0 0 4px;">Sua senha provisória:</p>'
  htmlBody +=
    '<p style="color:#1e293b;font-size:20px;font-weight:bold;margin:0;font-family:monospace;">' +
    tempPassword +
    '</p>'
  htmlBody += '</div>'
  htmlBody +=
    '<p style="color:#334155;font-size:14px;line-height:1.6;">Use esta senha para fazer login na plataforma. Por segurança, recomendamos que você altere sua senha após o primeiro acesso.</p>'
  htmlBody += '<div style="text-align:center;margin:24px 0;">'
  htmlBody +=
    '<a href="' +
    loginUrl +
    '" style="background:#4f46e5;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Acessar a plataforma</a>'
  htmlBody += '</div>'
  htmlBody +=
    '<p style="color:#94a3b8;font-size:12px;line-height:1.5;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;">Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha foi alterada, mas apenas você tem acesso a esta nova senha provisória.</p>'
  htmlBody += '</div></body></html>'

  try {
    var res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderName + ' <' + senderEmail + '>',
        to: [user.getString('email')],
        subject: 'Recuperação de senha - Lista Válida',
        html: htmlBody,
      }),
      timeout: 30,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      $app
        .logger()
        .error('Failed to send password recovery email', 'status', res.statusCode, 'email', email)
    }
  } catch (sendErr) {
    $app
      .logger()
      .error(
        'Password recovery email transport error',
        'error',
        String(sendErr.message || sendErr),
        'email',
        email,
      )
  }

  return e.json(200, { message: GENERIC_MSG })
})
