const CLIENT_ID = 'Ov23liduwk8KZ97LJWEr'
const SCOPE = 'repo read:org read:user'

export interface DeviceCode {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface TokenSuccess {
  access_token: string
  token_type: string
  scope: string
}

interface TokenError {
  error: string
  error_description?: string
}

export type PollResult =
  | { kind: 'success'; token: string }
  | { kind: 'pending' }
  | { kind: 'slow_down' }
  | { kind: 'expired' }
  | { kind: 'denied' }
  | { kind: 'error'; message: string }

function isSuccess(body: TokenSuccess | TokenError): body is TokenSuccess {
  return 'access_token' in body
}

export async function requestDeviceCode(): Promise<DeviceCode> {
  const body = new URLSearchParams({ client_id: CLIENT_ID, scope: SCOPE })
  const res = await fetch('/api/oauth/device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`device code request failed: http ${res.status.toString()}`)
  return (await res.json()) as DeviceCode
}

export async function pollForToken(deviceCode: string): Promise<PollResult> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })
  const res = await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) return { kind: 'error', message: `http ${res.status.toString()}` }
  const json = (await res.json()) as TokenSuccess | TokenError
  if (isSuccess(json)) return { kind: 'success', token: json.access_token }
  switch (json.error) {
    case 'authorization_pending':
      return { kind: 'pending' }
    case 'slow_down':
      return { kind: 'slow_down' }
    case 'expired_token':
      return { kind: 'expired' }
    case 'access_denied':
      return { kind: 'denied' }
    default:
      return { kind: 'error', message: json.error_description ?? json.error }
  }
}
