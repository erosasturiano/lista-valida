routerAdd(
  'POST',
  '/backend/v1/search-contacts',
  (e) => {
    const body = e.requestInfo().body || {}
    const query = (body.query || '').trim()
    const eventId = body.event_id || body.eventId || ''
    const userId = e.auth?.id

    if (!userId) return e.unauthorizedError('Autenticação necessária')
    if (!query) return e.badRequestError('query é obrigatório')

    try {
      const embedRes = $ai.embed({ input: query })
      const filter = eventId ? 'event = "' + eventId + '"' : ''

      const results = $vectors.search(e, 'mailing_contacts', {
        field: 'search_embedding',
        query: embedRes.data[0].embedding,
        k: 20,
        filter: filter,
      })

      return e.json(200, results)
    } catch (err) {
      return e.json(503, { error: 'Busqueda temporariamente indisponível' })
    }
  },
  $apis.requireAuth(),
)
