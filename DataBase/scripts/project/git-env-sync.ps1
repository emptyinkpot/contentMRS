param(
    [Parameter(Position = 0)]
    [ValidateSet('status', 'start-local', 'start-remote-ide', 'sync-env', 'promote')]
    [string]$Command = 'status',

    [string]$RepoRoot,
    [string]$TaskBranch,
    [string]$FromBranch,
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

if (-not $RepoRoot) {
    $scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
    $RepoRoot = (Resolve-Path (Join-Path $scriptRoot '..\..')).Path
}

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & git -C $RepoRoot @Args
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
    }
}

function Require-CleanWorktree {
    $status = & git -C $RepoRoot status --porcelain
    if ($LASTEXITCODE -ne 0) {
        throw 'git status failed'
    }
    if ($status) {
        throw "Worktree is dirty. Commit, stash, or revert unrelated changes before this operation.`n$status"
    }
}

function Sync-BranchFromMain {
    param([string]$Branch)
    Require-CleanWorktree
    Invoke-Git fetch origin --prune
    Invoke-Git switch $Branch
    Invoke-Git merge --ff-only origin/main
}

switch ($Command) {
    'status' {
        Invoke-Git fetch origin --prune
        Invoke-Git status --short --branch
        Write-Output ''
        Invoke-Git branch -vv
        Write-Output ''
        Invoke-Git log --oneline --decorate -5
    }
    'start-local' {
        Sync-BranchFromMain -Branch 'local'
        Write-Output 'Local debug lane is up to date with origin/main.'
    }
    'start-remote-ide' {
        Sync-BranchFromMain -Branch 'remote-ide'
        Write-Output 'Remote IDE debug lane is up to date with origin/main.'
    }
    'sync-env' {
        Require-CleanWorktree
        Invoke-Git fetch origin --prune
        Invoke-Git switch main
        Invoke-Git pull --ff-only origin main
        Invoke-Git push origin main:local main:remote-ide
        Invoke-Git fetch origin local remote-ide
        Write-Output 'local and remote-ide now match main.'
    }
    'promote' {
        if (-not $TaskBranch) {
            throw 'promote requires -TaskBranch task/<name>'
        }
        if (-not $FromBranch) {
            throw 'promote requires -FromBranch local or remote-ide'
        }
        if ($FromBranch -notin @('local', 'remote-ide')) {
            throw '-FromBranch must be local or remote-ide'
        }

        Require-CleanWorktree
        Invoke-Git fetch origin --prune
        Invoke-Git switch -c $TaskBranch origin/main

        Write-Output "Created $TaskBranch from origin/main."
        Write-Output "Review environment diff before cherry-picking:"
        Invoke-Git diff --stat "origin/main..origin/$FromBranch"
        Write-Output ''
        Write-Output "Next: cherry-pick selected commits or apply a scoped patch from origin/$FromBranch."
        if ($Push) {
            Invoke-Git push -u origin $TaskBranch
        }
    }
}
