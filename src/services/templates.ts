import pb from '@/lib/pocketbase/client'

export type TemplateCategory =
  | 'RSVP'
  | 'Envio de Certificado'
  | 'Convite'
  | 'Pitch'
  | 'Convite para Comunidade Exclusiva'

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'RSVP',
  'Envio de Certificado',
  'Convite',
  'Pitch',
  'Convite para Comunidade Exclusiva',
]

export interface TemplateRecord {
  id: string
  name: string
  category: TemplateCategory
  sender_name?: string
  sender_email?: string
  subject: string
  body_template: string
  created: string
  updated: string
}

export interface TemplateInput {
  name: string
  category: TemplateCategory
  sender_name?: string
  sender_email?: string
  subject: string
  body_template: string
}

export const getTemplates = async (): Promise<TemplateRecord[]> => {
  return pb.collection('email_templates').getFullList<TemplateRecord>({
    sort: '-updated',
  })
}

export const getTemplate = async (id: string): Promise<TemplateRecord> => {
  return pb.collection('email_templates').getOne<TemplateRecord>(id)
}

export const createTemplate = async (data: TemplateInput): Promise<TemplateRecord> => {
  return pb.collection('email_templates').create<TemplateRecord>(data)
}

export const updateTemplate = async (
  id: string,
  data: Partial<TemplateInput>,
): Promise<TemplateRecord> => {
  return pb.collection('email_templates').update<TemplateRecord>(id, data)
}

export const deleteTemplate = async (id: string): Promise<boolean> => {
  return pb.collection('email_templates').delete(id)
}
