migrate(
  (app) => {
    var testUser = null
    try {
      testUser = app.findAuthRecordByEmail('_pb_users_auth_', 'erosasturiano@gmail.com')
    } catch (_) {}

    if (!testUser) return

    var testId = testUser.id

    var targetAdmin = null
    try {
      var admins = app.findRecordsByFilter(
        '_pb_users_auth_',
        'role = "admin" && id != "' + testId + '"',
        '-created',
        1,
        0,
      )
      if (admins.length > 0) targetAdmin = admins[0]
    } catch (_) {}

    if (!targetAdmin) {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      targetAdmin = new Record(usersCol)
      targetAdmin.setEmail('admin@listavalida.com.br')
      targetAdmin.setPassword('Admin@Lista2026')
      targetAdmin.setVerified(true)
      targetAdmin.set('name', 'Administrador')
      targetAdmin.set('role', 'admin')
      app.save(targetAdmin)
    }

    var targetId = targetAdmin.id

    app
      .db()
      .newQuery(
        "DELETE FROM blocked_contacts WHERE owner = '" +
          testId +
          "' AND email != '' AND email IN (SELECT email FROM blocked_contacts WHERE owner = '" +
          targetId +
          "' AND email != '')",
      )
      .execute()

    var collections = [
      'events',
      'mailing_contacts',
      'email_campaigns',
      'email_logs',
      'email_templates',
      'blocked_contacts',
    ]
    for (var i = 0; i < collections.length; i++) {
      try {
        var records = app.findRecordsByFilter(
          collections[i],
          'owner = "' + testId + '"',
          '-created',
          500,
          0,
        )
        for (var j = 0; j < records.length; j++) {
          records[j].set('owner', targetId)
          app.save(records[j])
        }
      } catch (_) {}
    }

    app.delete(testUser)
  },
  (app) => {
    try {
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      var record = new Record(usersCol)
      record.setEmail('erosasturiano@gmail.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      record.set('role', 'admin')
      app.save(record)
    } catch (_) {}
  },
)
