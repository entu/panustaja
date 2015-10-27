; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{B2A00D3D-669C-4305-A22C-002D647E5E1A}
AppName=Panustaja
AppVersion=1.0.0
AppVerName=Panustaja 1.0.0
AppPublisher=ekrk
DefaultDirName={pf}\Panustaja
DisableDirPage=yes
DefaultGroupName=Panustaja
DisableProgramGroupPage=yes
OutputDir=Y:\EKRK\uploader\bin
OutputBaseFilename=setup
SetupIconFile=Y:\EKRK\uploader\source\images\murakas.ico
Compression=lzma
SolidCompression=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 0,6.1

[Files]
Source: "Y:\EKRK\uploader\bin\Panustaja\Panustaja.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "Y:\EKRK\uploader\bin\Panustaja\icudtl.dat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Y:\EKRK\uploader\bin\Panustaja\nw.pak"; DestDir: "{app}"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\Panustaja"; Filename: "{app}\Panustaja.exe"
Name: "{group}\{cm:UninstallProgram,Panustaja}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\Panustaja"; Filename: "{app}\Panustaja.exe"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\Panustaja"; Filename: "{app}\Panustaja.exe"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\Panustaja.exe"; Description: "{cm:LaunchProgram,Panustaja}"; Flags: nowait postinstall skipifsilent

