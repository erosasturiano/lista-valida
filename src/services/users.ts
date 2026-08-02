import pb from '@/lib/pocketbase/client'

export interface UserRecord {
  id: string
  name?: string
  email: string
  role: 'admin' | 'user'
  sender_name?: string
  sender_email?: string
  created: string
  updated: string
}

export const getUsers = async (): Promise<UserRecord[]> => {
  return pb.collection('users').getFullList<UserRecord>({ sort: '-created' })
}

export const createUser = async (data: {
  name: string
  email: string
  password: string
  role: 'admin' | 'user'
}): Promise<UserRecord> => {
  return pb.collection('users').create<UserRecord>({
    email: data.email,
    password: data.password,
    passwordConfirm: data.password,
    name: data.name,
    role: data.role,
  })
}

export const updateUserRole = async (id: string, role: 'admin' | 'user'): Promise<UserRecord> => {
  return pb.collection('users').update<UserRecord>(id, { role })
}
