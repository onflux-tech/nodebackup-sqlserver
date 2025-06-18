Unicode true

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"

; Modo de atualização
Var isUpdate
Var isSilent

; Informações da Versão
!define PRODUCT_NAME "NodeBackup SQL Server"
!define PRODUCT_VERSION "0.4.2"
!define PRODUCT_PUBLISHER "Onflux Tech"
!define PRODUCT_WEB_SITE "https://github.com/onflux-tech/nodebackup-sqlserver"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define PRODUCT_UNINST_ROOT_KEY "HKLM"

Name "${PRODUCT_NAME}"
OutFile "NodeBackupInstaller.exe"
InstallDir "$PROGRAMFILES64\NodeBackup"
InstallDirRegKey HKLM "Software\NodeBackup" "Install_Dir"
RequestExecutionLevel admin
ShowInstDetails nevershow
ShowUnInstDetails nevershow

; Informações de Versão do Arquivo
VIProductVersion "0.4.2.0"
VIFileVersion "0.4.2.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "Comments" "Backup automático SQL Server"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalTrademarks" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "LegalCopyright" "© ${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME}"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "InternalName" "${PRODUCT_NAME}"
VIAddVersionKey "OriginalFilename" "NodeBackupInstaller.exe"

!define MUI_ABORTWARNING
!define MUI_ICON "public\favicon.ico"
!define MUI_UNICON "public\favicon.ico"

; Páginas de interface apenas se não for silencioso
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "scripts\LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_SHOWREADME "http://localhost:3030"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Abrir a interface web"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

Function .onInit
    ; Detectar se está em modo silencioso
    ${If} ${Silent}
        StrCpy $isSilent 1
        SetSilent silent ; Forçar modo completamente silencioso
    ${Else}
        StrCpy $isSilent 0
        SetSilent normal
    ${EndIf}
    
    ReadRegStr $INSTDIR HKLM "Software\NodeBackup" "Install_Dir"
    ${If} $INSTDIR != ""
        StrCpy $isUpdate 1
        ; Só mostrar MessageBox se não for modo silencioso
        ${If} $isSilent == 0
            MessageBox MB_YESNO|MB_ICONQUESTION "Uma versão do NodeBackup já está instalada. Deseja atualizá-la para a versão ${PRODUCT_VERSION}?" IDYES no_abort
            Abort
            no_abort:
        ${EndIf}
    ${Else}
        StrCpy $isUpdate 0
        StrCpy $INSTDIR "$PROGRAMFILES64\NodeBackup"
    ${EndIf}
FunctionEnd

Section "NodeBackup (obrigatório)" SEC01
    SectionIn RO

    ; Se for atualização, parar o serviço
    ${If} $isUpdate == 1
        DetailPrint "Parando o serviço NodeBackup para atualização..."
        nsExec::ExecToLog '"$INSTDIR\nssm.exe" stop NodeBackupSQLServer'
        Sleep 2000 ; Garante que o serviço teve tempo para parar
    ${EndIf}

    SetOutPath $INSTDIR

    File "NodeBackup.exe"
    File "nssm.exe"
    File "7za.exe"
    File /r "public"

    CreateDirectory "$INSTDIR\logs"
    CreateDirectory "$INSTDIR\backups"
    CreateDirectory "$INSTDIR\temp"

    WriteRegStr HKLM "Software\NodeBackup" "Install_Dir" "$INSTDIR"
    
    ; Informações no Painel de Controle (Adicionar/Remover Programas)
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\public\favicon.ico"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "HelpLink" "${PRODUCT_WEB_SITE}"
    WriteRegStr ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "EstimatedSize" 90000
    WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "NoModify" 1
    WriteRegDWORD ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}" "NoRepair" 1

    WriteUninstaller "uninstall.exe"

    ; Criar atalhos no menu iniciar apenas se não for silencioso
    ${If} $isSilent == 0
        CreateDirectory "$SMPROGRAMS\NodeBackup"
        CreateShortcut "$SMPROGRAMS\NodeBackup\NodeBackup.lnk" "$INSTDIR\NodeBackup.exe"
        CreateShortcut "$SMPROGRAMS\NodeBackup\Desinstalar.lnk" "$INSTDIR\uninstall.exe"
    ${EndIf}

    ; Instalação/Atualização do Serviço usando nsExec para não mostrar janelas
    nsExec::ExecToLog 'sc query NodeBackupSQLServer'
    Pop $0 ; Exit code
    
    ${If} $0 != "0" ; Serviço não existe
        DetailPrint "Instalando NodeBackup como serviço..."
        nsExec::ExecToLog '"$INSTDIR\nssm.exe" install NodeBackupSQLServer "$INSTDIR\NodeBackup.exe"'
        StrCpy $1 "instalado"
    ${Else}
        DetailPrint "Serviço existente encontrado. Atualizando configurações..."
        StrCpy $1 "atualizado"
    ${EndIf}

    ; Configurar e iniciar o serviço usando nsExec para não mostrar janelas
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set NodeBackupSQLServer AppDirectory "$INSTDIR"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set NodeBackupSQLServer Application "$INSTDIR\NodeBackup.exe"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set NodeBackupSQLServer DisplayName "Serviço de Backup Automático SqlServer"'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set NodeBackupSQLServer Description "Executa backups automáticos de bancos de dados SQL Server."'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" set NodeBackupSQLServer Start SERVICE_AUTO_START'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" start NodeBackupSQLServer'
    
    DetailPrint "Serviço $1 e iniciado com sucesso!"
    
    ; Se for modo silencioso, configurar para fechar automaticamente
    ${If} $isSilent == 1
        SetAutoClose true
    ${EndIf}
    
SectionEnd

Section "Uninstall"
    DetailPrint "Parando e removendo o serviço NodeBackupSQLServer..."
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" stop NodeBackupSQLServer'
    nsExec::ExecToLog '"$INSTDIR\nssm.exe" remove NodeBackupSQLServer confirm'

    DetailPrint "Removendo arquivos da aplicação..."
    Delete "$INSTDIR\NodeBackup.exe"
    Delete "$INSTDIR\nssm.exe"
    Delete "$INSTDIR\7za.exe"
    Delete "$INSTDIR\uninstall.exe"
    Delete "$INSTDIR\config.enc"

    RMDir /r "$INSTDIR\public"
    RMDir /r "$INSTDIR\logs"
    RMDir /r "$INSTDIR\backups"
    RMDir /r "$INSTDIR\temp"
    RMDir "$INSTDIR"

    Delete "$SMPROGRAMS\NodeBackup\*.*"
    RMDir "$SMPROGRAMS\NodeBackup"

    DeleteRegKey ${PRODUCT_UNINST_ROOT_KEY} "${PRODUCT_UNINST_KEY}"
    DeleteRegKey HKLM "Software\NodeBackup"
    
SectionEnd
