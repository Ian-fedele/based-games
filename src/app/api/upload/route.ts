import { NextRequest, NextResponse } from 'next/server'

const PINATA_JWT = process.env.PINATA_JWT || ''
const PINATA_UPLOAD_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'
const PINATA_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS'

// Rate limit: track recent uploads per IP
const recentUploads = new Map<string, number[]>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX = 3 // max 3 uploads per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = recentUploads.get(ip) ?? []
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW)
  recentUploads.set(ip, recent)
  if (recent.length >= RATE_LIMIT_MAX) return true
  recent.push(now)
  return false
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limited. Please wait before uploading again.' },
        { status: 429 }
      )
    }

    if (!PINATA_JWT) {
      return NextResponse.json(
        { error: 'Server misconfigured: missing Pinata credentials' },
        { status: 500 }
      )
    }

    const contentType = req.headers.get('content-type') || ''

    // JSON metadata upload
    if (contentType.includes('application/json')) {
      const body = await req.json()

      if (!body.name || !body.image || !body.attributes) {
        return NextResponse.json(
          { error: 'Invalid metadata format' },
          { status: 400 }
        )
      }

      const res = await fetch(PINATA_JSON_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: JSON.stringify({
          pinataContent: body,
          pinataMetadata: { name: body.name },
        }),
      })

      if (!res.ok) {
        return NextResponse.json(
          { error: `Pinata JSON upload failed: ${res.statusText}` },
          { status: 502 }
        )
      }

      const data = await res.json()
      return NextResponse.json({ ipfsHash: data.IpfsHash })
    }

    // Image file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are accepted' },
          { status: 400 }
        )
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File too large (max 5MB)' },
          { status: 400 }
        )
      }

      const pinataForm = new FormData()
      pinataForm.append('file', file, file.name || 'neon-snake-score.png')
      const metaName = formData.get('name') || 'NeonSnake-Score'
      pinataForm.append(
        'pinataMetadata',
        JSON.stringify({ name: metaName })
      )

      const res = await fetch(PINATA_UPLOAD_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: pinataForm,
      })

      if (!res.ok) {
        return NextResponse.json(
          { error: `Pinata image upload failed: ${res.statusText}` },
          { status: 502 }
        )
      }

      const data = await res.json()
      return NextResponse.json({ ipfsHash: data.IpfsHash })
    }

    return NextResponse.json(
      { error: 'Unsupported content type' },
      { status: 400 }
    )
  } catch (err: unknown) {
    console.error('Upload API error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
