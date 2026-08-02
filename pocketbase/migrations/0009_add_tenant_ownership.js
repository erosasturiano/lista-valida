migrate(
  (app) => {
    var adminId = ''
    try {
      var adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'erosasturiano@gmail.com')
      adminId = adminUser.id
    } catch (_) {}

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['admin', 'user'],
          maxSelect: 1,
        }),
      )
    }
    if (!usersCol.fields.getByName('sender_name')) {
      usersCol.fields.add(new TextField({ name: 'sender_name' }))
    }
    if (!usersCol.fields.getByName('sender_email')) {
      usersCol.fields.add(new EmailField({ name: 'sender_email' }))
    }

    usersCol.listRule = `id = @request.auth.id || @request.auth.role = "admin"`
    usersCol.viewRule = `id = @request.auth.id || @request.auth.role = "admin"`
    usersCol.createRule = ''
    usersCol.updateRule = `id = @request.auth.id || @request.auth.role = "admin"`
    usersCol.deleteRule = `id = @request.auth.id || @request.auth.role = "admin"`

    app.save(usersCol)

    if (adminId) {
      try {
        var adminUser2 = app.findAuthRecordByEmail('_pb_users_auth_', 'erosasturiano@gmail.com')
        adminUser2.set('role', 'admin')
        app.save(adminUser2)
      } catch (_) {}
    }

    try {
      var allUsers = app.findRecordsByFilter('_pb_users_auth_', '', '-created', 500, 0)
      for (var u = 0; u < allUsers.length; u++) {
        if (!allUsers[u].getString('role')) {
          allUsers[u].set('role', 'user')
          app.save(allUsers[u])
        }
      }
    } catch (_) {}

    var mailingCols = [
      'events',
      'mailing_contacts',
      'email_campaigns',
      'email_logs',
      'email_templates',
      'blocked_contacts',
    ]
    var authRule = `@request.auth.id != ''`
    var ownerOrAdmin = `@request.auth.id != '' && (owner = @request.auth.id || @request.auth.role = "admin")`

    for (var i = 0; i < mailingCols.length; i++) {
      var colName = mailingCols[i]
      var col = app.findCollectionByNameOrId(colName)

      if (!col.fields.getByName('owner')) {
        col.fields.add(
          new RelationField({
            name: 'owner',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          }),
        )
      }

      col.addIndex('idx_' + colName + '_owner', false, 'owner', '')

      col.listRule = ownerOrAdmin
      col.viewRule = ownerOrAdmin
      col.createRule = authRule
      col.updateRule = ownerOrAdmin
      col.deleteRule = ownerOrAdmin

      app.save(col)
    }

    var blockedCol = app.findCollectionByNameOrId('blocked_contacts')

    app
      .db()
      .newQuery(`
    DELETE FROM blocked_contacts WHERE id NOT IN (
      SELECT MIN(id) FROM blocked_contacts GROUP BY email
    ) AND email != ''
  `)
      .execute()

    blockedCol.removeIndex('idx_blocked_contacts_email')
    blockedCol.addIndex(
      'idx_blocked_contacts_owner_email',
      true,
      'owner, email',
      `email != '' AND owner != ''`,
    )
    app.save(blockedCol)

    for (var j = 0; j < mailingCols.length; j++) {
      var cn = mailingCols[j]
      try {
        var records = app.findRecordsByFilter(cn, '', '-created', 500, 0)
        for (var k = 0; k < records.length; k++) {
          if (!records[k].getString('owner') && adminId) {
            records[k].set('owner', adminId)
            app.save(records[k])
          }
        }
      } catch (_) {}
    }
  },
  (app) => {
    var mailingCols = [
      'events',
      'mailing_contacts',
      'email_campaigns',
      'email_logs',
      'email_templates',
      'blocked_contacts',
    ]
    for (var i = 0; i < mailingCols.length; i++) {
      try {
        var col = app.findCollectionByNameOrId(mailingCols[i])
        var ownerField = col.fields.getByName('owner')
        if (ownerField) col.fields.remove(ownerField)
        col.removeIndex('idx_' + mailingCols[i] + '_owner')
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (_) {}
    }
  },
)
