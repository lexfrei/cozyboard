export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null

export type Mergeable = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'

export type CheckStatus = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'EXPECTED' | null

export type BlockerCategory =
  | 'conflict'
  | 'ci-fail'
  | 'changes-requested'
  | 'no-reviewers'
  | 'awaiting-review'
  | 'approved'

export interface Label {
  name: string
  color: string
}

export interface Actor {
  login: string
}

export interface PullRequest {
  id: string
  number: number
  title: string
  url: string
  author: Actor | null
  createdAt: string
  updatedAt: string
  isDraft: boolean
  additions: number
  deletions: number
  changedFiles: number
  labels: Label[]
  repository: { name: string; nameWithOwner: string }
  reviewDecision: ReviewDecision
  mergeable: Mergeable
  statusCheckRollup: CheckStatus
  reviewRequests: Actor[]
}

export interface RepoGroup {
  name: string
  nameWithOwner: string
  pullRequests: PullRequest[]
}
