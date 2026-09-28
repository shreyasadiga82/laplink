Write-Host "Running Environment Check for LapLink..."
$issues = 0

# Check OS
$os = Get-CimInstance Win32_OperatingSystem
Write-Host "OS: $($os.Caption)"

# Check GPU
$gpus = Get-CimInstance Win32_VideoController
foreach ($g in $gpus) {
    Write-Host "GPU: $($g.Name)"
}
$nvidia = $gpus | Where-Object { $_.Name -match "NVIDIA" }
if (-not $nvidia) {
    Write-Host "WARNING: No NVIDIA GPU detected. Software encoding fallback will be used." -ForegroundColor Yellow
}

# Check Python
try {
    $pyVersion = & python --version 2>&1
    Write-Host "Python: $pyVersion"
} catch {
    Write-Host "WARNING: Python not found." -ForegroundColor Yellow
}

# Check Node
try {
    $nodeVersion = & node --version 2>&1
    Write-Host "Node.js: $nodeVersion"
} catch {
    Write-Host "WARNING: Node.js not found." -ForegroundColor Yellow
}

# Check GStreamer
if (Get-Command gst-launch-1.0 -ErrorAction SilentlyContinue) {
    Write-Host "GStreamer: Found in PATH"
} elseif (Test-Path "C:\gstreamer") {
    Write-Host "GStreamer: Found at C:\gstreamer"
} else {
    Write-Host "WARNING: GStreamer not found. You will need to install it for WebRTC." -ForegroundColor Yellow
}

Write-Host "Check completed."
