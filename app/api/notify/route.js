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
  const prk = hkdf(auth, sharedSecret, Buffer.from('Conte
