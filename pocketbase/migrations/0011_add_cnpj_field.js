migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('mailing_contacts')
    if (!col.fields.getByName('cnpj')) {
      col.fields.add(new TextField({ name: 'cnpj' }))
    }
    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('mailing_contacts')
    var cnpjField = col.fields.getByName('cnpj')
    if (cnpjField) col.fields.remove(cnpjField)
    app.save(col)
  },
)
