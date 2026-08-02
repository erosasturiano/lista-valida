onRecordUpdateRequest(
  (e) => {
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
      e.record.set('owner', e.record.original().getString('owner'))
    }

    if (colName === 'users') {
      var auth = e.requestInfo().auth
      var isAdmin = auth && auth.getString('role') === 'admin'
      if (!isAdmin) {
        e.record.set('role', e.record.original().getString('role'))
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
