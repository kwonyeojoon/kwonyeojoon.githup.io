document.addEventListener('DOMContentLoaded', () => {
    // 현재 날짜 기준으로 달력 및 주간 표시 업데이트
    const today = new Date();
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDateParam = urlParams.get('date');
    const initialDate = selectedDateParam ? new Date(selectedDateParam) : today;

    renderCalendar(initialDate.getFullYear(), initialDate.getMonth());
    selectDate(initialDate); // 초기화 시 선택된 날짜 설정 및 이벤트 로드
});

let currentYear, currentMonth, selectedDate;

function renderCalendar(year, month) { // 날짜에 맞는 달력 생성 함수
    currentYear = year;
    currentMonth = month;

    // 월 표시
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    document.getElementById("month-display").innerText = monthNames[month];

    const calendarElement = document.getElementById('calendar');
    calendarElement.innerHTML = '';

    // 달력의 첫 번째 요일과 마지막 날짜 계산
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 첫 주 공백
    for (let i = 0; i < firstDay; i++) {
        const emptyBox = document.createElement('div');
        emptyBox.className = 'date-box empty';
        calendarElement.appendChild(emptyBox);
    }

    // 날짜 박스 생성
    for (let day = 1; day <= lastDate; day++) {
        const dateBox = document.createElement('div');
        dateBox.className = 'date-box';
        dateBox.innerText = day;
        dateBox.onclick = () => selectDate(new Date(year, month, day));
        calendarElement.appendChild(dateBox);
    }
}

function selectDate(date) { // 선택한 날짜 강조 및 이벤트 로드
    selectedDate = date;
    console.log('Selected date:', selectedDate); // 디버깅을 위한 출력

    document.querySelectorAll('.date-box').forEach(box => box.classList.remove('selected'));

    const day = date.getDate();
    const selectedDateBox = Array.from(document.querySelectorAll('.date-box')).find(
        box => parseInt(box.innerText) === day && !box.classList.contains('empty')
    );
    if (selectedDateBox) selectedDateBox.classList.add('selected');

    updateWeekDisplay(date);
    loadTimeline(date);
}

function updateWeekDisplay(date) { // 주간 범위 표시 업데이트
    const weekDisplay = document.getElementById('week-display');
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    let weekDays = [];
    for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
        const dayDisplay = d.getDate();
        const isSelected = d.toDateString() === date.toDateString();
        const isDimmed = d.getMonth() !== date.getMonth();

        weekDays.push(`<span class="${isDimmed ? 'dimmed' : ''} ${isSelected ? 'selected' : ''}"
                        onclick="selectDate(new Date(${d.getFullYear()}, ${d.getMonth()}, ${dayDisplay}))">
                        ${dayDisplay}</span>`);
    }

    weekDisplay.innerHTML = weekDays.join(' ');
}

function loadTimeline(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const formattedDate = `${year}-${month}-${day}`;

    console.log('Loading timeline for date:', formattedDate);

    fetch('/loadTimeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sDate: formattedDate })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Received data:', data); // 디버깅을 위한 로그 추가
        if (data.status === 'success') {
            clearTimeline();
            data.events.forEach(e => {
                timelineRendering(e.title, e.start_time, e.end_time);
            });
        } else {
            console.error(data.message);
        }
    });
}

function clearTimeline() {
    const timelineAm = document.getElementById('timeline-am');
    const timelinePm = document.getElementById('timeline-pm');
    timelineAm.querySelectorAll('.time-block').forEach(block => block.remove());
    timelinePm.querySelectorAll('.time-block').forEach(block => block.remove());
}

// 일정 추가 팝업 창을 띄우는 함수 추가
function openPopup() {
    const popupBackground = document.createElement('div');
    popupBackground.className = 'popup-background schedule-popup';

    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';

    // 팝업 내부 HTML 설정
    popupContainer.innerHTML = `
        <h2>일정 추가</h2>
        <form id="event-form">
            <div class="form-row">
                <label for="event-title">일정 제목</label>
                <input type="text" id="event-title" placeholder="일정 제목 입력">
            </div>
            <div class="form-row">
                <label for="start-time">시작 시간</label>
                <input type="time" id="start-time">
                <input type="hidden" id="hid_start-time" />
            </div>
            <div class="form-row">
                <label for="end-time">종료 시간</label>
                <input type="time" id="end-time">
                <input type="hidden" id="transit_time" />

            </div>
            <div class="form-buttons">
                <button type="button" onclick="addEventToTimelineFromPopup()">추가</button>
                <button type="button" onclick="openTransportPopup()">교통</button>
                <button type="button" onclick="closePopup('schedule-popup')">취소</button> <!-- 특정 팝업만 닫도록 수정 -->
            </div>
        </form>
    `;

    popupBackground.appendChild(popupContainer);
    document.body.appendChild(popupBackground); // 반드시 body에 추가
}

