import crypto from 'crypto'

export interface PaymentProvider {
  initiate(phone: string, amount: number, reference: string, description: string): Promise<{ success: boolean; transactionId?: string; message: string }>
  confirm(transactionId: string): Promise<{ success: boolean; status: string; message: string }>
}

class MockProvider implements PaymentProvider {
  async initiate(phone: string, amount: number, reference: string, description: string) {
    console.log(`[MockPayment] Initiated: ${amount} FCFA from ${phone}, ref: ${reference}`)
    return { success: true, transactionId: `TXN_${Date.now()}`, message: 'Transaction initiée. Confirmez sur votre téléphone.' }
  }

  async confirm(transactionId: string) {
    console.log(`[MockPayment] Confirmed: ${transactionId}`)
    return { success: true, status: 'confirmed', message: 'Paiement confirmé avec succès.' }
  }
}

class PayDunyaProvider implements PaymentProvider {
  private apiKey: string
  private apiSecret: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.PAYDUNYA_API_KEY || ''
    this.apiSecret = process.env.PAYDUNYA_API_SECRET || ''
    this.baseUrl = 'https://app.paydunya.com/api/v1'
  }

  async initiate(phone: string, amount: number, reference: string, description: string) {
    const res = await fetch(`${this.baseUrl}/checkout-invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY || '',
        'PAYDUNYA-PRIVATE-KEY': this.apiSecret,
        'PAYDUNYA-TOKEN': this.apiKey,
      },
      body: JSON.stringify({
        invoice: {
          items: [{ name: description, quantity: 1, unit_price: String(amount), total_price: String(amount) }],
          total_amount: String(amount),
          description,
        },
        store: { name: 'IRIS-Education', phone },
        actions: { cancel_url: `${process.env.APP_URL || ''}/pricing`, return_url: `${process.env.APP_URL || ''}/dashboard` },
      }),
    })
    const data = await res.json()
    if (data.response_text === 'Success') {
      return { success: true, transactionId: data.token, message: data.response_text }
    }
    return { success: false, message: data.response_text || 'Erreur de paiement' }
  }

  async confirm(transactionId: string) {
    const res = await fetch(`${this.baseUrl}/checkout-invoice/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY || '',
        'PAYDUNYA-PRIVATE-KEY': this.apiSecret,
        'PAYDUNYA-TOKEN': this.apiKey,
      },
      body: JSON.stringify({ token: transactionId }),
    })
    const data = await res.json()
    if (data.status === 'completed') {
      return { success: true, status: 'confirmed', message: 'Paiement confirmé' }
    }
    return { success: false, status: data.status || 'failed', message: data.response_text || 'Échec de confirmation' }
  }
}

class CinetPayProvider implements PaymentProvider {
  private apiKey: string
  private siteId: string

  constructor() {
    this.apiKey = process.env.CINETPAY_API_KEY || ''
    this.siteId = process.env.CINETPAY_SITE_ID || ''
  }

  async initiate(phone: string, amount: number, reference: string, description: string) {
    const res = await fetch('https://api.cinetpay.com/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey },
      body: JSON.stringify({
        amount,
        currency: 'XOF',
        customer_surname: 'IRIS',
        customer_name: 'Education',
        description,
        customer_phone_number: phone,
        notify_url: `${process.env.APP_URL || ''}/api/payments/webhook`,
        return_url: `${process.env.APP_URL || ''}/dashboard`,
        channels: 'OMONEY,MTN',
        reference,
      }),
    })
    const data = await res.json()
    if (data.code === '00' || data.code === 0) {
      return { success: true, transactionId: data.data?.token || reference, message: 'Transaction initiée' }
    }
    return { success: false, message: data.message || 'Erreur de paiement' }
  }

  async confirm(transactionId: string) {
    const res = await fetch(`https://api.cinetpay.com/v1/payments/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': this.apiKey },
      body: JSON.stringify({ token: transactionId }),
    })
    const data = await res.json()
    if (data.code === '00' && data.data?.status === 'ACCEPTED') {
      return { success: true, status: 'confirmed', message: 'Paiement confirmé' }
    }
    return { success: false, status: 'failed', message: data.message || 'Échec de confirmation' }
  }
}

function getProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER || 'mock'
  switch (provider) {
    case 'paydunya': return new PayDunyaProvider()
    case 'cinetpay': return new CinetPayProvider()
    default: return new MockProvider()
  }
}

export function generateReference(): string {
  return `IRIS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

export const paymentProvider = { getProvider }
