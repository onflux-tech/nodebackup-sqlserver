Unicode true

!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinVer.nsh"

Name "NodeBackup SQL Server"
OutFile "NodeBackupInstaller.exe"
InstallDir "$PROGRAMFILES64\NodeBackup"
InstallDirRegKey HKLM "Software\NodeBackup" "Install_Dir"
RequestExecutionLevel admin

Var InstallService
Var ServiceCheckbox

!define MUI_ABORTWARNING
!define MUI_ICON "public\favicon.ico"
!define MUI_UNICON "public\favicon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "scripts\LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
Page custom ServicePage ServicePageLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "PortugueseBR"

Function ServicePage
    !insertmacro MUI_HEADER_TEXT "Opções de Instalação" "Escolha como deseja instalar o NodeBackup"
    
    nsDialogs::Create 1018
    Pop $0
    
    ${NSD_CreateLabel} 0 0 100% 40u "O NodeBackup pode ser instalado como um serviço do Windows para execução automática de backups.$\r$\n$\r$\nMarque a opção abaixo se deseja instalar como serviço:"
    Pop $0
    
    ${NSD_CreateCheckbox} 0 50u 100% 10u "Instalar como Serviço do Windows"
    Pop $ServiceCheckbox
    ${NSD_SetState} $ServiceCheckbox ${BST_CHECKED}
    
    nsDialogs::Show
FunctionEnd

Function ServicePageLeave
    ${NSD_GetState} $ServiceCheckbox $InstallService
FunctionEnd

Section "NodeBackup (obrigatório)" SEC01
    SectionIn RO

    SetOutPath $INSTDIR

    File "NodeBackup.exe"
    File "nssm.exe"
    File "7za.exe"
    File /r "public"

    CreateDirectory "$INSTDIR\logs"
    CreateDirectory "$INSTDIR\backups"
    CreateDirectory "$INSTDIR\temp"

    WriteRegStr HKLM "Software\NodeBackup" "Install_Dir" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NodeBackup" "DisplayName" "NodeBackup SQL Server"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NodeBackup" "UninstallString" '"$INSTDIR\uninstall.exe"'
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NodeBackup" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NodeBackup" "NoRepair" 1

    WriteUninstaller "uninstall.exe"

    CreateDirectory "$SMPROGRAMS\NodeBackup"
    CreateShortcut "$SMPROGRAMS\NodeBackup\NodeBackup.lnk" "$INSTDIR\NodeBackup.exe"
    CreateShortcut "$SMPROGRAMS\NodeBackup\Desinstalar.lnk" "$INSTDIR\uninstall.exe"

    ${If} $InstallService == ${BST_CHECKED}
        DetailPrint "Instalando NodeBackup como serviço..."
        ExecWait '"$INSTDIR\nssm.exe" install NodeBackupSQLServer "$INSTDIR\NodeBackup.exe"'
        ExecWait '"$INSTDIR\nssm.exe" set NodeBackupSQLServer AppDirectory "$INSTDIR"'
        ExecWait '"$INSTDIR\nssm.exe" set NodeBackupSQLServer DisplayName "Serviço de Backup Automático SqlServer"'
        ExecWait '"$INSTDIR\nssm.exe" set NodeBackupSQLServer Description "Executa backups automáticos de bancos de dados SQL Server."'
        ExecWait '"$INSTDIR\nssm.exe" set NodeBackupSQLServer Start SERVICE_AUTO_START'
        ExecWait '"$INSTDIR\nssm.exe" start NodeBackupSQLServer'
        DetailPrint "Serviço instalado e iniciado com sucesso!"
    ${EndIf}
    
SectionEnd

Section "Uninstall"
    ExecWait '"$INSTDIR\nssm.exe" stop NodeBackupSQLServer'
    ExecWait '"$INSTDIR\nssm.exe" remove NodeBackupSQLServer confirm'

    Delete "$INSTDIR\NodeBackup.exe"
    Delete "$INSTDIR\nssm.exe"
    Delete "$INSTDIR\7za.exe"
    Delete "$INSTDIR\uninstall.exe"

    RMDir /r "$INSTDIR\public"
    RMDir /r "$INSTDIR\logs"
    RMDir /r "$INSTDIR\backups"
    RMDir /r "$INSTDIR\temp"
    RMDir "$INSTDIR"

    Delete "$SMPROGRAMS\NodeBackup\*.*"
    RMDir "$SMPROGRAMS\NodeBackup"

    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\NodeBackup"
    DeleteRegKey HKLM "Software\NodeBackup"
    
SectionEnd
