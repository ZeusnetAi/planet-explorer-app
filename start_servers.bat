@echo off
REM Script para iniciar os ambientes de desenvolvimento do Projeto Planet
REM Como usar: Basta dar um clique duplo neste arquivo.

echo Automatizacao Iniciada: Subindo ambientes do Projeto Planet...
echo.

REM --- Caminho do Projeto ---
set "projectPath=C:\Users\tarci\Downloads\Projeto-planet"

REM --- Iniciar Backend ---
echo -> Iniciando o servidor Backend em uma nova janela de terminal...
start "Planet API - Backend (Flask)" cmd /k "cd /d %projectPath%\Backend & call venv\Scripts\activate.bat & python -m src.main"

REM --- Iniciar Frontend ---
echo -> Iniciando o servidor Frontend em uma nova janela de terminal...
start "Planet API - Frontend (Vite)" cmd /k "cd /d %projectPath%\Frontend & npm run dev"

echo.
echo --------------------------------------------------------
echo Comandos enviados. Aguarde os servidores iniciarem nas novas janelas.
echo Esta janela pode ser fechada.

timeout /t 5 >nul
exit 