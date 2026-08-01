routerAdd('GET', '/backend/v1/track-click/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  if (!logId) return e.notFoundError('invalid log id')

  var targetUrl = e.requestInfo().query['url'] || ''
  if (!targetUrl) {
    targetUrl = $secrets.get('SITE_URL') || '/'
  }

  try {
    const record = $app.findRecordById('email_logs', logId)
    if (!record.getString('clicked_at')) {
      record.set('clicked_at', new Date().toISOString())
    }
    var currentCount = record.getInt('click_count') || 0
    record.set('click_count', currentCount + 1)
    $app.saveNoValidate(record)
  } catch (_) {}

  return e.redirect(302, targetUrl)
})
