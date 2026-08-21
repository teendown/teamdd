@echo off
chcp 65001 > nul
cd /d "%~dp0"
python print_number_macro.py
pause
