#ifndef AppVersion
  #define AppVersion "0.9.46"
#endif
#ifndef AppFileVersion
  #define AppFileVersion "0.9.46.0"
#endif
#ifndef AppFilesDir
  #define AppFilesDir "..\..\..\artifacts\App Files"
#endif
#ifndef OutputDir
  #define OutputDir "..\..\..\artifacts\Installer"
#endif
#ifndef WebViewBootstrapper
  #define WebViewBootstrapper "MicrosoftEdgeWebview2Setup.exe"
#endif
#ifndef InstallerIcon
  #define InstallerIcon "..\BlackSpiritHubInstaller\installer.ico"
#endif
#ifndef OutputBaseFilename
  #define OutputBaseFilename "Black-Spirit-Hub-Installer"
#endif

#define AppName "Black Spirit Hub"
#define AppExeName "Black Spirit Hub.exe"
#define PreviousAppName "BDO " + "Multi" + "-Tool"
#define PreviousExeName PreviousAppName + ".exe"

[Setup]
#ifdef SelfTestBuild
AppId={{A479749D-0D8C-4691-A3C3-9B7C682EDAA9}
CreateUninstallRegKey=no
Uninstallable=no
CloseApplications=no
UsePreviousAppDir=no
UsePreviousGroup=no
UsePreviousTasks=no
SetupMutex=BlackSpiritHub.NativeInstaller.SelfTest
#else
AppId={{1A310A25-BAC5-4014-98DF-50767ADEBA9D}
Uninstallable=yes
CloseApplications=yes
CloseApplicationsFilter={#AppExeName},{#PreviousExeName}
RestartApplications=no
UsePreviousAppDir=yes
UsePreviousGroup=yes
UsePreviousTasks=yes
SetupMutex=BlackSpiritHub.NativeInstaller
#endif
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} v{#AppVersion}
AppPublisher=Black Spirit Hub
AppPublisherURL=https://github.com/Chucksterboy/black-spirit-hub
AppSupportURL=https://github.com/Chucksterboy/black-spirit-hub/issues
AppUpdatesURL=https://github.com/Chucksterboy/black-spirit-hub/releases/latest
DefaultDirName={code:GetDefaultInstallDir}
DefaultGroupName={#AppName}
DisableDirPage=auto
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseFilename}
SetupIconFile={#InstallerIcon}
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
WizardStyle=modern dynamic
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
MergeDuplicateFiles=yes
RestartIfNeededByRun=no
SetupLogging=yes
UninstallLogging=yes
VersionInfoCompany=Black Spirit Hub
VersionInfoDescription=Black Spirit Hub Installer
VersionInfoProductName=Black Spirit Hub
VersionInfoVersion={#AppFileVersion}
VersionInfoProductVersion={#AppFileVersion}
VersionInfoTextVersion=v{#AppVersion}
VersionInfoProductTextVersion=v{#AppVersion}

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"
Name: "repairwebview2"; Description: "Install or repair Microsoft Edge WebView2 Runtime"; Flags: unchecked

[Files]
Source: "{#WebViewBootstrapper}"; Flags: dontcopy noencryption
Source: "{#AppFilesDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

#ifndef SelfTestBuild
[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\{#AppExeName}"; Tasks: desktopicon

[InstallDelete]
Type: files; Name: "{app}\Uninstall Black Spirit Hub.cmd"
Type: files; Name: "{app}\Black Spirit Hub.pdb"
Type: files; Name: "{app}\Microsoft.Web.WebView2.Core.xml"
Type: files; Name: "{app}\Microsoft.Web.WebView2.WinForms.xml"
Type: files; Name: "{app}\Tesseract.dll"
Type: files; Name: "{app}\x64\leptonica-1.82.0.dll"
Type: files; Name: "{app}\x64\tesseract50.dll"
Type: dirifempty; Name: "{app}\x64"
Type: files; Name: "{app}\x86\leptonica-1.82.0.dll"
Type: files; Name: "{app}\x86\tesseract50.dll"
Type: dirifempty; Name: "{app}\x86"
Type: files; Name: "{app}\Assets\RecipeBook\ocr\tessdata\eng.traineddata"
Type: dirifempty; Name: "{app}\Assets\RecipeBook\ocr\tessdata"
Type: files; Name: "{app}\Assets\RecipeBook\ocr\LICENSE-TESSERACT.txt"
Type: files; Name: "{app}\Assets\RecipeBook\ocr\LICENSE-LEPTONICA.txt"
Type: files; Name: "{autodesktop}\BDO Multi-Tool.lnk"
Type: filesandordirs; Name: "{autoprograms}\BDO Multi-Tool"

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName}"; WorkingDir: "{app}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\{#AppExeName}"; Parameters: "--remove-market-task"; WorkingDir: "{app}"; Flags: runhidden waituntilterminated skipifdoesntexist; RunOnceId: "RemoveMarketCollectorTask"
#endif

[Code]
const
  CurrentExeName = '{#AppExeName}';
  PreviousExeName = '{#PreviousExeName}';
  CurrentMutexName = 'Local\BlackSpiritHub.SingleInstance';
  PreviousMutexName = 'Local\BDO' + 'Multi' + 'Tool.SingleInstance';
  WebView2RegistryPath =
    'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  WebView2BootstrapperName = 'MicrosoftEdgeWebview2Setup.exe';
  WaitTimeout = $00000102;
  Synchronize = $00100000;

var
  RequestedInstallPath: String;
  SourceProcessId: Integer;
  PreviousDefaultInstallPath: String;
  MigratePreviousDefaultInstall: Boolean;
  WebViewInstallAttempted: Boolean;
  WebViewInstallError: String;
  WebView2StatusPage: TOutputMsgWizardPage;

function OpenProcess(
  DesiredAccess: LongWord;
  InheritHandle: Boolean;
  ProcessId: LongWord): THandle;
  external 'OpenProcess@kernel32.dll stdcall';
function WaitForSingleObject(Handle: THandle; Milliseconds: LongWord): LongWord;
  external 'WaitForSingleObject@kernel32.dll stdcall';
function CloseHandle(Handle: THandle): Boolean;
  external 'CloseHandle@kernel32.dll stdcall';

function NormalizePath(const Value: String): String;
begin
  Result := ExpandFileName(Value);
  while (Length(Result) > 3) and (Result[Length(Result)] = '\') do
    Delete(Result, Length(Result), 1);
end;

function SamePath(const LeftPath, RightPath: String): Boolean;
begin
  Result := CompareText(NormalizePath(LeftPath), NormalizePath(RightPath)) = 0;
end;

function CurrentDefaultInstallPath: String;
begin
  Result := ExpandConstant('{localappdata}\Programs\{#AppName}');
end;

function PreviousDefaultPath: String;
begin
  Result := ExpandConstant('{localappdata}\Programs\{#PreviousAppName}');
end;

function TryReadLegacyParameter(const ParameterName: String; var Value: String): Boolean;
var
  Index: Integer;
begin
  Result := False;
  for Index := 1 to ParamCount - 1 do
  begin
    if CompareText(ParamStr(Index), ParameterName) = 0 then
    begin
      Value := ParamStr(Index + 1);
      Result := True;
      Exit;
    end;
  end;
end;

function RequestedPathIsAllowed(const Candidate: String): Boolean;
begin
  Result :=
    SamePath(Candidate, CurrentDefaultInstallPath) or
    SamePath(Candidate, PreviousDefaultPath) or
    FileExists(AddBackslash(Candidate) + CurrentExeName) or
    FileExists(AddBackslash(Candidate) + PreviousExeName);
end;

function InitializeSetup: Boolean;
var
  ParameterValue: String;
begin
  Result := False;
  SourceProcessId := 0;
  PreviousDefaultInstallPath := PreviousDefaultPath;

  if TryReadLegacyParameter('--install-path', ParameterValue) then
  begin
    if Trim(ParameterValue) = '' then
    begin
      MsgBox('The requested installation path was empty.', mbError, MB_OK);
      Exit;
    end;

    RequestedInstallPath := NormalizePath(ParameterValue);
    if not RequestedPathIsAllowed(RequestedInstallPath) then
    begin
      MsgBox(
        'For safety, Setup refused an installation path that is not an existing Black Spirit Hub folder.',
        mbError,
        MB_OK);
      Exit;
    end;
  end;

  ParameterValue := ExpandConstant('{param:SOURCEPID|}');
  if (ParameterValue <> '') or TryReadLegacyParameter('--source-pid', ParameterValue) then
  begin
    SourceProcessId := StrToIntDef(ParameterValue, 0);
    if SourceProcessId < 0 then
      SourceProcessId := 0;
  end;

  MigratePreviousDefaultInstall :=
    (RequestedInstallPath = '') and
    (not FileExists(AddBackslash(CurrentDefaultInstallPath) + CurrentExeName)) and
    FileExists(AddBackslash(PreviousDefaultInstallPath) + PreviousExeName);
  Result := True;
end;

function GetDefaultInstallDir(Param: String): String;
begin
  if RequestedInstallPath <> '' then
    Result := RequestedInstallPath
  else
    Result := CurrentDefaultInstallPath;
end;

function ReadWebView2VersionFromKey(
  RootKey: Integer;
  var Version: String): Boolean;
var
  Candidate: String;
begin
  Result := False;
  if RegQueryStringValue(RootKey, WebView2RegistryPath, 'pv', Candidate) then
  begin
    Candidate := Trim(Candidate);
    if (Candidate <> '') and (Candidate <> '0.0.0.0') then
    begin
      Version := Candidate;
      Result := True;
    end;
  end;
end;

function TryGetWebView2Version(var Version: String): Boolean;
begin
  Version := '';
  Result :=
    ReadWebView2VersionFromKey(HKCU32, Version) or
    ReadWebView2VersionFromKey(HKLM32, Version);
  if (not Result) and IsWin64 then
    Result :=
      ReadWebView2VersionFromKey(HKCU64, Version) or
      ReadWebView2VersionFromKey(HKLM64, Version);
end;

procedure UpdateWebView2Status;
var
  Version: String;
begin
  if WebView2StatusPage = nil then
    Exit;

  if TryGetWebView2Version(Version) then
  begin
    if WizardIsTaskSelected('repairwebview2') then
      WebView2StatusPage.MsgLabel.Caption :=
        'Microsoft Edge WebView2 Runtime ' + Version +
        ' is installed. Setup will run Microsoft''s official repair/update installer once.'
    else
      WebView2StatusPage.MsgLabel.Caption :=
        'Microsoft Edge WebView2 Runtime ' + Version +
        ' is installed and ready. No runtime download is required.';
  end
  else
  begin
    WebView2StatusPage.MsgLabel.Caption :=
      'Microsoft Edge WebView2 Runtime was not detected. Setup will install Microsoft''s official ' +
      'Evergreen Runtime once before installing Black Spirit Hub.';
  end;
end;

procedure InitializeWizard;
var
  Version: String;
begin
  if not TryGetWebView2Version(Version) then
    WizardSelectTasks('repairwebview2');

  WebView2StatusPage := CreateOutputMsgPage(
    wpSelectTasks,
    'Microsoft Edge WebView2 Runtime',
    'Runtime check',
    '');
  UpdateWebView2Status;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if (WebView2StatusPage <> nil) and (CurPageID = WebView2StatusPage.ID) then
    UpdateWebView2Status;
end;

function IsProcessRunning(ProcessId: Integer): Boolean;
var
  ProcessHandle: THandle;
begin
  Result := False;
  if ProcessId <= 0 then
    Exit;

  ProcessHandle := OpenProcess(Synchronize, False, ProcessId);
  if ProcessHandle <> 0 then
  begin
    Result := WaitForSingleObject(ProcessHandle, 0) = WaitTimeout;
    CloseHandle(ProcessHandle);
  end;
end;

procedure RequestShutdownFrom(const InstallDirectory: String);
var
  ExecutablePath: String;
  ResultCode: Integer;
begin
  ExecutablePath := AddBackslash(InstallDirectory) + CurrentExeName;
  if not FileExists(ExecutablePath) then
    ExecutablePath := AddBackslash(InstallDirectory) + PreviousExeName;

  if FileExists(ExecutablePath) then
  begin
    Log('Requesting graceful application shutdown through ' + ExecutablePath);
    Exec(
      ExecutablePath,
      '--shutdown-for-update',
      ExtractFileDir(ExecutablePath),
      SW_HIDE,
      ewWaitUntilTerminated,
      ResultCode);
  end;
end;

function WaitForApplicationShutdown: Boolean;
var
  Attempt: Integer;
  SourceStillRunning: Boolean;
begin
  for Attempt := 1 to 80 do
  begin
    SourceStillRunning := (SourceProcessId > 0) and IsProcessRunning(SourceProcessId);
    if (not SourceStillRunning) and
      (not CheckForMutexes(CurrentMutexName + ',' + PreviousMutexName)) then
    begin
      Result := True;
      Exit;
    end;
    Sleep(250);
  end;
  Result := False;
end;

function ApplicationAppearsRunning: Boolean;
begin
  Result :=
    ((SourceProcessId > 0) and IsProcessRunning(SourceProcessId)) or
    CheckForMutexes(CurrentMutexName + ',' + PreviousMutexName);
end;

function InstallOrRepairWebView2: String;
var
  BootstrapperPath: String;
  ResultCode: Integer;
  Attempt: Integer;
  Version: String;
begin
  Result := '';
  if WebViewInstallAttempted then
  begin
    Result := WebViewInstallError;
    Exit;
  end;

  WebViewInstallAttempted := True;
  ExtractTemporaryFile(WebView2BootstrapperName);
  BootstrapperPath := ExpandConstant('{tmp}\') + WebView2BootstrapperName;
  Log('Running the verified Microsoft Edge WebView2 Evergreen bootstrapper.');
  if not Exec(
    BootstrapperPath,
    '/silent /install',
    ExpandConstant('{tmp}'),
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode) then
  begin
    WebViewInstallError :=
      'Microsoft Edge WebView2 Runtime could not be started. Please use Microsoft''s official ' +
      'download and then run Setup again: https://developer.microsoft.com/microsoft-edge/webview2/';
    Result := WebViewInstallError;
    Exit;
  end;

  if ResultCode <> 0 then
  begin
    WebViewInstallError :=
      'Microsoft Edge WebView2 Runtime setup returned error ' + IntToStr(ResultCode) +
      '. Please repair it from Microsoft''s official WebView2 download page, then run Setup again.';
    Result := WebViewInstallError;
    Exit;
  end;

  for Attempt := 1 to 60 do
  begin
    if TryGetWebView2Version(Version) then
      Exit;
    Sleep(500);
  end;

  WebViewInstallError :=
    'Microsoft Edge WebView2 Runtime setup finished, but the runtime is still not detectable. ' +
    'Restart Windows or repair WebView2 from Microsoft''s official download page, then run Setup again.';
  Result := WebViewInstallError;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Version: String;
begin
  Result := '';
#ifdef SelfTestBuild
  Exit;
#endif
  { Never start an installed legacy executable merely to ask it to stop. Older }
  { releases do not understand this command when no primary instance exists. }
  if ApplicationAppearsRunning then
  begin
    RequestShutdownFrom(WizardDirValue);
    if (RequestedInstallPath <> '') and
      (not SamePath(RequestedInstallPath, WizardDirValue)) then
      RequestShutdownFrom(RequestedInstallPath);
    if not SamePath(CurrentDefaultInstallPath, WizardDirValue) then
      RequestShutdownFrom(CurrentDefaultInstallPath);
    if (not SamePath(PreviousDefaultInstallPath, WizardDirValue)) and
      (not SamePath(PreviousDefaultInstallPath, CurrentDefaultInstallPath)) then
      RequestShutdownFrom(PreviousDefaultInstallPath);

    if not WaitForApplicationShutdown then
    begin
      Result :=
        'Black Spirit Hub is still running. Close it from the taskbar and system tray, then click Retry.';
      Exit;
    end;
  end;

  if (not TryGetWebView2Version(Version)) or WizardIsTaskSelected('repairwebview2') then
    Result := InstallOrRepairWebView2;
end;

procedure InstallMarketCollectorTask;
var
  ResultCode: Integer;
  ExecutablePath: String;
begin
  ExecutablePath := ExpandConstant('{app}\{#AppExeName}');
  if not Exec(
    ExecutablePath,
    '--install-market-task',
    ExpandConstant('{app}'),
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode) then
  begin
    Log('Market collector task helper could not be started.');
    Exit;
  end;

  if ResultCode <> 0 then
    Log('Market collector task creation was nonfatal and returned ' + IntToStr(ResultCode) + '.')
  else
    Log('Market collector task was created successfully.');
end;

procedure RemovePreviousDefaultInstall;
begin
  if MigratePreviousDefaultInstall and
    (not SamePath(PreviousDefaultInstallPath, ExpandConstant('{app}'))) and
    FileExists(ExpandConstant('{app}\{#AppExeName}')) then
  begin
    Log('Removing the migrated legacy application directory: ' + PreviousDefaultInstallPath);
    DelTree(PreviousDefaultInstallPath, True, True, True);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
#ifndef SelfTestBuild
  if CurStep = ssPostInstall then
  begin
    InstallMarketCollectorTask;
    RemovePreviousDefaultInstall;
  end;
#endif
end;
