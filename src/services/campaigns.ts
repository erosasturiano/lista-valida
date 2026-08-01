import pb from '@/lib/pocketbase/client'

export type CampaignStatus = 'rascunho' | 'enviando' | 'enviado' | 'parcialmente_falhou'

export interface CampaignRecord {
  id: string
  name: string
  event: string
  subject: string
  body_template: string
  sender_name?: string
  sender_email?: string
  status?: CampaignStatus
  filter_rsvp?: string
  filter_priority?: string
  filter_category?: string
  total_sent?: number
  total_failed?: number
  created: string
  updated: string
  expand?: { event?: { name: string } }
}

export interface EmailLogRecord {
  id: string
  campaign: string
  contact?: string
  recipient_email: string
  recipient_name?: string
  subject?: string
  body?: string
  status: 'enviado' | 'falhou'
  error_message?: string
  sent_at?: string
  created: string
  updated: string
}

export const getCampaigns = async (eventId?: string): Promise<CampaignRecord[]> => {
  const filter = eventId ? `event = "${eventId}"` : ''
  return pb.collection('email_campaigns').getFullList<CampaignRecord>({
    filter,
    sort: '-created',
    expand: 'event',
  })
}

export const getCampaign = async (id: string): Promise<CampaignRecord> => {
  return pb.collection('email_campaigns').getOne<CampaignRecord>(id, { expand: 'event' })
}

export const createCampaign = async (data: Partial<CampaignRecord>): Promise<CampaignRecord> => {
  return pb.collection('email_campaigns').create<CampaignRecord>(data)
}

export const updateCampaign = async (
  id: string,
  data: Partial<CampaignRecord>,
): Promise<CampaignRecord> => {
  return pb.collection('email_campaigns').update<CampaignRecord>(id, data)
}

export const deleteCampaign = async (id: string): Promise<boolean> => {
  return pb.collection('email_campaigns').delete(id)
}

export const sendCampaign = async (
  id: string,
): Promise<{ sent: number; failed: number; total: number }> => {
  return pb.send(`/backend/v1/campaigns/${id}/send`, { method: 'POST' })
}

export const getCampaignLogs = async (campaignId: string): Promise<EmailLogRecord[]> => {
  return pb.collection('email_logs').getFullList<EmailLogRecord>({
    filter: `campaign = "${campaignId}"`,
    sort: '-created',
  })
}
