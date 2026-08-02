routerAdd('POST', '/backend/v1/resend-webhook', (e) => {
  const body = e.requestInfo().body || {}
  var eventType = body.type || body.event_type || ''
  var data = body.data || body

  var email = data.email || data.recipient_email || ''
  if (!email) return e.json(200, { ok: true })

  email = email.toLowerCase()

  var reason = ''
  if (eventType.indexOf('bounced') !== -1 || eventType.indexOf('bounce') !== -1) {
    reason = 'Bounce'
  } else if (
    eventType.indexOf('complained') !== -1 ||
    eventType.indexOf('complaint') !== -1 ||
    eventType.indexOf('spam') !== -1
  ) {
    reason = 'Reclamação'
  } else {
    return e.json(200, { ok: true, skipped: true })
  }

  var blockedCol = $app.findCollectionByNameOrId('blocked_contacts')

  var owner = ''
  try {
    var logs = $app.findRecordsByFilter(
      'email_logs',
      'recipient_email = "' + email + '"',
      '-created',
      1,
      0,
    )
    if (logs.length > 0) {
      var campaignId = logs[0].getString('campaign')
      if (campaignId) {
        var campaign = $app.findRecordById('email_campaigns', campaignId)
        owner = campaign.getString('owner')
      }
    }
  } catch (_) {}
  if (!owner) {
    try {
      var contact = $app.findFirstRecordByData('mailing_contacts', 'email', email)
      owner = contact.getString('owner')
    } catch (_) {}
  }

  var existing = null
  if (owner) {
    try {
      existing = $app.findFirstRecordByFilter(
        'blocked_contacts',
        'owner = "' + owner + '" && email = "' + email + '"',
      )
    } catch (_) {}
  } else {
    try {
      existing = $app.findFirstRecordByData('blocked_contacts', 'email', email)
    } catch (_) {}
  }

  if (existing) {
    existing.set('reason', reason)
    existing.set('source', 'provedor')
    if (data.id) existing.set('notes', 'Resend ID: ' + data.id)
    existing.set('blocked_at', new Date().toISOString())
    if (owner && !existing.getString('owner')) existing.set('owner', owner)
    $app.save(existing)
  } else {
    var record = new Record(blockedCol)
    record.set('email', email)
    record.set('name', data.name || '')
    record.set('reason', reason)
    record.set('source', 'provedor')
    if (data.id) record.set('notes', 'Resend ID: ' + data.id)
    record.set('blocked_at', new Date().toISOString())
    if (owner) record.set('owner', owner)

    try {
      var contact = $app.findFirstRecordByData('mailing_contacts', 'email', email)
      record.set('contact', contact.id)
      var eventId = contact.getString('event')
      if (eventId) record.set('event', eventId)
    } catch (_) {}

    $app.save(record)
  }

  return e.json(200, { ok: true, blocked: true, email: email, reason: reason })
})
