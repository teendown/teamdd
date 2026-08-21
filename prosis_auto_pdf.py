import os
import time
import pyautogui
import pyperclip

# ==========================================
# [설정] 테스트용 고장코드 10개 목록
# ==========================================
TEST_DTC_LIST = [
    "B103711",
    "P008800",
    "P102864",
    "B102C19",
    "P05407E",
    "U05A300",
    "C101900",
    "P20F493",
    "P2CE311",
    "P06279C"
]

# PDF 저장 폴더
OUTPUT_DIR = r"d:\허강\프로그램\DD관리프로그램\pdf_exports"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def print_banner():
    print("=" * 60)
    print(" 🛠️  볼보 PROSIS 고장코드 자동 인쇄 (PDF 자동화 매크로) 🛠️")
    print("=" * 60)
    print(f"총 {len(TEST_DTC_LIST)}개의 고장코드를 순차적으로 검색 및 인쇄합니다.")
    print(f"저장 폴더: {OUTPUT_DIR}\n")
    print("👉 [시작 전 준비]")
    print(" 1. PROSIS 프로그램을 화면에 띄워주세요.")
    print(" 2. '검색창'에 커서가 깜빡이도록 마우스로 한 번 클릭해 주세요.")
    print("=" * 60)

def run_auto_export():
    print_banner()
    
    for sec in range(5, 0, -1):
        print(f"⏳ {sec}초 후에 매크로가 시작됩니다! PROSIS 창의 검색창을 클릭해 두세요...")
        time.sleep(1)
        
    print("\n🚀 자동화 매크로 시작!\n")

    for idx, dtc in enumerate(TEST_DTC_LIST, start=1):
        pdf_path = os.path.join(OUTPUT_DIR, f"{dtc}.pdf")
        print(f"[{idx}/{len(TEST_DTC_LIST)}] 고장코드 진행 중: {dtc} -> {dtc}.pdf")

        # 1. 기존 검색어 지우기 (Ctrl+A -> Backspace)
        pyautogui.hotkey('ctrl', 'a')
        time.sleep(0.2)
        pyautogui.press('backspace')
        time.sleep(0.2)

        # 2. 고장코드 입력 및 검색
        pyperclip.copy(dtc)
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.3)
        pyautogui.press('enter')
        time.sleep(1.5)  # 검색 결과 로딩 대기

        # 3. 첫 번째 검색 결과 열기 (아래 화살표 -> Enter)
        pyautogui.press('down')
        time.sleep(0.3)
        pyautogui.press('enter')
        time.sleep(2.0)  # 진단서 문서 로딩 대기

        # 4. 인쇄 단축키 (Ctrl + P)
        pyautogui.hotkey('ctrl', 'p')
        time.sleep(2.0)  # 인쇄 대화상자 대기

        # 5. 인쇄 대화상자에서 확인 (Enter)
        pyautogui.press('enter')
        time.sleep(1.5)  # 파일 저장 대화상자 대기

        # 6. 파일 경로 입력 및 저장
        pyperclip.copy(pdf_path)
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.5)
        pyautogui.press('enter')
        time.sleep(1.5)  # PDF 저장 완료 대기

        # 7. PROSIS 검색창으로 다시 포커스 이동 (Esc 또는 F3 / 단축키)
        pyautogui.press('esc')
        time.sleep(0.3)
        pyautogui.hotkey('ctrl', 'f')  # 검색창 포커스
        time.sleep(0.5)

        print(f"   ✅ {dtc}.pdf 저장 완료!")

    print("\n🎉 모든 테스트 고장코드 10개의 PDF 생성이 완료되었습니다!")
    print(f"📁 확인 폴더: {OUTPUT_DIR}")

if __name__ == "__main__":
    run_auto_export()
