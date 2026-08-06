import pb from '@/lib/pocketbase/client'

export interface ForgotPasswordResponse {
  message: string
}

export const forgotPassword = (email: string): Promise<ForgotPasswordResponse> =>
  pb.send('/backend/v1/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })
