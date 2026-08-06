routerAdd('GET', '/backend/v1/track-click/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  const targetUrl = e.requestInfo().query['url'] || ''

  if (!targetUrl) return e.badRequestError('parâmetro url é obrigatório')

  try {
    const log = $app.findRecordById('email_logs', logId)
    if (!log.getString('clicked_at')) {
      log.set('clicked_at', new Date().toISOString())
    }
    log.set('click_count', (log.getInt('click_count') || 0) + 1)
    $app.saveNoValidate(log)
  } catch (_) {}

  return e.redirect(302, targetUrl)
})
