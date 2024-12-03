from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import sys
import time
import subprocess

# # Chrome 옵션 설정
# # 옵션 생성
# options = webdriver.ChromeOptions()
# # 창 숨기는 옵션 추가
# options.add_argument("headless")

def get_transit_time_with_selenium(start_coords, end_coords, input_hour, input_min):
    
    # 기본값 설정
    input_hour = input_hour if input_hour else "0"  # 입력 값이 없으면 "0"으로 설정
    input_min = input_min if input_min else "0"    # 입력 값이 없으면 "0"으로 설정

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service)

    url = f"https://map.naver.com/p/directions/{start_coords}/{end_coords}/-/transit?c=14.00,0,0,0,dh"
    driver.get(url)

    time.sleep(10)  # 페이지 로드 대기

    try:
        
        first_button= WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, '.btn_time_option.btn_option'))
        ).click()

        # '시간' 버튼 선택 및 스크롤
        driver.find_element(By.CSS_SELECTOR, '.timeset_option.timeset_option_hour').click()
        scroll_container = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "layer_timeset"))
        )

        desired_text = f"{input_hour}"
        button_found = False

        for _ in range(10):  # 최대 10번 스크롤
            buttons = scroll_container.find_elements(By.CSS_SELECTOR, 'button[type="button"][role="option"]')
            for button in buttons:
                driver.execute_script("arguments[0].scrollIntoView(true);", button)
                time.sleep(0.2)
                if driver.execute_script("return arguments[0].textContent.trim();", button) == desired_text:
                    driver.execute_script("arguments[0].click();", button)
                    button_found = True
                    break
            if button_found:
                break
            driver.execute_script("arguments[0].scrollTop += 200;", scroll_container)
            time.sleep(2)

        # 오버레이가 사라질 때까지 대기
        WebDriverWait(driver, 20).until(
            EC.invisibility_of_element((By.CLASS_NAME, "sc-tge8yo"))
        )    

        min_button=WebDriverWait(driver,30).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR,'.timeset_option.timeset_option_minute'))
        ).click()
        time.sleep(0.5)

        min_buttons = WebDriverWait(driver, 10).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'button[type="button"][role="option"]'))
        )
        
        for button in min_buttons:
            if button.text.strip() == f"{input_min}":
                button.click()
                break

        # 시간 정보 출력
        time_info = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.base_info.wrap_time_taken'))
        )
        time_text = time_info.text
        print(time_text)
        return time_text  # 최단 시간 반환


    except Exception as e:
        print("오류 발생:", e)

# 메인 로직
if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python3 get_transit_time.py <start_coords> <end_coords> <hour> <minute>")
        sys.exit(1)

    start_coords = sys.argv[1]
    end_coords = sys.argv[2]
    input_hour = sys.argv[3]
    input_min = sys.argv[4]

    get_transit_time_with_selenium(start_coords, end_coords, input_hour, input_min)