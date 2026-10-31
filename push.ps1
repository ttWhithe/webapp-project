$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Очищаем очередь на всякий случай (файлы не удаляются)
git reset

# 1. Заливаем оружие порциями по 25 штук
$weapons = Get-ChildItem -File "frontend/public/images/weapons" | Select-Object -ExpandProperty Name
$chunkSize = 25
$totalChunks = [math]::Ceiling($weapons.Count / $chunkSize)
for ($i = 0; $i -lt $totalChunks; $i++) {
    $start = $i * $chunkSize
    $end = [math]::Min(($i + 1) * $chunkSize - 1, $weapons.Count - 1)
    $chunk = $weapons[$start..$end]
    foreach ($w in $chunk) { git add "frontend/public/images/weapons/$w" }
    Write-Host "Отправляем оружие: часть $($i+1) из $totalChunks..." -ForegroundColor Cyan
    git commit -m "assets: weapons ($($i+1)/$totalChunks)"
    git push
}

# 2. Заливаем персонажей порциями по 10 штук
$chars = Get-ChildItem -Directory "frontend/public/images/characters" | Select-Object -ExpandProperty Name
$chunkSize = 10
$totalChunks = [math]::Ceiling($chars.Count / $chunkSize)
for ($i = 0; $i -lt $totalChunks; $i++) {
    $start = $i * $chunkSize
    $end = [math]::Min(($i + 1) * $chunkSize - 1, $chars.Count - 1)
    $chunk = $chars[$start..$end]
    foreach ($c in $chunk) { git add "frontend/public/images/characters/$c" }
    Write-Host "Отправляем персонажей: часть $($i+1) из $totalChunks..." -ForegroundColor Cyan
    git commit -m "assets: character images ($($i+1)/$totalChunks)"
    git push
}
Write-Host "Все части успешно загружены!" -ForegroundColor Green
