import { NextResponse } from 'next/server'
import { getFileContent, getDirectory, updateFile } from '@/lib/github'

function parseConfig(yaml: string): Record<string, { enabled: boolean; schedule: string; vars: string }> {
  const skills: Record<string, { enabled: boolean; schedule: string; vars: string }> = {}
  const regex = / {2}([a-z][a-z0-9-]*):\s*\n((?:\s{4}\S.*\n)*)/g
  let match
  while ((match = regex.exec(yaml)) !== null) {
    const name = match[1]
    const block = match[2]
    skills[name] = {
      enabled: /enabled:\s*true/.test(block),
      schedule: block.match(/schedule:\s*"([^"]*)"/)?.[ 1] || '',
      vars: block.match(/vars:\s*"([^"]*)"/)?.[ 1] || '',
    }
  }
  return skills
}

function extractDescription(content: string): string {
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (fm) {
    const desc = fm[1].match(/description:\s*(.+)/)
    if (desc) return desc[1].trim().replace(/^['"]|['"]$/g, '')
  }
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (t && !t.startsWith('#') && !t.startsWith('---')) {
      return t.length > 120 ? t.slice(0, 117) + '...' : t
    }
  }
  return ''
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET() {
  try {
    const [configResult, skillDirs] = await Promise.all([
      getFileContent('aeon.yml'),
      getDirectory('skills'),
    ])
    const config = parseConfig(configResult.content)
    const dirNames = skillDirs.filter(d => d.type === 'dir').map(d => d.name)

    const descs = await Promise.all(
      dirNames.map(async (name) => {
        try {
          const { content } = await getFileContent(`skills/${name}/SKILL.md`)
          return { name, description: extractDescription(content) }
        } catch {
          return { name, description: '' }
        }
      }),
    )

    const skills = dirNames.map(name => ({
      name,
      description: descs.find(d => d.name === name)?.description || '',
      enabled: config[name]?.enabled ?? false,
      schedule: config[name]?.schedule || '0 12 * * *',
      vars: config[name]?.vars || '',
    }))

    return NextResponse.json({ skills })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { name, enabled, schedule, vars } = await request.json()
    const { content, sha } = await getFileContent('aeon.yml')
    let updated = content

    if (typeof enabled === 'boolean') {
      const re = new RegExp(`(  ${escapeRe(name)}:\\n    enabled: )(true|false)`)
      updated = updated.replace(re, `$1${enabled}`)
    }

    if (typeof schedule === 'string' && schedule) {
      const re = new RegExp(
        `(  ${escapeRe(name)}:\\n    enabled: (?:true|false)\\n    schedule: ")[^"]*"`,
      )
      updated = updated.replace(re, `$1${schedule}"`)
    }

    if (typeof vars === 'string') {
      const escaped = escapeRe(name)
      const hasVars = new RegExp(`  ${escaped}:[\\s\\S]*?vars: "`)
      if (hasVars.test(updated)) {
        // Update existing vars line
        const re = new RegExp(
          `(  ${escaped}:\\n    enabled: (?:true|false)\\n    schedule: "[^"]*"\\n    vars: ")[^"]*"`,
        )
        updated = updated.replace(re, `$1${vars}"`)
      } else if (vars) {
        // Add vars line after schedule
        const re = new RegExp(
          `(  ${escaped}:\\n    enabled: (?:true|false)\\n    schedule: "[^"]*")`,
        )
        updated = updated.replace(re, `$1\n    vars: "${vars}"`)
      }
    }

    if (updated !== content) {
      await updateFile('aeon.yml', updated, sha, `chore: update ${name} config`)
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
