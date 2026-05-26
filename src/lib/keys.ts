import { GitHubError } from './github'

const GRAPHQL = 'https://api.github.com/graphql'
const REST = 'https://api.github.com'

// Discovery — figure out whether 'login' is a user or an org, and if it's
// an org, list the visible members. publicKeys on User is intentionally NOT
// fetched here because it requires read:public_key scope; we hit REST for
// the actual keys instead.
const DISCOVERY = `query OwnerLookup($login: String!) {
  repositoryOwner(login: $login) {
    __typename
    ... on User { login }
    ... on Organization {
      login
      membersWithRole(first: 100) { nodes { login } }
    }
  }
}`

interface UserShape {
  __typename: 'User'
  login: string
}

interface OrgShape {
  __typename: 'Organization'
  login: string
  membersWithRole: { nodes: { login: string }[] }
}

interface OwnerResponse {
  data?: { repositoryOwner: UserShape | OrgShape | null }
  errors?: { message: string }[]
}

interface RestKey {
  id: number
  key: string
}

export interface UserKeys {
  login: string
  keys: string[]
}

export interface KeysResult {
  kind: 'user' | 'organization'
  login: string
  users: UserKeys[]
}

async function fetchUserKeys(login: string, signal?: AbortSignal): Promise<string[]> {
  // /users/{login}/keys is a public REST endpoint — returns every SSH key
  // attached to the user regardless of who's asking, no scope required.
  const res = await fetch(`${REST}/users/${encodeURIComponent(login)}/keys`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal,
  })
  if (!res.ok) {
    if (res.status === 404) return []
    throw new GitHubError(`http ${res.status.toString()} for ${login}/keys`, res.status)
  }
  const json = (await res.json()) as RestKey[]
  return json.map((k) => k.key)
}

export async function fetchKeys(
  token: string,
  login: string,
  signal?: AbortSignal,
): Promise<KeysResult> {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: DISCOVERY, variables: { login } }),
    signal,
  })
  if (res.status === 401) throw new GitHubError('invalid or expired token', 401)
  if (!res.ok) throw new GitHubError(`http ${res.status.toString()}`, res.status)
  const json = (await res.json()) as OwnerResponse
  if (json.errors && json.errors.length > 0) {
    throw new GitHubError(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) throw new GitHubError('malformed response')
  const owner = json.data.repositoryOwner
  if (owner === null) throw new GitHubError(`no user or org named '${login}'`)

  if (owner.__typename === 'User') {
    return {
      kind: 'user',
      login: owner.login,
      users: [{ login: owner.login, keys: await fetchUserKeys(owner.login, signal) }],
    }
  }
  const members = owner.membersWithRole.nodes
  const users = await Promise.all(
    members.map(async (m) => ({ login: m.login, keys: await fetchUserKeys(m.login, signal) })),
  )
  return { kind: 'organization', login: owner.login, users }
}

export function formatAuthorizedKeys(result: KeysResult): string {
  const lines: string[] = []
  for (const user of result.users) {
    for (const key of user.keys) {
      lines.push(`${key} ${user.login}`)
    }
  }
  return lines.join('\n')
}
