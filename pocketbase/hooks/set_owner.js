onRecordCreateRequest(
  (e) => {
    var auth = e.requestInfo().auth
    var authId = auth ? auth.id : ''
    var colName = e.record.collectionName || ''

    var mailingCols = [
      'events',
      'mailing_contacts',
      'email_campaigns',
      'email_logs',
      'email_templates',
      'blocked_contacts',
    ]
    if (mailingCols.indexOf(colName) !== -1) {
      if (authId) {
        e.record.set('owner', authId)
      }
    }

    if (colName === 'users') {
      var authRole = auth ? auth.getString('role') : ''
      if (authRole !== 'admin') {
        e.record.set('role', 'user')
      }
    }

    e.next()
  },
  'events',
  'mailing_contacts',
  'email_campaigns',
  'email_logs',
  'email_templates',
  'blocked_contacts',
  'users',
)
