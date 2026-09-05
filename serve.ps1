param(
  [int]$Port = 5173
)

$root = $PSScriptRoot
$prefix = "http://127.0.0.1:$Port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch [System.Net.HttpListenerException] {
  $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'serve\.ps1' -and $_.ProcessId -ne $PID } |
    Select-Object -ExpandProperty ProcessId -First 1

  Write-Host "Порт $Port уже занят — второй экземпляр serve.ps1 не нужен."
  Write-Host "Откройте: $prefix"
  if ($existing) {
    Write-Host "Уже запущен процесс serve.ps1 (PID $existing). Остановка: Stop-Process -Id $existing -Force"
  } else {
    Write-Host "Перезапуск: найдите процесс на порту $Port и остановите его, затем снова запустите serve.ps1."
  }
  exit 1
}

Write-Host "Folio запущен: $prefix"
Write-Host "Нажмите Ctrl+C для остановки."

$types = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
    $file = Join-Path $root $path
    $full = [System.IO.Path]::GetFullPath($file)

    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $full -PathType Leaf)) {
      $ctx.Response.StatusCode = 404
      $ctx.Response.Close()
      continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
    $ctx.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" })
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $ctx.Response.Close()
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
