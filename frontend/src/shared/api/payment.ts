import { apiClient } from './client'

export const paymentApi = {
  async createDonation(amount: number, provider: string = 'stripe') {
    const { data } = await apiClient.post('/payments/donate', { amount, provider })
    return data // Вернет { payment_id, confirmation_url }
  },

  async createSubscription(plan: string = 'premium_visual', provider: string = 'stripe') {
    const { data } = await apiClient.post('/payments/subscribe', { plan, provider })
    return data
  }
}
