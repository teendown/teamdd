"""자동까이꺼 — PROSIS 진단 색인 문서를 순차 PDF로 저장하는 UI 자동화.

실제 PROSIS가 보이는 Windows 사용자 세션에서만 실행하세요. 이 도구는
PROSIS DB를 열지 않고 화면 클릭과 기본 프린터의 PDF 저장 창만 사용합니다.
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

NAME = "자동까이꺼"
OUTPUT = Path(r"D:\에러코드\에러코드 EC300E")
CONFIG = Path(__file__).with_name("자동까이꺼.coords.json")


def prosis():
    for window in Desktop(backend="uia").windows():
        if (window.window_text() or "").startswith("PROSIS Offline") and window.is_visible():
            return window
    raise RuntimeError("PROSIS 창을 찾지 못했습니다. PROSIS가 보이는 사용자 화면에서 실행하세요.")


def prompt_point(message: str) -> dict[str, int]:
    input(f"\n{message}\n마우스를 올린 뒤 Enter: ")
    win, mouse, rect = prosis(), pyautogui.position(), None
    rect = win.rectangle()
    point = {"x": mouse.x - rect.left, "y": mouse.y - rect.top}
    print(point)
    return point


def click(point: dict[str, int]):
    rect = prosis().rectangle()
    pyautogui.click(rect.left + point["x"], rect.top + point["y"])


def moved(point: dict[str, int], rows: int, pitch: int) -> dict[str, int]:
    return {"x": point["x"], "y": point["y"] + rows * pitch}


def calibrate():
    print(f"{NAME} 좌표 보정\n"
          "PROSIS를 최대화하고 진단 검색 결과의 첫 항목이 보이는 상태에서 시작하세요.")
    c = {}
    c["profile_first"] = prompt_point("첫 DTC 행의 오른쪽 '프로파일' 링크 위에 마우스를 올리세요.")
    c["profile_second"] = prompt_point("둘째 DTC 행의 오른쪽 '프로파일' 링크 위에 마우스를 올리세요.")
    c["index_first"] = prompt_point("프로파일을 클릭해 열린 색인 화면의 첫 문서 링크 위에 마우스를 올리세요.")
    c["index_second"] = prompt_point("색인이 두 개 이상일 때 둘째 문서 링크가 나타날 위치 위에 마우스를 올리세요.\n"
                                     "둘째 문서가 없으면 첫 링크 바로 아래 같은 열의 다음 줄을 지정하세요.")
    c["back"] = prompt_point("문서/색인 화면에서 이전 화면으로 가는 초록색 뒤로 버튼 위에 마우스를 올리세요.")
    c["profile_pitch"] = c["profile_second"]["y"] - c["profile_first"]["y"]
    c["index_pitch"] = c["index_second"]["y"] - c["index_first"]["y"]
    if c["profile_pitch"] <= 0 or c["index_pitch"] <= 0:
        raise RuntimeError("둘째 행은 첫째 행보다 아래에 지정해야 합니다.")
    CONFIG.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"보정 저장 완료: {CONFIG}")


def config():
    if not CONFIG.exists():
        raise RuntimeError("먼저 --calibrate를 실행하세요.")
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def copied_page_text() -> str:
    pyperclip.copy("")
    pyautogui.hotkey("ctrl", "a")
    pyautogui.hotkey("ctrl", "c")
    time.sleep(0.25)
    return pyperclip.paste()


def is_full_document() -> bool:
    # The full diagnostic page contains this fixed section; an index page does not.
    return "ISO DTC" in copied_page_text()


def next_number() -> int:
    numbers = []
    for file in OUTPUT.glob("*.pdf"):
        match = re.fullmatch(r"(\d+)", file.stem)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers, default=0) + 1


def wait_save_dialog():
    until = time.time() + 20
    while time.time() < until:
        for window in Desktop(backend="uia").windows():
            title = (window.window_text() or "").lower()
            if "save print output" in title or "다른 이름으로 저장" in title or "save as" in title:
                return window
        time.sleep(0.2)
    raise RuntimeError("PDF 파일 저장 창을 찾지 못했습니다.")


def print_pdf(number: int):
    # Ctrl+P opens PROSIS print dialog. Enter accepts its already-selected default printer.
    pyautogui.hotkey("ctrl", "p")
    time.sleep(1.0)
    pyautogui.press("enter")
    save = wait_save_dialog()
    save.set_focus()
    pyautogui.hotkey("alt", "n")
    pyautogui.write(str(OUTPUT / f"{number}.pdf"), interval=0.015)
    pyautogui.press("enter")
    time.sleep(1.0)
    # Accept an overwrite prompt only when it occurs (numbers are normally unused).
    pyautogui.press("left")
    pyautogui.press("enter")
    time.sleep(0.8)


def back():
    click(config()["back"])
    time.sleep(0.8)


def run(profile_count: int, max_indexes: int):
    c = config()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    number = next_number()
    print(f"{NAME} 시작: {profile_count}개 프로파일, 파일 번호 {number}부터")
    for profile_no in range(profile_count):
        # This version processes the currently visible result list. Use --profiles only
        # for the count visible in the list; re-run after scrolling to the next page.
        click(moved(c["profile_first"], profile_no, c["profile_pitch"]))
        time.sleep(0.8)
        saved_here = 0
        for index_no in range(max_indexes):
            click(moved(c["index_first"], index_no, c["index_pitch"]))
            time.sleep(0.9)
            if not is_full_document():
                # No further index at this position. Return from the unchanged index page.
                break
            print_pdf(number)
            print(f"저장: {number}.pdf (프로파일 {profile_no + 1}, 색인 {index_no + 1})")
            number += 1
            saved_here += 1
            back()  # full document -> its index list
        back()      # index list -> diagnostic search results
        print(f"프로파일 {profile_no + 1} 완료: {saved_here}개 저장")
    print(f"완료. 다음 번호: {number}")


def main():
    parser = argparse.ArgumentParser(description=NAME)
    parser.add_argument("--calibrate", action="store_true", help="화면 좌표 보정")
    parser.add_argument("--run", action="store_true", help="보정된 좌표로 순차 저장")
    parser.add_argument("--profiles", type=int, help="현재 화면에 보이는 프로파일 행 수")
    parser.add_argument("--max-indexes", type=int, default=12, help="프로파일별 최대 색인 수")
    args = parser.parse_args()
    if args.calibrate:
        calibrate()
    elif args.run:
        if not args.profiles or args.profiles < 1:
            parser.error("--run에는 --profiles 행 개수가 필요합니다.")
        run(args.profiles, args.max_indexes)
    else:
        parser.error("--calibrate 또는 --run을 지정하세요.")


if __name__ == "__main__":
    main()
