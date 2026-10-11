@echo off
cd /d "%~dp0"
start "Docker Compose"  cmd /k "docker compose up"
start "Frontend Dev"    cmd /k "cd frontend && npm run dev"
start "Project Console" cmd /k
