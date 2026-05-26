import { GitHubError } from './github'

const ENDPOINT = 'https://api.github.com/graphql'

const QUERY = `query KeysFor($login: String!) {
  repositoryOwner(login: $login) {
    __typename
    ... on User {
      login
      publicKeys(first: 100) { nodes { key } }
    }
    ... on Organization {
      login
      membersWithRole(first: 100) {
        nodes {
          login
          publicKeys(first: 100) { nodes { key } }
        }
      }
    }
  }
}`

interface KeyNode {
  key: string
}

interface UserKeysShape {
  __typename: 'User'
  login: string
  publicKeys: { nodes: KeyNode[] }
}

interface OrgKeysShape {
  __typename: 'Organization'
  login: string
  membersWithRole: {
    nodes: {
      login: string
      publicKeys: { nodes: KeyNode[] }
    }[]
  }
}

interface OwnerResponse {
  data?: { repositoryOwner: UserKeysShape | OrgKeysShape | null }
  errors?: { message: string }[]
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

export async function fetchKeys(
  token: string,
  login: string,
  signal?: AbortSignal,
): Promise<KeysResult> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
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
      users: [{ login: owner.login, keys: owner.publicKeys.nodes.map((n) => n.key) }],
    }
  }
  return {
    kind: 'organization',
    login: owner.login,
    users: owner.membersWithRole.nodes.map((m) => ({
      login: m.login,
      keys: m.publicKeys.nodes.map((n) => n.key),
    })),
  }
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

export function usersWithoutKeys(result: KeysResult): string[] {
  return result.users.filter((u) => u.keys.length === 0).map((u) => u.login)
}
