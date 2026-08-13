# setup-and-run.ps1
# 사용법: 관리자 권한 PowerShell에서 실행 권장
# 예: powershell -ExecutionPolicy Bypass -File "scripts\setup-and-run.ps1" -ProjectPath "d:\허강\프로그램\DD관리프로그램"
param(
    [string]$ProjectPath = (Get-Location).Path,
    [switch]$PersistPath
)

Write-Host "프로젝트 경로: $ProjectPath"

function Find-NodePaths {
    $result = @{ NodeExe = $null; NpmCmd = $null; CandidateDirs = @() }
    try {
        $nodeWhere = & where.exe node 2>$null | Select-Object -First 1
        if ($nodeWhere) { $result.NodeExe = $nodeWhere }
    } catch { }

    try {
        $npmWhere = & where.exe npm 2>$null | Select-Object -First 1
        if ($npmWhere) { $result.NpmCmd = $npmWhere }
    } catch { }

    $common = @( 
        "C:\Program Files\nodejs",
        "C:\Program Files (x86)\nodejs",
        "$Env:USERPROFILE\AppData\Roaming\nvm",
        "$Env:LOCALAPPDATA\Programs\Microsoft VS Code\bin",
        "$Env:USERPROFILE\AppData\Roaming\npm"
    )
    foreach ($d in $common) { if (Test-Path $d) { $result.CandidateDirs += $d } }

    if (-not $result.NpmCmd) {
        foreach ($d in $result.CandidateDirs) {
            $npmCmd = Join-Path $d "npm.cmd"
            if (Test-Path $npmCmd) { $result.NpmCmd = $npmCmd; break }
        }
    }

    if (-not $result.NodeExe) {
        foreach ($d in $result.CandidateDirs) {
            $nodeExe = Join-Path $d "node.exe"
            if (Test-Path $nodeExe) { $result.NodeExe = $nodeExe; break }
        }
    }
    return $result
}

$paths = Find-NodePaths
Write-Host "node.exe 경로: $($paths.NodeExe)"
Write-Host "npm.cmd 경로: $($paths.NpmCmd)"

if (-not $paths.NpmCmd) {
    Write-Warning "현재 세션에서 'npm'을 찾을 수 없습니다. 가능한 설치 경로 후보: $($paths.CandidateDirs -join ', ')"
    if ($paths.CandidateDirs.Count -gt 0) {
        $first = $paths.CandidateDirs[0]
        Write-Host "세션에 '$first'를 추가 시도합니다..."
        $env:Path = $env:Path + ";$first"
        Write-Host "다시 확인:"
        & where.exe npm 2>$null | ForEach-Object { Write-Host $_ }
        if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
            Write-Warning "세션 추가 후에도 'npm'이 인식되지 않습니다. 설치 프로그램에서 'Add to PATH'를 선택해서 재설치하시거나, 아래 명령으로 사용자 PATH에 추가하세요."
            Write-Host "권장: 관리자 권한으로 PowerShell을 열고 다음 실행:" -ForegroundColor Cyan
            Write-Host "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ';$first', 'User')"
            exit 1
        }
    } else {
        Write-Warning "가능한 Node 설치 경로를 찾지 못했습니다. Node.js가 올바르게 설치되었는지 확인하세요."
        exit 1
    }
}

# 여기까지 npm이 인식되는지 보장
Write-Host "npm 버전:"; npm --version
Write-Host "node 버전:"; node --version

# 의존성 설치
if (-not (Test-Path (Join-Path $ProjectPath 'package.json'))) {
    Write-Warning "$ProjectPath 에 package.json 이 없습니다. 경로를 확인하세요."
    exit 1
}

Push-Location $ProjectPath
try {
    Write-Host "의존성 설치 시작 (npm install)..."
    npm install
} catch {
    Write-Error "npm install 중 오류 발생: $_"
    Pop-Location
    exit 1
}

Write-Host "의존성 설치 완료. 개발서버 시작 (npm run dev)..."
Write-Host "주의: 이 명령은 개발 서버를 시작하고 출력을 계속 표시합니다. Ctrl+C로 중지하세요."

npm run dev

Pop-Location
