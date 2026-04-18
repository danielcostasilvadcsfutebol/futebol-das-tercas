import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const b64u = (buf) =>
  buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

const fromB64u = (str) =>
  Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

function hkdf(salt, ikm, info, length) {
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest()
  return crypto.createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest()
    .slice(0, length)
}

function createVapidJWT(audience, email, vapidPublicKey, vapidPrivateKey) {
  const header = b64u(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claims = b64u(Buffer.from(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: `mailto:${email}`,
  })))
  const input = `${header}.${claims}`
  const pubBuf = fromB64u(vapidPublicKey)
  const privKey = crypto.createPrivateKey({
    key: {
      kty: 'EC', crv: 'P-256',
      d: vapidPrivateKey,
      x: b64u(pubBuf.slice(1, 33)),
      y: b64u(pubBuf.slice(33, 65)),
    },
    format: 'jwk',
  })
  const sig = crypto.sign('SHA256', Buffer.from(input), {
    key: privKey,
    dsaEncoding: 'ieee-p1363',
  })
  return `${input}.${b64u(sig)}`
}

function encryptPayload(subscription, plaintext) {
  const receiverPub = fromB64u(subscription.keys.p256dh)
  const auth = fromB64u(subscription.keys.auth)
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.generateKeys()
  const senderPub = ecdh.getPublicKey()
  const sharedSecret = ecdh.computeSecret(receiverPub)
  const salt = crypto.randomBytes(16)
  const prk = hkdf(auth, sharedSecret, Buffer.from('Content-Encoding: auth\x00'), 32)
  const context = Buffer.concat([
    Buffer.from('P-256\x00'),
    Buffer.from([0x00, 0x41]), receiverPub,
    Buffer.from([0x00, 0x41]), senderPub,
  ])
  const cek = hkdf(salt, prk, Buffer.concat([Buffer.from('Content-Encoding: aesgcm\x00'), context]), 16)
  const nonce = hkdf(salt, prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\x00'), context]), 12)
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const body = Buffer.concat([
    cipher.update(Buffer.concat([Buffer.alloc(2), Buffer.from(plaintext)])),
    cipher.final(),
    cipher.getAuthTag(),
  ])
  return { salt, senderPub, body }
}

async function sendPush(subscription, payload) {
  const { salt, senderPub, body } = encryptPayload(subscription, payload)
  const { protocol, host } = new URL(subscription.endpoint)
  const jwt = createVapidJWT(
    `${protocol}//${host}`,
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${b64u(salt)}`,
      'Crypto-Key': `dh=${b64u(senderPub)};vapid=${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}`,
      'TTL': '86400',
    },
    body,
  })
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Push falhou: ${res.status}`)
  }
}

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  try {
    const authHeader = request.headers.get('x-admin-key')
    if (authHeader !== process.env.ADMIN_NOTIFY_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    const { title, body, url } = await request.json()
    const { data: rows, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
    if (error) throw error
    const payload = JSON.stringify({ title, body, url: url || '/' })
    const results = await Promise.allSettled(
      rows.map((row) => sendPush(row.subscription, payload))
    )
    const enviadas = results.filter((r) => r.status === 'fulfilled').length
    const falhadas = results.filter((r) => r.status === 'rejected').length
    return NextResponse.json({ enviadas, falhadas })
  } catch (err) {
    console.error('Erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
