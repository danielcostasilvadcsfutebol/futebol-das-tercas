// Web Push implementado com Node.js built-in crypto — sem pacotes externos
import crypto from 'node:crypto'

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

  const prk = hkdf(
    auth,
    sharedSecret,
    Buffer.from('Content-Encoding: auth\x00'),
    32
  )

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

export async function sendPushNotification(subscription, payload, { publicKey, privateKey, email }) {
  const { salt, senderPub, body } = encryptPayload(subscription, payload)
  const { protocol, host } = new URL(subscription.endpoint)
  const jwt = createVapidJWT(`${protocol}//${host}`, email, publicKey, privateKey)

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${publicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${b64u(salt)}`,
      'Crypto-Key': `dh=${b64u(senderPub)};vapid=${publicKey}`,
      'TTL': '86400',
    },
    body,
  })

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Push falhou: ${res.status}`)
  }
}
