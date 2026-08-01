routerAdd('GET', '/backend/v1/track-open/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  if (!logId) return e.notFoundError('invalid log id')

  try {
    const record = $app.findRecordById('email_logs', logId)
    if (!record.getString('opened_at')) {
      record.set('opened_at', new Date().toISOString())
      $app.saveNoValidate(record)
    }
  } catch (_) {}

  var gifHex =
    '47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b'
  var bytes = []
  for (var i = 0; i < gifHex.length; i += 2) {
    bytes.push(parseInt(gifHex.substr(i, 2), 16))
  }

  e.response.header().set('Cache-Control', 'no-store, no-cache, must-revalidate')
  e.response.header().set('Pragma', 'no-cache')
  return e.blob(200, 'image/gif', bytes)
})
