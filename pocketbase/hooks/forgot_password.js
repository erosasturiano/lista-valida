routerAdd('POST', '/backend/v1/forgot-password', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()

  if (!email) return e.badRequestError('email é obrigatório')

  var genericMessage =
    'Se o e-mail estiver cadastrado, você receberá uma nova senha em sua caixa de entrada.'

  var user = null
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.json(200, { message: genericMessage })
  }

  if (!user) return e.json(200, { message: genericMessage })

  var newPassword = $security.randomStringWithAlphabet(
    12,
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%',
  )

  try {
    user.setPassword(newPassword)
    $app.save(user)
  } catch (err) {
    return e.json(500, { error: 'Não foi possível atualizar a senha. Tente novamente mais tarde.' })
  }

  var htmlBody =
    '<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">' +
    '<h2 style="color: #4f46e5;">Recuperação de Senha - Lista Válida</h2>' +
    '<p>Olá,</p>' +
    '<p>Uma nova senha foi gerada para a sua conta:</p>' +
    '<div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">' +
    '<span style="font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #1e293b;">' +
    newPassword +
    '</span>' +
    '</div>' +
    '<p><strong>Recomendamos que você faça login e altere essa senha imediatamente.</strong></p>' +
    '<p>Se você não solicitou a recuperação de senha, ignore este e-mail ou entre em contato com o suporte.</p>' +
    '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">' +
    '<p style="font-size: 12px; color: #94a3b8;">© ' +
    new Date().getFullYear() +
    ' Lista Válida – Gestão Inteligente de Mailings.</p>' +
    '</div>'

  try {
    var res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + $secrets.get('RESEND_API_KEY'),
      },
      body: JSON.stringify({
        from: 'Lista Válida <noreply@listavalida.com.br>',
        to: email,
        subject: 'Sua nova senha - Lista Válida',
        html: htmlBody,
      }),
      timeout: 30,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      return e.json(500, {
        error: 'Não foi possível enviar o e-mail com a nova senha. Tente novamente mais tarde.',
      })
    }
  } catch (err) {
    return e.json(500, {
      error: 'Não foi possível enviar o e-mail com a nova senha. Tente novamente mais tarde.',
    })
  }

  return e.json(200, { message: genericMessage })
})
