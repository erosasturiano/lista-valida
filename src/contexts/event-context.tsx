import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getEvents, EventRecord } from '@/services/events'

interface EventContextType {
  events: EventRecord[]
  selectedEventId: string | null
  selectedEvent: EventRecord | null
  setSelectedEventId: (id: string | null) => void
  refreshEvents: () => Promise<void>
  loading: boolean
}

const EventContext = createContext<EventContextType | undefined>(undefined)

export const useEventContext = () => {
  const context = useContext(EventContext)
  if (!context) throw new Error('useEventContext deve ser usado dentro de um EventProvider')
  return context
}

export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)

  const queryEventId = searchParams.get('evento')
  const [selectedEventId, setSelectedEventIdState] = useState<string | null>(queryEventId)

  const refreshEvents = useCallback(async () => {
    try {
      const data = await getEvents()
      setEvents(data)
      if (data.length > 0) {
        setSelectedEventIdState((prev) => {
          if (prev && data.some((e) => e.id === prev)) return prev
          return data[0].id
        })
      } else {
        setSelectedEventIdState(null)
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshEvents()
  }, [refreshEvents])

  const setSelectedEventId = (id: string | null) => {
    setSelectedEventIdState(id)
    if (id) {
      searchParams.set('evento', id)
    } else {
      searchParams.delete('evento')
    }
    setSearchParams(searchParams, { replace: true })
  }

  const selectedEvent =
    events.find((e) => e.id === selectedEventId) || (events.length > 0 ? events[0] : null)

  return (
    <EventContext.Provider
      value={{
        events,
        selectedEventId,
        selectedEvent,
        setSelectedEventId,
        refreshEvents,
        loading,
      }}
    >
      {children}
    </EventContext.Provider>
  )
}
