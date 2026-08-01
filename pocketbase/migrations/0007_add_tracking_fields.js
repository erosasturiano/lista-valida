migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('email_logs')

    if (!col.fields.getByName('opened_at')) {
      col.fields.add(new DateField({ name: 'opened_at' }))
    }
    if (!col.fields.getByName('clicked_at')) {
      col.fields.add(new DateField({ name: 'clicked_at' }))
    }
    if (!col.fields.getByName('click_count')) {
      col.fields.add(new NumberField({ name: 'click_count', onlyInt: true }))
    }

    col.addIndex('idx_email_logs_opened_at', false, 'opened_at', '')
    col.addIndex('idx_email_logs_clicked_at', false, 'clicked_at', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('email_logs')
    col.removeIndex('idx_email_logs_opened_at')
    col.removeIndex('idx_email_logs_clicked_at')
    app.save(col)
  },
)
