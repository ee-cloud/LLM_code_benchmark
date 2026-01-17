# PowerShell 用 devserver スクリプト（修正版）
$ErrorActionPreference = "Stop"

$env:Path += ";C:\Program Files\Git\usr\bin"

# プロジェクトのルートディレクトリを取得
$ROOT_DIR = (Resolve-Path "$PSScriptRoot\..\..").Path
$VENV_DIR = "$ROOT_DIR\.venv"

# 1. 仮想環境の作成
if (-not (Test-Path "$VENV_DIR")) {
    Write-Host "[devserver] Creating virtual environment at $VENV_DIR" -ForegroundColor Cyan
    python -m venv "$VENV_DIR"
}

# 2. 仮想環境の有効化
$VENV_ACTIVATE = "$VENV_DIR\Scripts\Activate.ps1"
& $VENV_ACTIVATE

# プロジェクトルートへ移動
Set-Location $ROOT_DIR

# 3. 依存ライブラリのチェックとインストール
Write-Host "[devserver] Checking Python dependencies..." -ForegroundColor Cyan
try {
    # 簡易的なチェック
    python -c "import fastapi, uvicorn" 2>$null
} catch {
    Write-Host "[devserver] Installing Python dependencies..." -ForegroundColor Yellow
    python -m pip install --disable-pip-version-check -q --upgrade pip
    #python -m pip install --disable-pip-version-check -r "$ROOT_DIR\server\requirements.txt"
    python -m pip install --disable-pip-version-check -r "$ROOT_DIR\scripts\win\requirements_win.txt"
}

# 4. サーバー (Uvicorn) の起動
Write-Host "[devserver] Starting Uvicorn server..." -ForegroundColor Cyan
# $serverProcess = Start-Process python -ArgumentList "-m uvicorn server.api:app" -PassThru -NoNewWindow
$serverProcess = Start-Process python -ArgumentList "-m uvicorn server.api:app --loop asyncio" -PassThru -NoNewWindow

# 終了時のクリーンアップ設定
$cleanup = {
    param($proc)
    if ($proc -and -not $proc.HasExited) {
        Write-Host "`n[devserver] Stopping server..." -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force
    }
}

# 5. サーバーの起動待ち (ポーリング)
$host_addr = if ($env:DEVSERVER_HOST) { $env:DEVSERVER_HOST } else { "127.0.0.1" }
$port = if ($env:DEVSERVER_PORT) { $env:DEVSERVER_PORT } else { 8000 }

# 変数名を ${} で囲んで修正
Write-Host "[devserver] Waiting for server to respond at http://${host_addr}:${port} ..." -ForegroundColor Gray
$connected = $false
for ($i = 0; $i -lt 50; $i++) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect($host_addr, $port)
        $connected = $true
        $tcp.Close()
        break
    } catch {
        Start-Sleep -Milliseconds 200
    }
}

# 6. ブラウザの起動
if ($connected -and -not $env:DEVSERVER_NO_REFRESH) {
    # 変数名を ${} で囲んで修正
    $url = "http://${host_addr}:${port}/ui/index.html"
    Write-Host "[devserver] Opening browser: $url" -ForegroundColor Green
    Start-Process $url
}

# サーバープロセスが終了するまで待機
try {
    $serverProcess | Wait-Process
} finally {
    & $cleanup $serverProcess
}