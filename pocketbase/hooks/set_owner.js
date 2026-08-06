onRecordCreateRequest(
  (e) => {
    const authId = e.auth?.id
    if (!authId) {
      e.next()
      return
    }
    if (!e.record.get('owner')) {
      e.record.set('owner', authId)
    }
    e.next()
  },
  'events',
  'mailing_contacts',
  'email_campaigns',
  'email_logs',
  'email_templates',
  'blocked_contacts',
)
