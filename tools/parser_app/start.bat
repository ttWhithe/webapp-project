@echo off
cd /d "%~dp0"
call venv\Scripts\activate.bat

echo === STARTING HEROES PARSER ===
python parser_heroes.py --all

echo.
echo === STARTING WEAPONS PARSER ===
python parser_weapons.py --all

echo.
echo === STARTING ARTIFACTS PARSER ===
python parser_artifacts.py

pause