function plusTimeblock() {
    const t_time = document.getElementById('popup-minimum-time').value;
    document.getElementById('transit_time').value = t_time;

    const sTime = document.getElementById('start-time').value;
    let totalMinutes = 0;
    const hourMatch = t_time.match(/(\d+)시간/); // 시간 추출
    const minuteMatch = t_time.match(/(\d+)분/); // 분 추출

    if (hourMatch) {
        totalMinutes += parseInt(hourMatch[1], 10) * 60; // 시간 → 분 변환
    }
    if (minuteMatch) {
        totalMinutes += parseInt(minuteMatch[1], 10); // 분 추가
    }

    // 시작 시간(sTime)을 분 단위로 변환
    const [startHour, startMinute] = sTime.split(":").map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;

    // newTime 계산
    const newTotalMinutes = startTotalMinutes - totalMinutes;
    if (newTotalMinutes < 0) {
        alert("시간 계산 결과가 음수입니다. 입력값을 확인해주세요.");
        return;
    }

    // newTime을 시간:분 형식으로 변환
    const newHour = Math.floor(newTotalMinutes / 60);
    const newMinute = newTotalMinutes % 60;
    const newTimeFormatted = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

    // 결과를 숨겨진 필드에 저장
    document.getElementById('hid_start-time').value = newTimeFormatted;
    console.log(`계산된 출발 시간: ${newTimeFormatted}`);
    closePopup('transport-popup');
}

// 교통 추가 팝업 창을 띄우는 함수
function openTransportPopup() {
    const transportPopupBackground = document.createElement('div');
    transportPopupBackground.className = 'popup-background transport-popup';

    const transportPopupContainer = document.createElement('div');
    transportPopupContainer.className = 'popup-container';

    // 팝업 내부 내용
    transportPopupContainer.innerHTML = `
                    <!-- 출발지 입력 -->
                    <div class="input-row2">
                        <label for="popup-departure">출발지</label>
                        <input type="text" id="popup-departure" placeholder="출발지 입력" value="경기도 부천시 원미구 상이로46" />
                    </div>
                    <!-- 도착지 입력 -->
                    <div class="input-row2">
                        <label for="popup-destination">도착지</label>
                        <input type="text" id="popup-destination" placeholder="도착지 입력" value="서울특별시 동작구 상도로369" />
                    </div>
                    <!-- 출발 시간 입력 -->
                    <div class="input-row2">
                        <label for="popup-departure-time">출발 시간</label>
                        <input type="time" id="popup-departure-time" step="600">

                    </div>

                    <!-- 대중교통/자가용 선택 -->
                    <div class="transport-options2">
                        <label><input type="checkbox" id="popup-public-transport"> 대중교통</label>
                        <label><input type="checkbox" id="popup-private-vehicle"> 자가용</label>
                        <!-- 검색 버튼 -->
                        <button type="button" class="search-button" onclick="searchRouteFromPopup()">검색</button>
                        <!-- 타임라인에 추가 버튼 -->
                        <button type="button" class="plus-button" onclick="plusTimeblock(); return false;">추가</button>
                    </div>
                </form>
                <!-- 최단 시간 결과 -->
                <div id="shortest-time2">
                    <button id="close-transport-button" type="button" onclick="closePopup('transport-popup')">닫기</button>
                    <label>최단 시간</label>
                    <input type="text" id="popup-minimum-time" readonly placeholder="결과가 여기에 표시됩니다">
                </div>
    `;

    transportPopupBackground.appendChild(transportPopupContainer);
    document.body.appendChild(transportPopupBackground);
}

