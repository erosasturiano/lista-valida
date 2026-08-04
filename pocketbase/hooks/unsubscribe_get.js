routerAdd('GET', '/backend/v1/unsubscribe/{logId}', (e) => {
  const logId = e.request.pathValue('logId')
  const siteUrl = $secrets.get('SITE_URL') || ''
  return e.redirect(302, siteUrl + '/descadastrar/' + logId)
})
