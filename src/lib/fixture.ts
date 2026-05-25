import type { PullRequest, RepoGroup } from './types'

type Spec = { id: string; number: number; title: string; repo: string } & Partial<
  Omit<PullRequest, 'repository' | 'url'>
>

function makePR(spec: Spec): PullRequest {
  const { repo, ...overrides } = spec
  const now = Date.now()
  return {
    author: { login: 'fixture-bot' },
    createdAt: new Date(now - 86_400_000).toISOString(),
    updatedAt: new Date(now - 3_600_000).toISOString(),
    isDraft: false,
    additions: 42,
    deletions: 7,
    changedFiles: 3,
    labels: [],
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    statusCheckRollup: 'SUCCESS',
    reviewRequests: [],
    ...overrides,
    url: `https://github.com/cozystack/${repo}/pull/${spec.number.toString()}`,
    repository: { name: repo, nameWithOwner: `cozystack/${repo}` },
  }
}

export const FIXTURE_GROUPS: RepoGroup[] = [
  {
    name: 'cozystack',
    nameWithOwner: 'cozystack/cozystack',
    pullRequests: [
      makePR({
        id: 'PR_1',
        number: 1234,
        title: 'feat(apps): add immich application package',
        repo: 'cozystack',
        author: { login: 'kvaps' },
        additions: 412,
        deletions: 0,
        mergeable: 'CONFLICTING',
        labels: [
          { name: 'kind/feature', color: '00ddaa' },
          { name: 'area/apps', color: '88aaff' },
        ],
      }),
      makePR({
        id: 'PR_2',
        number: 1233,
        title: 'fix(system/cilium): bump to 1.16.5 for CVE-2024-XXXX',
        repo: 'cozystack',
        author: { login: 'lexfrei' },
        additions: 12,
        deletions: 8,
        statusCheckRollup: 'FAILURE',
        reviewDecision: 'REVIEW_REQUIRED',
        reviewRequests: [{ login: 'kvaps' }],
        labels: [{ name: 'priority/critical', color: 'ff5566' }],
      }),
      makePR({
        id: 'PR_3',
        number: 1232,
        title: 'docs: clarify zfs pool sizing requirements',
        repo: 'cozystack',
        reviewDecision: 'CHANGES_REQUESTED',
        statusCheckRollup: 'PENDING',
        author: { login: 'newcomer' },
      }),
      makePR({
        id: 'PR_4',
        number: 1231,
        title: 'chore(deps): bump golangci-lint',
        repo: 'cozystack',
        reviewDecision: 'APPROVED',
      }),
      makePR({
        id: 'PR_8',
        number: 1230,
        title: 'wip: experimental kata-containers runtime',
        repo: 'cozystack',
        statusCheckRollup: 'ERROR',
        reviewRequests: [{ login: 'kvaps' }],
        labels: [{ name: 'kind/experimental', color: 'aa00ff' }],
      }),
    ],
  },
  {
    name: 'console',
    nameWithOwner: 'cozystack/console',
    pullRequests: [
      makePR({
        id: 'PR_5',
        number: 88,
        title: 'feat(ui): pagination on tenants page',
        repo: 'console',
        statusCheckRollup: null,
        author: { login: 'fronter' },
      }),
      makePR({
        id: 'PR_6',
        number: 87,
        title: 'fix: dark theme contrast on login screen',
        repo: 'console',
        statusCheckRollup: 'EXPECTED',
        reviewRequests: [{ login: 'designer' }],
      }),
    ],
  },
  {
    name: 'cozystack-talm',
    nameWithOwner: 'cozystack/cozystack-talm',
    pullRequests: [
      makePR({
        id: 'PR_7',
        number: 12,
        title: 'feat: vmware-paravirtual extension',
        repo: 'cozystack-talm',
        labels: [{ name: 'area/talos', color: 'ff8800' }],
      }),
    ],
  },
]
