export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null

export type Mergeable = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'

export type CheckStatus = 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED' | null

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

export type AuthorAssociation =
  | 'OWNER'
  | 'MEMBER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'MANNEQUIN'
  | 'NONE'

export type ReviewState =
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'COMMENTED'
  | 'DISMISSED'
  | 'PENDING'

export interface PullRequest {
  id: string
  number: number
  title: string
  url: string
  author: Actor | null
  authorAssociation: AuthorAssociation
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
  viewerLatestReviewState: ReviewState | null
}

export interface RepoGroup {
  name: string
  nameWithOwner: string
  pullRequests: PullRequest[]
}