function searchRouteFromPopup() {
    const departure = document.getElementById("popup-departure").value.trim();
    const destination = document.getElementById("popup-destination").value.trim();
    const departureTime = document.getElementById("popup-departure-time").value;
    const isPublicTransport = document.getElementById("popup-public-transport").checked;
    const transportMode = isPublicTransport ? "public" : "private";

    if (!departure || !destination || !departureTime) {
        alert("출발지, 도착지, 출발 시간을 모두 입력해주세요.");
        return;
    }

    const [hour, minute] = departureTime.split(":");

    fetch("/get-route-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            departure,
            destination,
            hour,
            minute,
            transport_mode: transportMode,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                document.getElementById("popup-minimum-time").value = data.time;
            } else {
                alert(data.error);
            }
        })
        .catch((error) => {
            console.error("Error fetching route time:", error);
            alert("서버와 통신 중 오류가 발생했습니다.");
        });
}

// 팝업 창을 닫는 함수
function closePopup(popupClass) {
    const popupBackground = document.querySelector(`.${popupClass}`);
    if (popupBackground) {
        document.body.removeChild(popupBackground);
    }
}

function addEventToTimelineFromPopup() {
    const title = document.getElementById('event-title').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const transTime = document.getElementById('hid_start-time').value;


    console.log(title, startTime, endTime, transTime);

    if (!title || !startTime || !endTime) {
        alert("모든 필드를 입력해 주세요.");
        return;
    }

    const year = selectedDate.getFullYear();
    const month = ('0' + (selectedDate.getMonth() + 1)).slice(-2);
    const day = ('0' + selectedDate.getDate()).slice(-2);
    const formattedDate = `${year}-${month}-${day}`;

    fetch('/saveTimeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // 쿠키를 포함하여 요청
        body: JSON.stringify({
            title,
            date: formattedDate, // 수정된 부분
            startTime,
            endTime,
            transTime //계산된 출발시간
        })
    })
    .then(response => {
        if (response.status === 401) {
            alert('로그인이 필요합니다.');
            window.location.href = '/login';
            return;
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // 이벤트 저장 후 타임라인을 다시 로드
            loadTimeline(selectedDate);
            // 팝업 닫기
            closePopup('schedule-popup');
        } else {
            alert(data.message);
        }
    });
}   

function searchRoute() {
    const departure = document.getElementById("departure").value.trim();
    const destination = document.getElementById("destination").value.trim();
    const departureTime = document.getElementById("departure-time").value;
    const isPublicTransport = document.getElementById("public-transport").checked;
    const transportMode = isPublicTransport ? "public" : "private";

    if (!departure || !destination || !departureTime) {
        alert("출발지, 도착지, 출발 시간을 모두 입력해주세요.");
        return;
    }

    const [hour, minute] = departureTime.split(":");

    fetch("/get-route-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            departure,
            destination,
            hour,
            minute,
            transport_mode: transportMode,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById("minimum-time").value = data.time;
        } else {
            alert(data.error);
        }
    })
    .catch(error => {
        console.error("Error fetching route time:", error);
        alert("서버와 통신 중 오류가 발생했습니다.");
    });
}

function timelineRendering(title, startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const hourHeight = 50;
    const minuteHeight = hourHeight / 60;

    let timelineContainer;
    let startHourInTimeline;
    let endHourInTimeline;

    if (startHour < 12) {
        timelineContainer = document.getElementById('timeline-am');
        startHourInTimeline = startHour;
    } else {
        timelineContainer = document.getElementById('timeline-pm');
        startHourInTimeline = startHour - 12;
    }

    if (endHour < 12) {
        endHourInTimeline = endHour;
    } else {
        endHourInTimeline = endHour - 12;
    }

    const startTopOffset =
        startHourInTimeline * hourHeight + startMinute * minuteHeight;
    const endTopOffset =
        endHourInTimeline * hourHeight + endMinute * minuteHeight;
    const blockHeight = endTopOffset - startTopOffset;

    const timeBlock = document.createElement('div');
    timeBlock.className = 'time-block';
    timeBlock.style.position = 'absolute';
    timeBlock.style.top = `${startTopOffset}px`;
    timeBlock.style.height = `${blockHeight}px`;
    timeBlock.style.left = '12%';
    timeBlock.style.width = '85%';
    timeBlock.style.backgroundColor = '#86a4bf';
    timeBlock.style.color = 'white';
    timeBlock.style.padding = '5px';
    timeBlock.style.borderRadius = '4px';
    timeBlock.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    timeBlock.style.display = 'flex';
    timeBlock.style.alignItems = 'center';
    timeBlock.style.justifyContent = 'center';
    timeBlock.style.flexDirection = 'column';
    timeBlock.innerText = `${title}\n(${startTime} - ${endTime})`;

    timelineContainer.appendChild(timeBlock);
}