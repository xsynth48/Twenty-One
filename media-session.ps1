# What is playing on this PC, read from Windows itself (the same info as the media controls next to the volume):
# Spotify, YouTube in a browser, or any other app that plays. No login and no Spotify developer account needed.
# Started hidden by media-main.cjs. Writes one JSON line when something changes, and reads commands from stdin:
# play, pause, toggle, next, previous, seek <ms>, vol <0-100>, mute <0/1>. Stops when Twenty-One closes its stdin.
# Robo's voice: "say <id> <nl|en> <text as base64>" makes a WAV with a Windows voice of that language and answers
# { spoke: id, file } (or { spoke: id, error: 'novoice' }); "listen" starts Windows' voice typing (Win+H) in Robo's chat.
# It also reports the Windows volume and whether something runs full screen (game mode), so Twenty-One needs only this
# one PowerShell (people found its memory use too high). Wi-Fi and Bluetooth (beta 55): "net" answers { net }, "radio
# <wifi|bt> <0|1>" switches one (see NetState below). Other apps' notifications (beta 89, only while you switched it
# on in Settings): "notify 1|0" starts or stops looking, "notify-hide <id>" takes one out of Windows; see CheckNotify below.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); [void]$t.Wait(5000); if ($t.IsCompleted) { $t.Result } else { $null } }
[void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
$Manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]
$Props = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$mgr = Await ($Manager::RequestAsync()) $Manager
# PowerShell cannot hand a WinRT stream to .NET by itself; reflection can (it casts the COM object for us)
$asStream = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))

# Whatever really plays wins (Spotify first, then the app Windows calls "now playing", then any other: YouTube in a
# browser too). When nothing plays: the app you last listened to (paused), else Spotify (paused), like Windows' own controls.
$script:keep = ''
function Playing($x) { $x -and [int]$x.GetPlaybackInfo().PlaybackStatus -eq 4 }
function Pick {
  $all = @($mgr.GetSessions())
  $spotify = $all | Where-Object { $_.SourceAppUserModelId -match 'spotify' } | Select-Object -First 1
  $now = $mgr.GetCurrentSession()
  $live = $(if (Playing $spotify) { $spotify } elseif (Playing $now) { $now } else { $all | Where-Object { Playing $_ } | Select-Object -First 1 })
  if ($live) { $script:keep = $live.SourceAppUserModelId; return $live }
  if ($script:keep) { $old = $all | Where-Object { $_.SourceAppUserModelId -eq $script:keep } | Select-Object -First 1; if ($old) { return $old } }
  $script:keep = ''
  return $spotify
}

function Say($o) { [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress -Depth 3)); [Console]::Out.Flush() }

