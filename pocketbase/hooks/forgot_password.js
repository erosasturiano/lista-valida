routerAdd('POST', '/backend/v1/forgot-password', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()

  if (!email) return e.badRequestError('email é obrigatório')

  try {
    const user = $app.findAuthRecordByEmail('users', email)
    const token = $security.randomString(32)
    const resetUrl = ($secrets.get('SITE_URL') || '') + '/?reset=' + token

    try {
      $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + $secrets.get('RESEND_API_KEY'),
        },
        body: JSON.stringify({
          from: 'Lista Válida <noreply@listavalida.com.br>',
          to: email,
          subject: 'Recuperação de Senha - Lista Válida',
          html:
            '<p>Olá,</p><p>Clique no link abaixo para redefinir sua senha:</p><p><a href="' +
            resetUrl +
            '">' +
            resetUrl +
            '</a></p>',
        }),
        timeout: 30,
      })
    } catch (_) {}
  } catch (_) {}

  return e.json(200, { message: 'Se o e-mail existir, você receberá um link de recuperação.' })
})
