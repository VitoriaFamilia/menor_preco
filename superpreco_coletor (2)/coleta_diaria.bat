@echo off
rem Coleta os preços e grava no MySQL. Chamado todo dia pelo Agendador de Tarefas.
rem O MySQL do XAMPP precisa estar ligado.
cd /d "%~dp0"
echo ===== %date% %time% ===== >> dados\log.txt
node coletor\coletar.js >> dados\log.txt 2>&1
node coletor\importar.js >> dados\log.txt 2>&1
