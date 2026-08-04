routerAdd('GET', '/backend/v1/track-open/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  try {
    const log = $app.findRecordById('email_logs', logId)
    if (!log.getString('opened_at')) {
      log.set('opened_at', new Date().toISOString())
      $app.saveNoValidate(log)
    }
  } catch (_) {}

  const pixel = new Uint8Array([
    71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 255, 255, 255, 0, 0, 0, 33, 249, 4, 1, 0, 0, 0,
    0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
  ])
  return e.blob(200, 'image/gif', pixel)
})
