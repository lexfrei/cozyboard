import type {
  AuthorAssociation,
  CheckStatus,
  Label,
  Mergeable,
  PullRequest,
  RepoGroup,
  ReviewDecision,
  ReviewState,
} from './types'

const ENDPOINT = 'https://api.github.com/graphql'

const QUERY = `query CozystackPRs($search: String!, $cursor: String) {
  search(query: $search, type: ISSUE, first: 50, after: $cursor) {
    pageInfo { endCursor hasNextPage }
    issueCount
    nodes {
      ... on PullRequest {
        id
        number
        title
        url
        author { login }
        authorAssociation
        createdAt
        updatedAt
        isDraft
        additions
        deletions
        changedFiles
        labels(first: 20) { nodes { name color } }
        repository { name nameWithOwner }
        reviewDecision
        mergeable
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state } } }
        }
        reviewRequests(first: 20) {
          nodes {
            requestedReviewer {
              __typename
              ... on User { login }
            }
          }
        }
        viewerLatestReview { state }
      }
    }
  }
}`

export interface RawPR {
  id: string
  number: number
  title: string
  url: string
  author: { login: string } | null
  authorAssociation: AuthorAssociation
  createdAt: string
  updatedAt: string
  isDraft: boolean
  additions: number
  deletions: number
  changedFiles: number
  labels: { nodes: Label[] }
  repository: { name: string; nameWithOwner: string }
  reviewDecision: ReviewDecision
  mergeable: Mergeable
  commits: { nodes: { commit: { statusCheckRollup: { state: CheckStatus } | null } }[] }
  reviewRequests: {
    nodes: { requestedReviewer: { __typename: string; login?: string | null } | null }[]
  }
  viewerLatestReview: { state: ReviewState } | null
}

interface SearchResponse {
  data?: {
    search: {
      pageInfo: { endCursor: string | null; hasNextPage: boolean }
      issueCount: number
      nodes: RawPR[]
    }
  }
  errors?: { message: string }[]
}

export function transformPR(raw: RawPR): PullRequest {
  const firstCommit = raw.commits.nodes[0]
  const statusCheckRollup = firstCommit?.commit.statusCheckRollup?.state ?? null
  const reviewRequests = raw.reviewRequests.nodes
    .map((node) => node.requestedReviewer)
    .filter(
      (reviewer): reviewer is { __typename: string; login: string } =>
        reviewer !== null && typeof reviewer.login === 'string',
    )
    .map((reviewer) => ({ login: reviewer.login }))
  return {
    id: raw.id,
    number: raw.number,
    title: raw.title,
    url: raw.url,
    author: raw.author,
    authorAssociation: raw.authorAssociation,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    isDraft: raw.isDraft,
    additions: raw.additions,
    deletions: raw.deletions,
    changedFiles: raw.changedFiles,
    labels: raw.labels.nodes,
    repository: raw.repository,
    reviewDecision: raw.reviewDecision,
    mergeable: raw.mergeable,
    statusCheckRollup,
    reviewRequests,
    viewerLatestReviewState: raw.viewerLatestReview?.state ?? null,
  }
}

export function groupByRepo(prs: PullRequest[]): RepoGroup[] {
  const byRepo = new Map<string, RepoGroup>()
  for (const pr of prs) {
    const key = pr.repository.nameWithOwner
    const existing = byRepo.get(key)
    if (existing) {
      existing.pullRequests.push(pr)
    } else {
      byRepo.set(key, {
        name: pr.repository.name,
        nameWithOwner: key,
        pullRequests: [pr],
      })
    }
  }
  for (const group of byRepo.values()) {
    group.pullRequests.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  }
  return [...byRepo.values()].sort((a, b) => b.pullRequests.length - a.pullRequests.length)
}

export class GitHubError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
  }
}

export async function fetchPRsBySearch(
  token: string,
  search: string,
  signal: AbortSignal | undefined,
  context: string = search,
): Promise<PullRequest[]> {
  const all: PullRequest[] = []
  let cursor: string | null = null
  // GitHub search caps results at 1000; cap pagination to avoid an infinite loop on a malformed response.
  for (let page = 0; page < 20; page++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: QUERY, variables: { search, cursor } }),
      signal,
    })
    if (res.status === 401) throw new GitHubError('invalid or expired token', 401)
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining')
      throw new GitHubError(remaining === '0' ? 'rate limit exhausted' : 'forbidden', 403)
    }
    if (!res.ok) {
      throw new GitHubError(`http ${res.status.toString()} for ${context}`, res.status)
    }
    const json = (await res.json()) as SearchResponse
    if (json.errors && json.errors.length > 0) {
      throw new GitHubError(`${context}: ${json.errors.map((e) => e.message).join('; ')}`)
    }
    if (!json.data) throw new GitHubError(`malformed graphql response for ${context}`)
    const { search: s } = json.data
    for (const node of s.nodes) {
      all.push(transformPR(node))
    }
    if (!s.pageInfo.hasNextPage) break
    cursor = s.pageInfo.endCursor
    if (cursor === null) break
  }
  return all
}

export async function fetchOpenPRs(
  token: string,
  orgs: string[],
  signal?: AbortSignal,
): Promise<RepoGroup[]> {
  if (orgs.length === 0) return []
  const perOrg = await Promise.all(
    orgs.map((org) =>
      fetchPRsBySearch(
        token,
        `is:pr state:open draft:false org:${org} archived:false`,
        signal,
        `org:${org}`,
      ),
    ),
  )
  return groupByRepo(perOrg.flat())
}

export async function fetchMyOpenPRs(
  token: string,
  viewer: string,
  signal?: AbortSignal,
): Promise<RepoGroup[]> {
  const prs = await fetchPRsBySearch(
    token,
    `is:pr state:open author:${viewer} archived:false`,
    signal,
    `author:${viewer}`,
  )
  return groupByRepo(prs)
}

interface ViewerResponse {
  data?: { viewer: { login: string } }
  errors?: { message: string }[]
}

export async function fetchViewer(token: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: '{ viewer { login } }' }),
    signal,
  })
  if (res.status === 401) throw new GitHubError('invalid or expired token', 401)
  if (!res.ok) throw new GitHubError(`http ${res.status.toString()}`, res.status)
  const json = (await res.json()) as ViewerResponse
  if (json.errors && json.errors.length > 0) {
    throw new GitHubError(json.errors.map((e) => e.message).join('; '))
  }
  if (!json.data) throw new GitHubError('malformed viewer response')
  return json.data.viewer.login
}