# Game mode (game-mode-main.cjs): does something run full screen? The same answer Windows uses for "do not disturb
# while gaming": 2 = a full-screen app (also borderless games and videos), 3 = a full-screen Direct3D game, 4 =
# presentation mode, 7 = a Store app (only when it really fills the screen, see CheckFull). One line { fullscreen } when it changes.
try { Add-Type -Namespace TwoCode -Name Quns -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state);' } catch {}
# ...and on which screen (the one of the window in front, in real pixels): a full-screen app on another screen than the
# island's does not hide it (a user's island kept disappearing until he closed a certain app)
try { Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
namespace TwoCodeMon {
  public static class Front {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [StructLayout(LayoutKind.Sequential)] public struct INFO { public int Size; public RECT Monitor; public RECT Work; public uint Flags; }
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr h, uint flags);
    [DllImport("user32.dll")] static extern bool GetMonitorInfo(IntPtr m, ref INFO i);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
    public static string Screen() {
      IntPtr old = IntPtr.Zero;
      try { old = SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch {}
      try {
        INFO i = new INFO(); i.Size = Marshal.SizeOf(typeof(INFO));
        if (!GetMonitorInfo(MonitorFromWindow(GetForegroundWindow(), 2), ref i)) return "";
        return i.Monitor.L + "," + i.Monitor.T + "," + (i.Monitor.R - i.Monitor.L) + "," + (i.Monitor.B - i.Monitor.T);
      } finally { if (old != IntPtr.Zero) { try { SetThreadDpiAwarenessContext(old); } catch {} } }
    }
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
    // does the window in front really fill its whole screen? (not the desktop or the taskbar; a maximized window never
    // counts: with a taskbar that hides itself it also fills the screen, and that is just working, not a game)
    public static bool Covers() {
      IntPtr old = IntPtr.Zero;
      try { old = SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch {}
      try {
        IntPtr h = GetForegroundWindow(); if (h == IntPtr.Zero || IsZoomed(h)) return false;
        var sb = new System.Text.StringBuilder(64); GetClassName(h, sb, 64); string c = sb.ToString();
        if (c == "Progman" || c == "WorkerW" || c == "Shell_TrayWnd" || c == "Shell_SecondaryTrayWnd") return false;
        INFO i = new INFO(); i.Size = Marshal.SizeOf(typeof(INFO));
        if (!GetMonitorInfo(MonitorFromWindow(h, 2), ref i)) return false;
        RECT r; if (!GetWindowRect(h, out r)) return false;
        return r.L <= i.Monitor.L + 2 && r.T <= i.Monitor.T + 2 && r.R >= i.Monitor.R - 2 && r.B >= i.Monitor.B - 2;
      } finally { if (old != IntPtr.Zero) { try { SetThreadDpiAwarenessContext(old); } catch {} } }
    }
  }
}
'@ } catch {}
$fullAt = [DateTime]::MinValue; $wasFull = $null

# The Windows volume (Twenty-One's volume bar and the volume slider). It used to have its own PowerShell (volume-watch.ps1,
# now only used by test recordings); in here it costs no extra process. "vol <0-100>" sets it, "mute <0/1>" mutes.
try {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace TwoCodeVolume {
  [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    int f(); int g(); int h(); int i();
    int SetMasterVolumeLevelScalar(float level, Guid context);
    int j();
    int GetMasterVolumeLevelScalar(out float level);
    int k(); int l(); int m(); int n();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, Guid context);
    int GetMute(out bool mute);
  }
  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice { int Activate(ref Guid id, int context, int parameters, out IAudioEndpointVolume volume); }
  [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceForMeter { int Activate(ref Guid id, int context, int parameters, [MarshalAs(UnmanagedType.IUnknown)] out object meter); }
  [Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioMeterInformation { int GetPeakValue(out float peak); }
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator { int EnumAudioEndpoints(int flow, int state, out IMMDeviceCollection devices); int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device); }
  [Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection { int GetCount(out int count); int Item(int index, out IMMDevice device); }
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator { }
  public static class Audio {
    static IAudioEndpointVolume Endpoint() {
      var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice device; Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
      IAudioEndpointVolume volume; var id = typeof(IAudioEndpointVolume).GUID;
      Marshal.ThrowExceptionForHR(device.Activate(ref id, 23, 0, out volume));
      return volume;
    }
    public static string Read() {
      var v = Endpoint(); float level; bool mute;
      Marshal.ThrowExceptionForHR(v.GetMasterVolumeLevelScalar(out level));
      Marshal.ThrowExceptionForHR(v.GetMute(out mute));
      return ((int)Math.Round(level * 100)).ToString() + " " + (mute ? "1" : "0");
    }
    public static void Set(int percent) {
      var v = Endpoint(); percent = Math.Max(0, Math.Min(100, percent));
      Marshal.ThrowExceptionForHR(v.SetMasterVolumeLevelScalar(percent / 100f, Guid.Empty));
      if (percent > 0) v.SetMute(false, Guid.Empty);
    }
    public static void Mute(bool on) { Endpoint().SetMute(on, Guid.Empty); }
    // how loud this PC plays right now, 0..1 (the sound wave): the loudest of all speakers, because an app can play on another one than the default; fetched anew every few seconds, you may switch speakers
    static IAudioMeterInformation[] meters; static DateTime meterAt;
    public static float Peak() {
      if (meters == null || (DateTime.UtcNow - meterAt).TotalSeconds > 5) {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
        IMMDeviceCollection all; Marshal.ThrowExceptionForHR(enumerator.EnumAudioEndpoints(0, 1, out all));
        int count; Marshal.ThrowExceptionForHR(all.GetCount(out count));
        var found = new IAudioMeterInformation[count];
        for (int i = 0; i < count; i++) {
          IMMDevice device; Marshal.ThrowExceptionForHR(all.Item(i, out device));
          object one; var id = typeof(IAudioMeterInformation).GUID;
          Marshal.ThrowExceptionForHR(((IMMDeviceForMeter)device).Activate(ref id, 23, 0, out one));
          found[i] = (IAudioMeterInformation)one;
        }
        meters = found; meterAt = DateTime.UtcNow;
      }
      float most = 0;
      foreach (var meter in meters) {
        float peak; int failed = meter.GetPeakValue(out peak);
        if (failed != 0) { meters = null; Marshal.ThrowExceptionForHR(failed); }
        if (peak > most) most = peak;
      }
      return most;
    }
  }
}
'@
} catch {}
$volAt = [DateTime]::MinValue; $lastVol = ''
function CheckVolume {
  try { $v = [TwoCodeVolume.Audio]::Read() } catch { return }
  if ($v -ne $script:lastVol) { $script:lastVol = $v; $p = $v.Split(' '); Say @{ volume = [int]$p[0]; muted = ($p[1] -eq '1') } }
}
function CheckFull {
  # 7 ("a Store app is running") also comes for ordinary windowed Store apps (the ChatGPT app): a user's island stayed
  # hidden as long as it ran, even on the desktop. It only counts when the window in front really fills the screen.
  # (beta 82) The same for 2 ("a full-screen app"): a customer's island went away while he worked in VS Code, not in Edge.
  try { $q = 0; [void][TwoCode.Quns]::SHQueryUserNotificationState([ref]$q); $f = (@(3, 4) -contains $q) -or ((@(2, 7) -contains $q) -and [TwoCodeMon.Front]::Covers()) } catch { return }
  $s = ''; if ($f) { try { $s = [TwoCodeMon.Front]::Screen() } catch {} }
  if ("$f $s" -ne $script:wasFull) { $script:wasFull = "$f $s"; Say @{ fullscreen = $f; screen = $s } }
}

# Robo's voice (chat-ui.js): Windows' own voices, the newer ones that come with every language you installed. A voice of
# your language, a man's voice first (Robo is a he), a little higher and quicker, like a small robot. Written to a temp
# file that Twenty-One reads and deletes.
$voiceOk = $true
try { [void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime] } catch { $voiceOk = $false }
function SayAloud($id, $lang, $b64) {
  try {
    if (-not $voiceOk) { Say @{ spoke = $id; error = 'novoice' }; return }
    $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
    $v = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -like "$lang*" } |
      Sort-Object { if ([string]$_.Gender -eq 'Male') { 0 } else { 1 } } | Select-Object -First 1
    if (-not $v) { Say @{ spoke = $id; error = 'novoice' }; return }
    $syn = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer; $syn.Voice = $v
    try { $syn.Options.AudioPitch = 1.2; $syn.Options.SpeakingRate = 1.05 } catch {}
    $stream = Await ($syn.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    if (-not $stream) { Say @{ spoke = $id; error = 'slow' }; return }
    $file = Join-Path ([IO.Path]::GetTempPath()) ("twocode-robo-" + $id + ".wav")
    $net = $asStream.Invoke($null, @($stream)); $fs = [IO.File]::Create($file); $net.CopyTo($fs); $fs.Close()
    Say @{ spoke = $id; file = $file; voice = [string]$v.DisplayName }
  } catch { Say @{ spoke = $id; error = $_.Exception.Message } }
}
# Talking to Robo: Windows' voice typing (Win+H) writes what you say into Robo's chat, which has the keyboard. First wait
# until Ctrl, Alt, Shift and Windows are let go (after the shortcut), else Windows sees a different key combination.
try { Add-Type -Namespace TwoCode -Name Keys -MemberDefinition @'
[DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
[DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vk);
'@ } catch {}
function VoiceTyping {
  try {
    for ($i = 0; $i -lt 30; $i++) { if (-not (@(0x11, 0x12, 0x10, 0x5B, 0x5C) | Where-Object { [TwoCode.Keys]::GetAsyncKeyState($_) -band 0x8000 })) { break }; Start-Sleep -Milliseconds 50 }
    [TwoCode.Keys]::keybd_event(0x5B, 0, 0, [UIntPtr]::Zero); [TwoCode.Keys]::keybd_event(0x48, 0, 0, [UIntPtr]::Zero)
    [TwoCode.Keys]::keybd_event(0x48, 0, 2, [UIntPtr]::Zero); [TwoCode.Keys]::keybd_event(0x5B, 0, 2, [UIntPtr]::Zero)
  } catch {}
}

# Focus guard (focus-guard-main.cjs): which window is in front, only while the guard is on ("guard 1"). One line
# { front } when it changes: the window's title and its program. Nothing is stored; Twenty-One only compares it with the apps
# and sites you picked. "min <hwnd>" minimizes a window (Robo's "Go back").
try { Add-Type -Namespace TwoCode -Name Front -MemberDefinition @'
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, System.Text.StringBuilder s, int n);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
'@ } catch {}
$meterOn = $false
$guardOn = $false; $frontAt = [DateTime]::MinValue; $lastFront = ''; $procNames = @{}
function CheckFront {
  try {
    $h = [TwoCode.Front]::GetForegroundWindow(); if ($h -eq [IntPtr]::Zero) { return }
    $sb = New-Object System.Text.StringBuilder 512; [void][TwoCode.Front]::GetWindowText($h, $sb, 512)
    $fpid = [uint32]0; [void][TwoCode.Front]::GetWindowThreadProcessId($h, [ref]$fpid)
    if (-not $script:procNames.ContainsKey($fpid)) { try { $script:procNames[$fpid] = (Get-Process -Id $fpid -ErrorAction Stop).ProcessName } catch { $script:procNames[$fpid] = '' } }
    $key = "$h|$($sb.ToString())|$fpid"
    if ($key -ne $script:lastFront) { $script:lastFront = $key; Say @{ front = @{ hwnd = [int64]$h; title = $sb.ToString(); proc = $script:procNames[$fpid] } } }
  } catch {}
}

# Wi-Fi and Bluetooth for the island (net-ui.js), like the iPhone's control center: "net" answers one line
# { net: { wifi: { on, ssid, bars }, bt: { on, devices }, wired } } from Windows' radios, the network you are on and the
# Bluetooth devices that are connected (WinRT, the same in every Windows language; about 15 ms). "radio <wifi|bt> <0|1>"
# switches one and answers { radio: { kind, ok } } and a fresh { net }. Nothing runs until the island asks.
$netOk = $false
try {
  [void][Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime]
  [void][Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime]
  [void][Windows.Devices.Bluetooth.BluetoothDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
  [void][Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
  [void][Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
  $netOk = $true
} catch {}
function Radio($kind) {
  $all = Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]])
  $all | Where-Object { [string]$_.Kind -eq $kind } | Select-Object -First 1
}
function NetState {
  if (-not $netOk) { return @{ none = $true } }
  $o = @{ wifi = $null; bt = $null; wired = $false }
  $w = Radio 'WiFi'; $b = Radio 'Bluetooth'
  if ($w) { $o.wifi = @{ on = ([string]$w.State -eq 'On') } }
  if ($b) { $o.bt = @{ on = ([string]$b.State -eq 'On'); devices = @() } }
  try {
    $p = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
    if ($p -and $p.IsWlanConnectionProfile) {
      if (-not $o.wifi) { $o.wifi = @{ on = $true } }
      $o.wifi.ssid = [string]$p.WlanConnectionProfileDetails.GetConnectedSsid()
      $bars = $p.GetSignalBars(); if ($null -ne $bars) { $o.wifi.bars = [int]$bars }
    } elseif ($p) { $o.wired = $true }
  } catch {}
  if ($o.bt -and $o.bt.on) { # (with Bluetooth off Windows still listed a phone as connected)
    $names = @()
    foreach ($cls in @([Windows.Devices.Bluetooth.BluetoothDevice], [Windows.Devices.Bluetooth.BluetoothLEDevice])) {
      try {
        $sel = $cls::GetDeviceSelectorFromConnectionStatus([Windows.Devices.Bluetooth.BluetoothConnectionStatus]::Connected)
        $list = Await ([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($sel)) ([Windows.Devices.Enumeration.DeviceInformationCollection])
        foreach ($d in $list) { if ($d.Name -and $names -notcontains $d.Name) { $names += [string]$d.Name } }
      } catch {}
    }
    $o.bt.devices = @($names | Select-Object -First 6)
  }
  $o
}
function SetRadio($kind, $on) {
  $ok = $false; $why = ''
  try {
    $access = Await ([Windows.Devices.Radios.Radio]::RequestAccessAsync()) ([Windows.Devices.Radios.RadioAccessStatus])
    $r = Radio $(if ($kind -eq 'wifi') { 'WiFi' } else { 'Bluetooth' })
    if (-not $r) { $why = 'none' }
    elseif ([string]$access -ne 'Allowed') { $why = [string]$access }
    else {
      $state = $(if ($on) { [Windows.Devices.Radios.RadioState]::On } else { [Windows.Devices.Radios.RadioState]::Off })
      $res = Await ($r.SetStateAsync($state)) ([Windows.Devices.Radios.RadioAccessStatus])
      $ok = ([string]$res -eq 'Allowed'); if (-not $ok) { $why = [string]$res }
    }
  } catch { $why = 'failed' }
  Say @{ radio = @{ kind = $kind; ok = $ok; why = $why } }
}

# Other apps' notifications (a user: "classic windows notifications style is ass"). Windows lists what it shows; each new
# one goes to the island as { winNotice } and nothing is kept. The first look only remembers what is there already.
$notifyOn = $false; $notifyAt = [DateTime]::MinValue; $script:notifyListener = $null; $script:notifySeen = $null; $script:notifyLogos = @{}; $script:notifyTries = @{}
function NotifyStart {
  if (-not $script:notifyListener) {
    [void][Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
    [void][Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime]
    $script:notifyListener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
  }
  $status = [string]$script:notifyListener.GetAccessStatus()
  if ($status -eq 'Unspecified') { try { $asked = Await ($script:notifyListener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus]); if ($null -ne $asked) { $status = [string]$asked } } catch {} }
  # A program like this may hear "no" or "don't know" while reading works: only a real read counts
  if ($status -ne 'Allowed') { try { if ($null -ne (Await ($script:notifyListener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]))) { $status = 'Allowed' } } catch {} }
  Say @{ winNotify = $status }
  $script:notifySeen = $null
  return ($status -eq 'Allowed')
}
function NotifyLogo($info, $appId) { # the app's own icon, once per app
  if ($script:notifyLogos.ContainsKey($appId)) { return $script:notifyLogos[$appId] }
  $out = ''
  try {
    $ref = $info.DisplayInfo.GetLogo([Windows.Foundation.Size]::new(64, 64))
    $ras = Await ($ref.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    $net = $asStream.Invoke($null, @($ras)); $ms = New-Object System.IO.MemoryStream; $net.CopyTo($ms)
    if ($ms.Length -gt 0 -and $ms.Length -lt 200KB) { $out = [Convert]::ToBase64String($ms.ToArray()) }
  } catch {}
  $script:notifyLogos[$appId] = $out
  return $out
}
function CheckNotify {
  $list = Await ($script:notifyListener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
  if ($null -eq $list) { return }
  $ids = @{}
  foreach ($n in @($list)) {
    $id = [string]$n.Id
    $ids[$id] = 1
    if ($null -eq $script:notifySeen -or $script:notifySeen.ContainsKey($id)) { continue }
    $done = $false
    try {
      # (one at a time: a program whose name can't be read still has its id, for its name and for opening it)
      $info = $null; $appName = ''; $appId = ''; try { $info = $n.AppInfo; $appId = [string]$info.AppUserModelId } catch {}; try { $appName = [string]$info.DisplayInfo.DisplayName } catch {}
      if ($appName -match '^(Twenty-One|Electron)$' -or $appId -match '(?i)twocode') { $done = $true } # Twenty-One's own Windows ones: the island already said it
      else {
        $lines = @($n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric).GetTextElements() | ForEach-Object { [string]$_.Text } | Where-Object { $_ })
        if ($lines.Count) {
          $body = (@($lines | Select-Object -Skip 1) -join ' ')
          if ($body.Length -gt 240) { $body = $body.Substring(0, 240) }
          Say @{ winNotice = @{ id = $id; app = $appName; appId = $appId; title = [string]$lines[0]; body = $body; logo = (NotifyLogo $info $appId) } }
          $done = $true
        }
      }
    } catch {}
    # (it could not be read yet: look again, three times at most, instead of losing this message for good)
    if (-not $done) { $tries = 1 + [int]$script:notifyTries[$id]; if ($tries -lt 3) { $script:notifyTries[$id] = $tries; [void]$ids.Remove($id) } }
  }
  if ($script:notifyTries.Count -gt 40) { $script:notifyTries = @{} }
  $script:notifySeen = $ids
}

$reader = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$pending = $reader.ReadLineAsync()
$last = ''; $artKey = ''; $artLeft = 0; $artNext = [DateTime]::MinValue; $artSum = ''; $nextLook = [DateTime]::MinValue; $lastPos = 0; $lastAt = [DateTime]::UtcNow; $lastPlaying = $false
# (beta 83) This helper keeps what it needed to start (compiling the bits above) in memory for nothing: give it back now and then. A customer: "RAM consumption"
try { Add-Type -Namespace TwoCode -Name Mem -MemberDefinition '[DllImport("psapi.dll")] public static extern bool EmptyWorkingSet(IntPtr h); [DllImport("kernel32.dll")] public static extern IntPtr GetCurrentProcess();' } catch {}
$trimAt = [DateTime]::UtcNow.AddSeconds(20)
while ($true) {
  if ([DateTime]::UtcNow -ge $trimAt) { $trimAt = [DateTime]::UtcNow.AddMinutes(5); try { [GC]::Collect(); [GC]::WaitForPendingFinalizers(); [void][TwoCode.Mem]::EmptyWorkingSet([TwoCode.Mem]::GetCurrentProcess()) } catch {} }
  if ($pending.IsCompleted) {
    $cmd = $pending.Result
    if ($null -eq $cmd) { break } # Twenty-One is gone
    $parts = $cmd.Trim().Split(' ')
    if ($parts[0] -eq 'vol') { try { [TwoCodeVolume.Audio]::Set([int]$parts[1]) } catch {}; $volAt = [DateTime]::MinValue; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'guard') { $guardOn = ($parts[1] -eq '1'); $lastFront = ''; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'meter') { $meterOn = ($parts[1] -eq '1'); $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'notify') { $notifyOn = $false; if ($parts[1] -eq '1') { try { $notifyOn = NotifyStart } catch { Say @{ winNotify = 'Failed' } } }; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'notify-hide' -and $parts.Count -ge 2) { try { $script:notifyListener.RemoveNotification([uint32]$parts[1]) } catch {}; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'min') { try { [void][TwoCode.Front]::ShowWindow([IntPtr][int64]$parts[1], 6) } catch {}; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'say' -and $parts.Count -ge 4) { SayAloud $parts[1] $parts[2] $parts[3]; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'listen') { VoiceTyping; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'net') { try { Say @{ net = (NetState) } } catch { Say @{ net = @{ none = $true } } }; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'radio' -and $parts.Count -ge 3) { SetRadio $parts[1] ($parts[2] -eq '1'); try { Say @{ net = (NetState) } } catch {}; $pending = $reader.ReadLineAsync(); continue }
    if ($parts[0] -eq 'mute') { try { [TwoCodeVolume.Audio]::Mute($parts[1] -eq '1') } catch {}; $volAt = [DateTime]::MinValue; $pending = $reader.ReadLineAsync(); continue }
    try {
      $s = Pick
      if ($s) {
        switch ($parts[0]) {
          'play' { [void](Await ($s.TryPlayAsync()) ([bool])) }
          'pause' { [void](Await ($s.TryPauseAsync()) ([bool])) }
          'toggle' { [void](Await ($s.TryTogglePlayPauseAsync()) ([bool])) }
          'next' { [void](Await ($s.TrySkipNextAsync()) ([bool])) }
          'previous' { [void](Await ($s.TrySkipPreviousAsync()) ([bool])) }
          'seek' { if (-not (Await ($s.TryChangePlaybackPositionAsync([long]$parts[1] * 10000)) ([bool]))) { Say @{ seekFailed = $true } } } # (beta 83) some music apps refuse: the island says so
        }
      }
    } catch {}
    $pending = $reader.ReadLineAsync(); $nextLook = [DateTime]::MinValue; $last = '' # answer right away, also after a seek
  }
  if ([DateTime]::UtcNow -ge $nextLook) {
    $nextLook = [DateTime]::UtcNow.AddMilliseconds(700)
    try {
      $s = Pick
      if (-not $s) { $out = @{ active = $false } }
      else {
        $p = Await ($s.TryGetMediaPropertiesAsync()) $Props
        $tl = $s.GetTimelineProperties()
        $playing = [int]$s.GetPlaybackInfo().PlaybackStatus -eq 4
        $pos = $tl.Position.TotalMilliseconds
        if ($playing -and $tl.LastUpdatedTime.Year -gt 2000) { $pos += ([DateTimeOffset]::Now - $tl.LastUpdatedTime).TotalMilliseconds }
        $dur = ($tl.EndTime - $tl.StartTime).TotalMilliseconds
        $key = "$($p.Title)|$($p.Artist)|$($p.AlbumTitle)"
        $out = @{ active = [bool]$p.Title; app = [string]$s.SourceAppUserModelId; playing = $playing; title = [string]$p.Title; artist = [string]$p.Artist
          album = [string]$p.AlbumTitle; duration = [long][Math]::Max(0, $dur); position = [long][Math]::Max(0, [Math]::Min($pos, [Math]::Max($dur, $pos))); key = $key }
        # (beta 107) The cover: when the song changes, and again 1.5 s and 4.5 s later. Apple Music shows the new title a moment
        # before the new cover, so a single look could keep the last song's cover for the whole song (a founder's report).
        # A second look only sends the cover when it is a different picture.
        if ($key -ne $artKey) { $artKey = $key; $artLeft = 3; $artNext = [DateTime]::UtcNow; $artSum = '' }
        if ($artLeft -gt 0 -and [DateTime]::UtcNow -ge $artNext -and $p.Thumbnail) {
          $artLeft--; $artNext = [DateTime]::UtcNow.AddMilliseconds($(if ($artLeft -eq 2) { 1500 } else { 3000 }))
          try {
            $ras = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
            $net = $asStream.Invoke($null, @($ras))
            $ms = New-Object System.IO.MemoryStream; $net.CopyTo($ms)
            if ($ms.Length -gt 0 -and $ms.Length -lt 3MB) { # media-main.cjs sees if it is a PNG or JPEG
              $bytes = $ms.ToArray(); $sum = [Convert]::ToBase64String([Security.Cryptography.MD5]::Create().ComputeHash($bytes))
              if ($sum -ne $artSum) { $artSum = $sum; $out.art = [Convert]::ToBase64String($bytes) }
            }
          } catch {}
        }
      }
      # one line when something changed; the position moves by itself while playing, so it only counts when it jumps
      # (a seek, here or in the music app itself)
      $same = ($out.Clone()); $same.Remove('position'); $same.Remove('art')
      $now = ($same | ConvertTo-Json -Compress)
      $expected = $lastPos + $(if ($lastPlaying) { ([DateTime]::UtcNow - $lastAt).TotalMilliseconds } else { 0 })
      $jumped = $out.active -and [Math]::Abs([double]$out.position - $expected) -gt 1500
      if ($now -ne $last -or $out.art -or $jumped) {
        Say $out; $last = $now
        if ($out.active) { $lastPos = [double]$out.position; $lastAt = [DateTime]::UtcNow; $lastPlaying = [bool]$out.playing }
      }
    } catch { Say @{ active = $false; error = $_.Exception.Message } }
  }
  if ([DateTime]::UtcNow -ge $fullAt) { $fullAt = [DateTime]::UtcNow.AddMilliseconds(1000); CheckFull }
  if ($guardOn -and [DateTime]::UtcNow -ge $frontAt) { $frontAt = [DateTime]::UtcNow.AddMilliseconds(400); CheckFront }
  if ([DateTime]::UtcNow -ge $volAt) { $volAt = [DateTime]::UtcNow.AddMilliseconds(150); CheckVolume }
  if ($notifyOn -and [DateTime]::UtcNow -ge $notifyAt) { $notifyAt = [DateTime]::UtcNow.AddMilliseconds(700); try { CheckNotify } catch {} }
  if ($meterOn) { try { [Console]::Out.WriteLine('{"peak":' + ([TwoCodeVolume.Audio]::Peak()).ToString('0.000', [Globalization.CultureInfo]::InvariantCulture) + '}'); [Console]::Out.Flush() } catch {} }
  Start-Sleep -Milliseconds 100
}
