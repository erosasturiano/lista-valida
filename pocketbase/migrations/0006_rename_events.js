migrate(
  (app) => {
    try {
      const event = app.findFirstRecordByData('events', 'name', 'Evento DHO')
      event.set('name', 'Mailing DHO')
      app.save(event)
    } catch (_) {}

    try {
      const event = app.findFirstRecordByData('events', 'name', 'Evento DHO-7235a')
      event.set('name', 'Mailing DHO-7235a')
      app.save(event)
    } catch (_) {}
  },
  (app) => {
    try {
      const event = app.findFirstRecordByData('events', 'name', 'Mailing DHO')
      event.set('name', 'Evento DHO')
      app.save(event)
    } catch (_) {}

    try {
      const event = app.findFirstRecordByData('events', 'name', 'Mailing DHO-7235a')
      event.set('name', 'Evento DHO-7235a')
      app.save(event)
    } catch (_) {}
  },
)
