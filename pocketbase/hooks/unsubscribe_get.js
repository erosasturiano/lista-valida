routerAdd('GET', '/backend/v1/unsubscribe/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  if (!logId) return e.notFoundError('Link inválido')

  try {
    const log = $app.findRecordById('email_logs', logId)
    return e.json(200, {
      email: log.getString('recipient_email'),
      name: log.getString('recipient_name') || '',
    })
  } catch (_) {
    return e.notFoundError('Link de descadastro inválido ou expirado.')
  }
})
