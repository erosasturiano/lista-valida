import pb from '@/lib/pocketbase/client'

export type BlockReason = 'Reclamação' | 'Descadastro' | 'Bounce' | 'Manual'
export type BlockSource = 'link_descadastro' | 'formulario' | 'provedor' | 'manual'

export interface BlockedContactRecord {
  id: string
  contact?: string
  event?: string
  name?: string
  email: string
  reason: BlockReason
  source: BlockSource
  notes?: string
  blocked_at?: string
  created: string
  updated: string
  expand?: { event?: { name: string } }
}

export const getBlockedContacts = async (filterStr?: string): Promise<BlockedContactRecord[]> => {
  const filter = filterStr || ''
  return pb.collection('blocked_contacts').getFullList<BlockedContactRecord>({
    filter,
    sort: '-blocked_at',
    expand: 'event',
  })
}

export const createBlockedContact = async (data: {
  name?: string
  email: string
  event?: string
  notes?: string
}): Promise<BlockedContactRecord> => {
  return pb.collection('blocked_contacts').create<BlockedContactRecord>({
    ...data,
    reason: 'Manual',
    source: 'manual',
    blocked_at: new Date().toISOString(),
  })
}

export const deleteBlockedContact = async (id: string): Promise<boolean> => {
  return pb.collection('blocked_contacts').delete(id)
}
