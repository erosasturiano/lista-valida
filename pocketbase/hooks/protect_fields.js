onRecordUpdateRequest(
  (e) => {
    const protectedByCollection = {
      mailing_contacts: ['owner', 'event', 'created'],
      email_campaigns: ['owner', 'event', 'created'],
      email_logs: ['owner', 'campaign', 'created'],
      email_templates: ['owner', 'created'],
      blocked_contacts: ['owner', 'created'],
      events: ['owner', 'created'],
    }

    const collection = e.record.collectionName
    const fields = protectedByCollection[collection]
    if (!fields) {
      e.next()
      return
    }

    const original = e.record.original()
    for (const field of fields) {
      const currentVal = e.record.get(field)
      const originalVal = original.get(field)
      if (currentVal !== originalVal) {
        e.record.set(field, originalVal)
      }
    }

    e.next()
  },
  'mailing_contacts',
  'email_campaigns',
  'email_logs',
  'email_templates',
  'blocked_contacts',
  'events',
)
