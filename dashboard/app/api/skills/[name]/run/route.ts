import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { resolve } from 'path'

const REPO_ROOT = resolve(process.cwd(), '..')

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params

    // Validate skill name to prevent injection
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      return NextResponse.json({ error: 'Invalid skill name' }, { status: 400 })
    }

    // Read optional vars from request body
    let vars = ''
    try {
      const body = await request.json()
      if (body.vars && typeof body.vars === 'string') {
        // Sanitize: only allow key=value pairs with safe characters
        vars = body.vars.replace(/[^a-zA-Z0-9_=, .\-/]/g, '')
      }
    } catch { /* no body is fine */ }

    const cmd = vars
      ? `gh workflow run aeon.yml -f skill=${name} -f vars=${JSON.stringify(vars)}`
      : `gh workflow run aeon.yml -f skill=${name}`

    execSync(cmd, { stdio: 'pipe', cwd: REPO_ROOT })

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to trigger run'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
