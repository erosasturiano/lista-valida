import pb from '@/lib/pocketbase/client'

export interface EventRecord {
  id: string
  name: string
  event_date?: string
  description?: string
  created: string
  updated: string
}

export const getEvents = async (): Promise<EventRecord[]> => {
  return pb.collection('events').getFullList<EventRecord>({ sort: '-created' })
}

export const getEvent = async (id: string): Promise<EventRecord> => {
  return pb.collection('events').getOne<EventRecord>(id)
}

export const createEvent = async (data: {
  name: string
  event_date?: string
  description?: string
}): Promise<EventRecord> => {
  const userId = pb.authStore.record?.id
  return pb.collection('events').create<EventRecord>({
    ...data,
    owner: userId,
  })
}

export const updateEvent = async (id: string, data: Partial<EventRecord>): Promise<EventRecord> => {
  return pb.collection('events').update<EventRecord>(id, data)
}

export const deleteEvent = async (id: string): Promise<boolean> => {
  return pb.collection('events').delete(id)
}
