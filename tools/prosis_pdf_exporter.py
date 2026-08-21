"""Export visible PROSIS diagnostic documents to PDF through the UI.

Run this script from the same Windows desktop session where PROSIS is open.
It never reads or modifies the PROSIS database.  Coordinates are calibrated
once because the legacy PROSIS UI has no stable automation identifiers.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

import pyautogui
import pyperclip
from pywinauto import Desktop


OUTPUT_DIR = Path(r"D:\에러코드\에러코드 EC300E")
CONFIG_PATH = Path(__file__).with_name("prosis_pdf_exporter.coords.json")
WINDOW_RE = re.compile(r"^PROSIS Offline", re.IGNORECASE)


def prosis_window():
    for win in Desktop(backend="uia").windows():
        if WINDOW_RE.search(win.window_text() or "") and win.is_visible():
            return win
    raise RuntimeError("PROSIS 창을 찾지 못했습니다. 같은 사용자 화면에서 실행하세요.")


def relative_mouse_position():
    win = prosis_window()
    rect = win.rectangle()
    pos = pyautogui.position()
    return {"x": pos.x - rect.left, "y": pos.y - rect.top}


def click(win, point: dict[str, int]):
    rect = win.rectangle()
    pyautogui.click(rect.left + point["x"], rect.top + point["y"])


def wait_for_user(message: str):
    input(f"\n{message}\n준비되면 Enter를 누르세요: ")


def calibrate():
    print("PROSIS를 최대화하고, EC300E 진단 검색 결과의 첫 DTC 행을 선택하세요.")
    points = {}
    labels = [
        ("first_row", "첫 DTC 행의 코드 텍스트 위에 마우스를 올리세요."),
        ("second_row", "둘째 DTC 행의 코드 텍스트 위에 마우스를 올리세요."),
        ("profile", "선택된 행의 오른쪽 '프로파일' 링크 위에 마우스를 올리세요."),
        ("document_link", "프로파일을 클릭한 뒤 나타나는 빨간 DTC 제목 링크 위에 마우스를 올리세요."),
        ("print", "전체 진단 문서가 열린 뒤 상단 '인쇄' 버튼 위에 마우스를 올리세요."),
    ]
    for name, message in labels:
        wait_for_user(message)
        points[name] = relative_mouse_position()
        print(f"  {name}: {points[name]}")

    pitch = points["second_row"]["y"] - points["first_row"]["y"]
    if pitch <= 0:
        raise RuntimeError("첫째/둘째 행의 순서가 맞지 않습니다. 다시 보정하세요.")
    points["row_pitch"] = pitch
    CONFIG_PATH.write_text(json.dumps(points, indent=2), encoding="utf-8")
    print(f"보정 저장: {CONFIG_PATH}")


def load_config():
    if not CONFIG_PATH.exists():
        raise RuntimeError("먼저 --calibrate를 실행하세요.")
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def current_dtc_code() -> str | None:
    """Try to copy selected document text and obtain the leading DTC code."""
    pyperclip.copy("")
    pyautogui.hotkey("ctrl", "a")
    pyautogui.hotkey("ctrl", "c")
    time.sleep(0.3)
    match = re.search(r"\b([A-Z]\d{5,7}[A-Z0-9]*)\b", pyperclip.paste())
    return match.group(1) if match else None


def print_current_document(output_file: Path):
    """Handle the standard Windows print and Save Print Output As dialogs."""
    desktop = Desktop(backend="uia")
    deadline = time.time() + 20
    print_dialog = None
    while time.time() < deadline:
        for win in desktop.windows():
            title = (win.window_text() or "").lower()
            if "print" in title or "인쇄" in title:
                print_dialog = win
                break
        if print_dialog:
            break
        time.sleep(0.25)
    if not print_dialog:
        raise RuntimeError("인쇄 창을 찾지 못했습니다.")

    print_dialog.set_focus()
    # Windows print dialogs select a printer through keyboard type-ahead.
    pyautogui.write("Microsoft Print to PDF", interval=0.02)
    time.sleep(0.5)
    pyautogui.press("enter")

    deadline = time.time() + 20
    save_dialog = None
    while time.time() < deadline:
        for win in desktop.windows():
            title = (win.window_text() or "").lower()
            if "save print output" in title or "다른 이름으로 저장" in title or "save as" in title:
                save_dialog = win
                break
        if save_dialog:
            break
        time.sleep(0.25)
    if not save_dialog:
        raise RuntimeError("PDF 저장 창을 찾지 못했습니다.")

    save_dialog.set_focus()
    # File-name edit is reliably focused by Alt+N in the common Windows dialog.
    pyautogui.hotkey("alt", "n")
    pyautogui.write(str(output_file), interval=0.01)
    pyautogui.press("enter")
    time.sleep(1)
    # Overwrite confirmation, if a previous file exists.
    pyautogui.press("left")
    pyautogui.press("enter")


def export_one(config, row_index: int, explicit_code: str | None = None):
    win = prosis_window()
    row = dict(config["first_row"])
    row["y"] += config["row_pitch"] * row_index
    click(win, row)
    time.sleep(0.4)
    profile = dict(config["profile"])
    profile["y"] += config["row_pitch"] * row_index
    click(win, profile)
    time.sleep(0.8)
    click(win, config["document_link"])
    time.sleep(1.2)

    code = explicit_code or current_dtc_code()
    if not code:
        raise RuntimeError("DTC 코드를 읽지 못했습니다. --code P042468처럼 지정하세요.")
    output_file = OUTPUT_DIR / f"{code}.pdf"
    if output_file.exists():
        print(f"이미 존재하여 건너뜀: {output_file.name}")
        return
    click(prosis_window(), config["print"])
    print_current_document(output_file)
    print(f"저장 완료: {output_file}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--calibrate", action="store_true", help="화면 좌표를 한 번 보정")
    parser.add_argument("--test", action="store_true", help="현재 첫 행만 PDF로 시험 저장")
    parser.add_argument("--code", help="시험 저장에 사용할 DTC 코드 (예: P042468)")
    args = parser.parse_args()
    if args.calibrate:
        calibrate()
        return
    if args.test:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        export_one(load_config(), 0, args.code)
        return
    parser.error("--calibrate 또는 --test 중 하나를 지정하세요.")


if __name__ == "__main__":
    main()
