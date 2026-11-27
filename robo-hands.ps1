# Robo's hands (robo-plus-main.cjs, Robo Plus): the mouse and the keyboard while Robo works on the PC and you watch.
# Runs only during a task and answers one line at a time, like Robo's eyes (buddy-helper.ps1). Physical pixels.
#   <id> pos                          -> where the mouse is
#   <id> move <x> <y>                 -> moves the mouse there
#   <id> click <x> <y> <btn> <n> <mods> -> btn left|right|middle, n clicks, mods: virtual keys held down ("-" for none, "17,16")
#   <id> drag <x1> <y1> <x2> <y2>     -> left button down at 1, a smooth move to 2, up
#   <id> scroll <x> <y> <dx> <dy> <mods> -> notches: dy > 0 is down, dx > 0 is right
#   <id> keys <vk,vk,...> <repeat>    -> presses them together (in order, released in reverse), repeat times
#   <id> type <base64 of UTF-8 text> <ms> -> types it letter by letter (any language), ms between letters
#   <id> fg                           -> the window in front now (its handle), for "write anywhere"
#   <id> focus <hwnd>                 -> that window to the front again (to paste Robo's text back where it came from)
#   <id> modsup <ms>                  -> waits until Ctrl, Alt, Shift and Win are let go (at most ms): the user's own shortcut
param([int]$Skip = 0)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Threading;
public static class RoboHands {
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION u; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
  public static void Init() { try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { SetProcessDPIAware(); } }
  static void Send(INPUT i) { SendInput(1, new INPUT[] { i }, Marshal.SizeOf(typeof(INPUT))); }
  static INPUT Mouse(uint flags, uint data) { var i = new INPUT { type = 0 }; i.u.mi = new MOUSEINPUT { dwFlags = flags, mouseData = data }; return i; }
  static bool Extended(ushort vk) { return (vk >= 0x21 && vk <= 0x2E) || vk == 0x5B || vk == 0x5C || vk == 0x5D || vk == 0x6F || vk == 0x90; }
  static INPUT Key(ushort vk, bool up) { var i = new INPUT { type = 1 }; i.u.ki = new KEYBDINPUT { wVk = vk, dwFlags = (up ? 2u : 0u) | (Extended(vk) ? 1u : 0u) }; return i; }
  static INPUT Unicode(char c, bool up) { var i = new INPUT { type = 1 }; i.u.ki = new KEYBDINPUT { wScan = (ushort)c, dwFlags = 4u | (up ? 2u : 0u) }; return i; }
  static ushort[] Vks(string list) {
    if (string.IsNullOrEmpty(list) || list == "-") return new ushort[0];
    var parts = list.Split(','); var vks = new ushort[parts.Length];
    for (int k = 0; k < parts.Length; k++) vks[k] = ushort.Parse(parts[k]);
    return vks;
  }
  static void Down(ushort[] vks) { foreach (var v in vks) Send(Key(v, false)); }
  static void Up(ushort[] vks) { for (int k = vks.Length - 1; k >= 0; k--) Send(Key(vks[k], true)); }
  public static string Pos() { POINT p; GetCursorPos(out p); return "{\"x\":" + p.X + ",\"y\":" + p.Y + "}"; }
  public static string Move(int x, int y) { SetCursorPos(x, y); return "{\"ok\":true}"; }
  public static string Click(int x, int y, string button, int n, string mods) {
    uint down = 2, up = 4; if (button == "right") { down = 8; up = 16; } else if (button == "middle") { down = 32; up = 64; }
    var held = Vks(mods);
    SetCursorPos(x, y); Thread.Sleep(30);
    Down(held);
    for (int k = 0; k < Math.Max(1, Math.Min(3, n)); k++) { Send(Mouse(down, 0)); Thread.Sleep(15); Send(Mouse(up, 0)); Thread.Sleep(45); }
    Up(held);
    return "{\"ok\":true}";
  }
  public static string Drag(int x1, int y1, int x2, int y2) {
    SetCursorPos(x1, y1); Thread.Sleep(40); Send(Mouse(2, 0)); Thread.Sleep(60);
    for (int k = 1; k <= 20; k++) { SetCursorPos(x1 + (x2 - x1) * k / 20, y1 + (y2 - y1) * k / 20); Thread.Sleep(12); }
    Thread.Sleep(40); Send(Mouse(4, 0));
    return "{\"ok\":true}";
  }
  public static string Scroll(int x, int y, int dx, int dy, string mods) {
    var held = Vks(mods);
    SetCursorPos(x, y); Thread.Sleep(30); Down(held);
    for (int k = 0; k < Math.Min(30, Math.Abs(dy)); k++) { Send(Mouse(0x800, unchecked((uint)(dy > 0 ? -120 : 120)))); Thread.Sleep(25); }
    for (int k = 0; k < Math.Min(30, Math.Abs(dx)); k++) { Send(Mouse(0x1000, unchecked((uint)(dx > 0 ? 120 : -120)))); Thread.Sleep(25); }
    Up(held);
    return "{\"ok\":true}";
  }
  public static string Keys(string list, int repeat) {
    var vks = Vks(list);
    for (int r = 0; r < Math.Max(1, Math.Min(100, repeat)); r++) { Down(vks); Thread.Sleep(20); Up(vks); Thread.Sleep(30); }
    return "{\"ok\":true}";
  }
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int vk);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("kernel32.dll")] static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] static extern bool AttachThreadInput(uint a, uint b, bool attach);
  [DllImport("user32.dll")] static extern bool BringWindowToTop(IntPtr h);
  public static string Front() { return "{\"hwnd\":" + GetForegroundWindow().ToInt64() + "}"; }
  public static string Focus(long hwnd) {
    var h = new IntPtr(hwnd);
    if (hwnd == 0 || !IsWindow(h)) return "{\"error\":\"no window\"}";
    if (IsIconic(h)) ShowWindow(h, 9);
    // Windows only lets the app in front hand the front to another window: for a moment this helper shares the input
    // of the window in front now (Twenty-One's island, where you clicked), so it may
    uint front = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero), me = GetCurrentThreadId();
    bool joined = front != 0 && front != me && AttachThreadInput(me, front, true);
    BringWindowToTop(h); SetForegroundWindow(h);
    if (joined) AttachThreadInput(me, front, false);
    if (GetForegroundWindow() != h) { // still not: a tap on Alt counts as input of ours (only now, so Word never sees it as a key)
      Send(Key(0x12, false)); Send(Key(0x12, true)); SetForegroundWindow(h);
    }
    Thread.Sleep(60);
    return "{\"ok\":" + (GetForegroundWindow() == h ? "true" : "false") + "}";
  }
  public static string ModsUp(int ms) {
    int[] mods = { 0x10, 0x11, 0x12, 0x5B, 0x5C };
    var end = DateTime.Now.AddMilliseconds(Math.Max(0, Math.Min(5000, ms)));
    while (true) {
      bool any = false; foreach (var vk in mods) if ((GetAsyncKeyState(vk) & 0x8000) != 0) { any = true; break; }
      if (!any) return "{\"ok\":true,\"up\":true}";
      if (DateTime.Now > end) return "{\"ok\":true,\"up\":false}";
      Thread.Sleep(15);
    }
  }
  public static string Type(string text, int ms) {
    foreach (char c in text) {
      if (c == '\r') continue;
      if (c == '\n') { Send(Key(0x0D, false)); Send(Key(0x0D, true)); }
      else if (c == '\t') { Send(Key(0x09, false)); Send(Key(0x09, true)); }
      else { Send(Unicode(c, false)); Send(Unicode(c, true)); }
      if (ms > 0) Thread.Sleep(ms);
    }
    return "{\"ok\":true}";
  }
}
"@
[RoboHands]::Init()
[Console]::Out.WriteLine('{"ready":true}'); [Console]::Out.Flush()
while ($null -ne ($line = [Console]::In.ReadLine())) {
  $p = $line.Split(' '); $id = $p[0]
  try {
    switch ($p[1]) {
      'pos'    { $out = [RoboHands]::Pos() }
      'move'   { $out = [RoboHands]::Move([int]$p[2], [int]$p[3]) }
      'click'  { $out = [RoboHands]::Click([int]$p[2], [int]$p[3], $p[4], [int]$p[5], $p[6]) }
      'drag'   { $out = [RoboHands]::Drag([int]$p[2], [int]$p[3], [int]$p[4], [int]$p[5]) }
      'scroll' { $out = [RoboHands]::Scroll([int]$p[2], [int]$p[3], [int]$p[4], [int]$p[5], $p[6]) }
      'keys'   { $out = [RoboHands]::Keys($p[2], [int]$p[3]) }
      'type'   { $out = [RoboHands]::Type([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($p[2])), [int]$p[3]) }
      'fg'     { $out = [RoboHands]::Front() }
      'focus'  { $out = [RoboHands]::Focus([long]$p[2]) }
      'modsup' { $out = [RoboHands]::ModsUp([int]$p[2]) }
      default  { $out = '{"error":"unknown"}' }
    }
  } catch { $out = '{"error":"' + ($_.Exception.Message -replace '[\\"]', ' ') + '"}' }
  [Console]::Out.WriteLine($id + ' ' + $out); [Console]::Out.Flush()
}
