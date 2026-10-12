@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem === 1. Запуск Docker Desktop от администратора, если он ещё не запущен ===
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>NUL | find /I "Docker Desktop.exe" >NUL
if not errorlevel 1 (
    echo [Docker] Docker Desktop уже запущен.
    goto wait_docker
)

echo [Docker] Docker Desktop не запущен. Ищу...
set "DOCKER_EXE="
set "DOCKER_LNK="

rem Основной пользовательский путь
if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" set "DOCKER_EXE=%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"

rem Дополнительные возможные пути
if not defined DOCKER_EXE if exist "%LOCALAPPDATA%\Docker\Docker Desktop.exe" set "DOCKER_EXE=%LOCALAPPDATA%\Docker\Docker Desktop.exe"
if not defined DOCKER_EXE if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" set "DOCKER_EXE=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
if not defined DOCKER_EXE if exist "%ProgramFiles(x86)%\Docker\Docker\Docker Desktop.exe" set "DOCKER_EXE=%ProgramFiles(x86)%\Docker\Docker\Docker Desktop.exe"

rem Если exe не найден — пробуем ярлык на рабочем столе
if not defined DOCKER_EXE if exist "%USERPROFILE%\Desktop\Docker Desktop.lnk" set "DOCKER_LNK=%USERPROFILE%\Desktop\Docker Desktop.lnk"
if not defined DOCKER_EXE if not defined DOCKER_LNK if exist "%USERPROFILE%\OneDrive\Desktop\Docker Desktop.lnk" set "DOCKER_LNK=%USERPROFILE%\OneDrive\Desktop\Docker Desktop.lnk"
if not defined DOCKER_EXE if not defined DOCKER_LNK if exist "%PUBLIC%\Desktop\Docker Desktop.lnk" set "DOCKER_LNK=%PUBLIC%\Desktop\Docker Desktop.lnk"

if defined DOCKER_EXE (
    echo [Docker] Найден: "%DOCKER_EXE%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%DOCKER_EXE%' -Verb RunAs"
) else if defined DOCKER_LNK (
    echo [Docker] Найден ярлык: "%DOCKER_LNK%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%DOCKER_LNK%' -Verb RunAs"
) else (
    echo [Docker] Docker Desktop.exe не найден.
    echo [Docker] Запустите Docker Desktop вручную, затем нажмите любую клавишу...
    pause >nul
)

:wait_docker
echo [Docker] Ожидание готовности Docker...
set /a DOCKER_WAIT=0

:wait_docker_loop
docker info >nul 2>&1
if not errorlevel 1 goto docker_ready

set /a DOCKER_WAIT+=1
if %DOCKER_WAIT% GEQ 60 (
    echo [Docker] Не дождался за 120 секунд. Продолжаю...
    goto docker_ready
)

timeout /t 2 /nobreak >nul
goto wait_docker_loop

:docker_ready
echo [Docker] Готово.

start "Docker Compose" cmd /k "docker compose up"
start "Frontend Dev"    cmd /k "cd frontend && npm run dev"
start "Project Console" cmd /k

endlocal
