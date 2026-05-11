@echo off
chcp 65001 >nul
echo ========================================
echo        ULTRA POKECHILL DEPLOYER
echo ========================================
set /p choice="Deseja adicionar uma mensagem/descricao para o deploy? (S/N): "
if /i "%choice%"=="S" (
    set /p msg="Digite a mensagem: "
) else (
    set msg=Deploy automatico
)

echo.
echo Adicionando arquivos no GitHub...
git add .
echo.
echo Salvando o commit...
git commit -m "%msg%"
echo.
echo Fazendo upload do deploy...
git push

echo.
echo ========================================
echo            DEPLOY CONCLUIDO!
echo ========================================
pause
