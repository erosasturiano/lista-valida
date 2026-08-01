routerAdd(
  'POST',
  '/backend/v1/contacts/search',
  (e) => {
    const body = e.requestInfo().body || {}
    const query = (body.query || '').trim()
    const eventId = body.event_id
    const k = body.k || 5

    if (!query) return e.badRequestError('Termo de busca inteligente é obrigatório')

    try {
      const embedRes = $ai.embed({ input: query })
      const queryVector = embedRes.data[0].embedding

      let filterExpr = ''
      if (eventId) {
        filterExpr = `event = "${eventId}"`
      }

      const results = $vectors.search(e, 'mailing_contacts', {
        field: 'search_embedding',
        query: queryVector,
        k: k,
        filter: filterExpr,
      })

      return e.json(200, results)
    } catch (err) {
      return e.json(200, { items: [] })
    }
  },
  $apis.requireAuth(),
)
