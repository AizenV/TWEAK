@echo off
echo Installiere Abhaengigkeiten...
call npm install
echo Baue portable EXE...
call npm run build
echo Fertig: dist\Attack-tweaks.exe
pause
