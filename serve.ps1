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

  Write-Host "Port $Port is already in use."
  Write-Host "Open: $prefix"
  if ($existing) {
    Write-Host "serve.ps1 already running (PID $existing). Stop: Stop-Process -Id $existing -Force"
  } else {
    Write-Host "Free port $Port, then run serve.ps1 again."
  }
  exit 1
}

Write-Host "Folio: $prefix"
Write-Host "Press Ctrl+C to stop."

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
