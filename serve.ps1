# serve.ps1
# Servidor web local ligero para ejecutar OrbiMind con soporte PWA completo.
# Ejecuta este archivo en PowerShell.

$port = 8003
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "      OrbiMind - Servidor Web Local" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "Servidor ejecutandose en: http://localhost:$port/" -ForegroundColor Green
    Write-Host "Abre esta direccion en Google Chrome o Microsoft Edge." -ForegroundColor Yellow
    Write-Host "Veras un boton de instalar (icono de pantalla con flecha)" -ForegroundColor Yellow
    Write-Host "en la barra de direcciones para agregarlo a tu escritorio." -ForegroundColor Yellow
    Write-Host "Presiona CTRL+C en esta consola para detener el servidor." -ForegroundColor Red
    Write-Host "=============================================" -ForegroundColor Cyan

    # Abrir el navegador por defecto automáticamente
    Start-Process "http://localhost:$port/"

    while ($listener.IsListening) {
        $context = $null
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $path = $request.Url.LocalPath
            if ($path -eq "/") {
                $path = "/index.html"
            }

            # Asegurar la ruta al archivo local correspondiente
            $filePath = Join-Path $PSScriptRoot $path

            if (Test-Path $filePath -PathType Leaf) {
                [byte[]]$bytes = [System.IO.File]::ReadAllBytes($filePath)
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($extension) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "text/javascript; charset=utf-8" }
                    ".json" { "application/json" }
                    ".png"  { "image/png" }
                    default { "application/octet-stream" }
                }
                Write-Host "Sirviendo: $path ($($bytes.Length) bytes, $contentType)" -ForegroundColor Cyan
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
                $response.Headers.Add("Pragma", "no-cache")
                $response.Headers.Add("Expires", "0")
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                Write-Host "No encontrado: $path" -ForegroundColor Red
                $response.StatusCode = 404
                [byte[]]$errorBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $errorBytes.Length
                $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
            }
        } catch {
            Write-Host "Advertencia: Error procesando peticion: $_" -ForegroundColor Yellow
        } finally {
            if ($null -ne $context) {
                try {
                    $context.Response.Close()
                } catch {
                    # Ignorar errores al cerrar la respuesta
                }
            }
        }
    }
} catch {
    Write-Error $_
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
}
