@echo off
chcp 65001 > nul
cd /d "%~dp0"
python "자동까이꺼.py" %*
