!macro customHeader
  InstallDir "$PROGRAMFILES\OmegaProjects\Omega Wave Editor"
!macroend

!macro customInit
  ; 1. Prüfe "$PROGRAMFILES\Omega Wave Editor"
  IfFileExists "$PROGRAMFILES\Omega Wave Editor\Uninstall Omega Wave Editor.exe" 0 +4
    DetailPrint "Alte Version unter ProgramFiles gefunden. Deinstalliere..."
    ExecWait '"$PROGRAMFILES\Omega Wave Editor\Uninstall Omega Wave Editor.exe" /S _?=$PROGRAMFILES\Omega Wave Editor'
    RMDir /r "$PROGRAMFILES\Omega Wave Editor"

  ; 2. Prüfe "$PROGRAMFILES\omega-wave-editor"
  IfFileExists "$PROGRAMFILES\omega-wave-editor\Uninstall Omega Wave Editor.exe" 0 +4
    DetailPrint "Alte Version unter ProgramFiles (Kleinbuchstaben) gefunden. Deinstalliere..."
    ExecWait '"$PROGRAMFILES\omega-wave-editor\Uninstall Omega Wave Editor.exe" /S _?=$PROGRAMFILES\omega-wave-editor'
    RMDir /r "$PROGRAMFILES\omega-wave-editor"

  ; 3. Prüfe "$LOCALAPPDATA\Programs\omega-wave-editor"
  IfFileExists "$LOCALAPPDATA\Programs\omega-wave-editor\Uninstall Omega Wave Editor.exe" 0 +4
    DetailPrint "Alte Version im User-Verzeichnis gefunden. Deinstalliere..."
    ExecWait '"$LOCALAPPDATA\Programs\omega-wave-editor\Uninstall Omega Wave Editor.exe" /S _?=$LOCALAPPDATA\Programs\omega-wave-editor'
    RMDir /r "$LOCALAPPDATA\Programs\omega-wave-editor"

  ; 4. Prüfe "$LOCALAPPDATA\Programs\Omega Wave Editor"
  IfFileExists "$LOCALAPPDATA\Programs\Omega Wave Editor\Uninstall Omega Wave Editor.exe" 0 +4
    DetailPrint "Alte Version im User-Verzeichnis (gemischt) gefunden. Deinstalliere..."
    ExecWait '"$LOCALAPPDATA\Programs\Omega Wave Editor\Uninstall Omega Wave Editor.exe" /S _?=$LOCALAPPDATA\Programs\Omega Wave Editor'
    RMDir /r "$LOCALAPPDATA\Programs\Omega Wave Editor"
!macroend

!macro customUnInit
  MessageBox MB_YESNO|MB_ICONQUESTION "Möchten Sie auch alle Ihre persönlichen Programmeinstellungen, Ordnerpfade und Benutzerdaten restlos löschen?" IDNO +2
  RMDir /r "$APPDATA\omega-wave-editor"
!macroend
