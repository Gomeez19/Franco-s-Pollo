@echo off
title FRANCO'S POLLO - Servidor Web
color 0A
echo ========================================================
echo        INICIANDO SERVIDOR WEB - FRANCO'S POLLO
echo ========================================================
echo.
echo  Tienda Virtual:       http://127.0.0.1:8000
echo  Panel Administrativo: http://127.0.0.1:8000/admin
echo  Documentacion API:    http://127.0.0.1:8000/docs
echo.
echo Presione CTRL + C para detener el servidor.
echo ========================================================
echo.
python run_server.py
pause
