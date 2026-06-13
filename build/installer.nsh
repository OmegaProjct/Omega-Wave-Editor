Var deleteEverything

!macro customHeader
  InstallDir "$PROGRAMFILES\OmegaProjects\Omega Wave Editor"
!macroend

!macro customInit
  StrCpy $deleteEverything "0"
  ; Sichern der Verknüpfungen vor der Deinstallation bei Updates
  CreateDirectory "$TEMP\OmegaWaveEditorBackup"
  IfFileExists "$DESKTOP\Omega Wave Editor.lnk" 0 +2
    CopyFiles "$DESKTOP\Omega Wave Editor.lnk" "$TEMP\OmegaWaveEditorBackup\desktop.lnk"

  IfFileExists "$SMPROGRAMS\Omega Wave Editor.lnk" 0 +2
    CopyFiles "$SMPROGRAMS\Omega Wave Editor.lnk" "$TEMP\OmegaWaveEditorBackup\startmenu.lnk"

  IfFileExists "$SMPROGRAMS\Omega Projects\Omega Wave Editor.lnk" 0 +2
    CopyFiles "$SMPROGRAMS\Omega Projects\Omega Wave Editor.lnk" "$TEMP\OmegaWaveEditorBackup\startmenu_proj.lnk"

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

!macro customInstall
  ; --- DESKTOP SHORTCUT ---
  IfFileExists "$DESKTOP\Omega Wave Editor.lnk" desktop_exists
    ; Desktop-Shortcut existiert nicht. Wiederherstellen aus Backup oder neu erstellen.
    IfFileExists "$TEMP\OmegaWaveEditorBackup\desktop.lnk" 0 +3
      CopyFiles "$TEMP\OmegaWaveEditorBackup\desktop.lnk" "$DESKTOP\Omega Wave Editor.lnk"
      Goto desktop_done
    CreateShortCut "$DESKTOP\Omega Wave Editor.lnk" "$INSTDIR\Omega Wave Editor.exe"
    Goto desktop_done
  desktop_exists:
    ; Desktop-Shortcut existiert bereits. Nicht überschreiben, um die Position auf dem Desktop zu wahren!
  desktop_done:
    Delete "$TEMP\OmegaWaveEditorBackup\desktop.lnk"

  ; --- START MENU SHORTCUT (LEGACY PATH) ---
  IfFileExists "$SMPROGRAMS\Omega Wave Editor.lnk" startmenu_exists
    IfFileExists "$TEMP\OmegaWaveEditorBackup\startmenu.lnk" 0 +2
      CopyFiles "$TEMP\OmegaWaveEditorBackup\startmenu.lnk" "$SMPROGRAMS\Omega Wave Editor.lnk"
  startmenu_exists:
    Delete "$TEMP\OmegaWaveEditorBackup\startmenu.lnk"

  ; --- START MENU SHORTCUT (NEW PATH IN OMEGA PROJECTS FOLDER) ---
  IfFileExists "$SMPROGRAMS\Omega Projects\Omega Wave Editor.lnk" startmenu_proj_exists
    IfFileExists "$TEMP\OmegaWaveEditorBackup\startmenu_proj.lnk" 0 +3
      CopyFiles "$TEMP\OmegaWaveEditorBackup\startmenu_proj.lnk" "$SMPROGRAMS\Omega Projects\Omega Wave Editor.lnk"
      Goto startmenu_proj_done
    CreateDirectory "$SMPROGRAMS\Omega Projects"
    CreateShortCut "$SMPROGRAMS\Omega Projects\Omega Wave Editor.lnk" "$INSTDIR\Omega Wave Editor.exe"
    Goto startmenu_proj_done
  startmenu_proj_exists:
  startmenu_proj_done:
    Delete "$TEMP\OmegaWaveEditorBackup\startmenu_proj.lnk"

  RMDir "$TEMP\OmegaWaveEditorBackup"
!macroend

!macro customUnInit
  StrCpy $deleteEverything "0"
  IfSilent done_cleanup
  MessageBox MB_YESNO|MB_ICONQUESTION "Möchten Sie auch alle Ihre persönlichen Programmeinstellungen, Ordnerpfade und Benutzerdaten restlos löschen?" IDNO done_cleanup
  StrCpy $deleteEverything "1"
  RMDir /r "$APPDATA\omega-wave-editor"
  done_cleanup:
!macroend

!macro customUnInstall
  DetailPrint "Lösche Desktop- und Startmenü-Verknüpfungen..."
  Delete "$DESKTOP\Omega Wave Editor.lnk"
  Delete "$SMPROGRAMS\Omega Wave Editor.lnk"
  Delete "$SMPROGRAMS\Omega Projects\Omega Wave Editor.lnk"
  RMDir "$SMPROGRAMS\Omega Projects"
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
