param(
  [string]$Token = $env:GITHUB_TOKEN,
  [string]$Owner,
  [string]$Repo = "liberchill-vibe"
)

$ErrorActionPreference = "Stop"

if (-not $Token) {
  throw "Provide a GitHub token with repo permissions through -Token or GITHUB_TOKEN."
}

if (-not $Owner) {
  throw "Provide your GitHub username through -Owner."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiHeaders = @{
  Authorization = "Bearer $Token"
  Accept        = "application/vnd.github+json"
  "User-Agent"  = "codex-deploy-script"
}

function Get-RelativeProjectPath {
  param(
    [string]$Root,
    [string]$FullName
  )

  $normalizedRoot = [System.IO.Path]::GetFullPath($Root)
  $normalizedFullName = [System.IO.Path]::GetFullPath($FullName)

  if (-not $normalizedRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $normalizedRoot += [System.IO.Path]::DirectorySeparatorChar
  }

  if ($normalizedFullName.StartsWith($normalizedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $normalizedFullName.Substring($normalizedRoot.Length).Replace("\", "/")
  }

  throw "File '$FullName' is outside project root '$Root'."
}

function Get-EncodedContentPath {
  param(
    [string]$RelativePath
  )

  $segments = $RelativePath -split "/"
  $encodedSegments = @()

  foreach ($segment in $segments) {
    $encodedSegments += [System.Uri]::EscapeDataString($segment)
  }

  return ($encodedSegments -join "/")
}

function Get-HttpStatusCode {
  param(
    [System.Exception]$Exception
  )

  if ($Exception -and $Exception.Response -and $Exception.Response.StatusCode) {
    return [int]$Exception.Response.StatusCode
  }

  return $null
}

function Get-BranchState {
  param(
    [string]$Owner,
    [string]$Repo,
    [string]$Branch
  )

  $encodedBranch = [System.Uri]::EscapeDataString($Branch)

  for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
      $branchResponse = Invoke-GitHub -Method GET -Uri "https://api.github.com/repos/$Owner/$Repo/branches/$encodedBranch"
      return @{
        CommitSha = $branchResponse.commit.sha
        TreeSha   = $branchResponse.commit.commit.tree.sha
      }
    } catch {
      $statusCode = Get-HttpStatusCode -Exception $_.Exception
      if ($statusCode -eq 404 -and $attempt -lt 4) {
        Start-Sleep -Milliseconds 1200
        continue
      }

      throw
    }
  }

  throw "Unable to load branch state for '$Branch'."
}

function Invoke-GitHub {
  param(
    [string]$Method,
    [string]$Uri,
    [object]$Body = $null
  )

  $params = @{
    Method      = $Method
    Uri         = $Uri
    Headers     = $apiHeaders
    ErrorAction = "Stop"
  }

  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = $Body | ConvertTo-Json -Depth 10
  }

  Invoke-RestMethod @params
}

try {
  $repoResponse = Invoke-GitHub -Method GET -Uri "https://api.github.com/repos/$Owner/$Repo"
} catch {
  $repoResponse = Invoke-GitHub -Method POST -Uri "https://api.github.com/user/repos" -Body @{
    name      = $Repo
    private   = $false
    auto_init = $true
  }
}

$defaultBranch = $repoResponse.default_branch
if (-not $defaultBranch) {
  $repoResponse = Invoke-GitHub -Method GET -Uri "https://api.github.com/repos/$Owner/$Repo"
  $defaultBranch = $repoResponse.default_branch
}

$files = Get-ChildItem -Path $projectRoot -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\.edge-profile\\" -and
    $_.Name -ne "preview.png"
  }

$branchState = Get-BranchState -Owner $Owner -Repo $Repo -Branch $defaultBranch
$treeEntries = @()

foreach ($file in $files) {
  $relativePath = Get-RelativeProjectPath -Root $projectRoot -FullName $file.FullName
  $content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($file.FullName))
  $blob = Invoke-GitHub -Method POST -Uri "https://api.github.com/repos/$Owner/$Repo/git/blobs" -Body @{
    content  = $content
    encoding = "base64"
  }

  $treeEntries += @{
    path = $relativePath
    mode = "100644"
    type = "blob"
    sha  = $blob.sha
  }
}

$treeResponse = Invoke-GitHub -Method POST -Uri "https://api.github.com/repos/$Owner/$Repo/git/trees" -Body @{
  base_tree = $branchState.TreeSha
  tree      = $treeEntries
}

$commitResponse = Invoke-GitHub -Method POST -Uri "https://api.github.com/repos/$Owner/$Repo/git/commits" -Body @{
  message = "Deploy Liberchill Vibe site"
  tree    = $treeResponse.sha
  parents = @($branchState.CommitSha)
}

Invoke-GitHub -Method PATCH -Uri "https://api.github.com/repos/$Owner/$Repo/git/refs/heads/$defaultBranch" -Body @{
  sha = $commitResponse.sha
} | Out-Null

try {
  Invoke-GitHub -Method POST -Uri "https://api.github.com/repos/$Owner/$Repo/pages" -Body @{
    source = @{
      branch = $defaultBranch
      path   = "/"
    }
  } | Out-Null
} catch {
  Invoke-GitHub -Method PUT -Uri "https://api.github.com/repos/$Owner/$Repo/pages" -Body @{
    source = @{
      branch = $defaultBranch
      path   = "/"
    }
  } | Out-Null
}

$pagesUrl = "https://$Owner.github.io/$Repo/"
Write-Output $pagesUrl
