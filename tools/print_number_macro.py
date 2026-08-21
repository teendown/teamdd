"""작은 UI를 가진 F8/F7 인쇄 번호 매크로 (Windows 전용)."""
from __future__ import annotations

import ctypes
import time
from ctypes import wintypes
from pathlib import Path

user32 = ctypes.WinDLL("user32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
STATE_FILE = Path(__file__).with_name("print_number_macro_state.txt")
VK_F7, VK_F8, MOD_NOREPEAT = 0x76, 0x77, 0x4000
WM_DESTROY, WM_COMMAND, WM_HOTKEY = 0x0002, 0x0111, 0x0312
WS_OVERLAPPEDWINDOW = 0x00CF0000
WS_CHILD_VISIBLE = 0x50000000
BS_PUSHBUTTON, SW_SHOW = 0, 5
ID_TOGGLE, ID_RESET, ID_F7, ID_F8 = 1001, 1002, 1, 2

LRESULT = ctypes.c_ssize_t
WNDPROC = ctypes.WINFUNCTYPE(LRESULT, wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM)


class WNDCLASS(ctypes.Structure):
    _fields_ = [("style", wintypes.UINT), ("lpfnWndProc", WNDPROC), ("cbClsExtra", ctypes.c_int),
                ("cbWndExtra", ctypes.c_int), ("hInstance", wintypes.HINSTANCE), ("hIcon", wintypes.HANDLE),
                ("hCursor", wintypes.HANDLE), ("hbrBackground", wintypes.HANDLE),
                ("lpszMenuName", wintypes.LPCWSTR), ("lpszClassName", wintypes.LPCWSTR)]


def next_number() -> int:
    try:
        return max(1, int(STATE_FILE.read_text(encoding="utf-8").strip()))
    except (FileNotFoundError, ValueError):
        return 1


def save(number: int) -> None:
    STATE_FILE.write_text(str(number), encoding="utf-8")


def send_keys(number: int) -> None:
    keyup, ctrl, p, enter = 2, 0x11, 0x50, 0x0D
    user32.keybd_event(ctrl, 0, 0, 0); user32.keybd_event(p, 0, 0, 0)
    user32.keybd_event(p, 0, keyup, 0); user32.keybd_event(ctrl, 0, keyup, 0)
    time.sleep(0.7)
    for char in str(number):
        user32.keybd_event(ord(char), 0, 0, 0); user32.keybd_event(ord(char), 0, keyup, 0)
    user32.keybd_event(enter, 0, 0, 0); user32.keybd_event(enter, 0, keyup, 0)


class App:
    def __init__(self) -> None:
        self.number, self.enabled = next_number(), False
        self.instance = kernel32.GetModuleHandleW(None)
        self.proc = WNDPROC(self.window_proc)  # keep callback alive
        wc = WNDCLASS(0, self.proc, 0, 0, self.instance, None, user32.LoadCursorW(None, 32512), 6, None, "PrintNumberMacro")
        user32.RegisterClassW(ctypes.byref(wc))
        self.hwnd = user32.CreateWindowExW(0, "PrintNumberMacro", "인쇄 번호 매크로", 0x00CF0000,
            100, 100, 270, 205, None, None, self.instance, None)
        self.number_text = self.control("STATIC", "", 15, 18, 230, 48, 0)
        self.status_text = self.control("STATIC", "", 15, 68, 230, 25, 0)
        self.toggle_button = self.control("BUTTON", "", 45, 103, 165, 30, ID_TOGGLE)
        self.control("BUTTON", "번호를 1로 초기화", 45, 139, 165, 27, ID_RESET)
        user32.RegisterHotKey(None, ID_F7, MOD_NOREPEAT, VK_F7)
        user32.RegisterHotKey(None, ID_F8, MOD_NOREPEAT, VK_F8)
        self.update()
        user32.ShowWindow(self.hwnd, SW_SHOW)

    def control(self, kind: str, text: str, x: int, y: int, w: int, h: int, control_id: int):
        style = WS_CHILD_VISIBLE | (BS_PUSHBUTTON if kind == "BUTTON" else 0)
        return user32.CreateWindowExW(0, kind, text, style, x, y, w, h, self.hwnd, control_id, self.instance, None)

    def update(self) -> None:
        user32.SetWindowTextW(self.number_text, f"다음 입력 번호:  {self.number}")
        user32.SetWindowTextW(self.status_text, "● 실행 중  (F7 사용 가능)" if self.enabled else "● 대기 중  (F8로 시작)")
        user32.SetWindowTextW(self.toggle_button, "F8  종료" if self.enabled else "F8  시작")

    def toggle(self) -> None:
        self.enabled = not self.enabled
        self.update()

    def print_number(self) -> None:
        if self.enabled:
            send_keys(self.number)
            self.number += 1
            save(self.number)
            self.update()

    def window_proc(self, hwnd, msg, wparam, lparam):
        if msg == WM_HOTKEY:
            self.toggle() if wparam == ID_F8 else self.print_number()
            return 0
        if msg == WM_COMMAND:
            command = wparam & 0xFFFF
            if command == ID_TOGGLE: self.toggle()
            elif command == ID_RESET:
                self.number = 1; save(self.number); self.update()
            return 0
        if msg == WM_DESTROY:
            user32.UnregisterHotKey(None, ID_F7); user32.UnregisterHotKey(None, ID_F8)
            user32.PostQuitMessage(0)
            return 0
        return user32.DefWindowProcW(hwnd, msg, wparam, lparam)

    def run(self) -> None:
        message = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(message), None, 0, 0) > 0:
            user32.TranslateMessage(ctypes.byref(message)); user32.DispatchMessageW(ctypes.byref(message))


if __name__ == "__main__":
    App().run()
