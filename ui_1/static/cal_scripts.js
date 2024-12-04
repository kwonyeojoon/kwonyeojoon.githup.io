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

function openPopup() {
    const popupBackground = document.createElement('div');
    popupBackground.className = 'popup-background';

    const popupContainer = document.createElement('div');
    popupContainer.className = 'popup-container';

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
            </div>
            <div class="form-row">
                <label for="end-time">종료 시간</label>
                <input type="time" id="end-time">
            </div>
            <div class="form-buttons">
                <button type="button" onclick="addEventToTimelineFromPopup()">추가</button>
                <button type="button" onclick="closePopup()">취소</button>
            </div>
        </form>
    `;

    popupBackground.appendChild(popupContainer);
    document.body.appendChild(popupBackground);
}

function closePopup() {
    const popupBackground = document.querySelector('.popup-background');
    if (popupBackground) {
        document.body.removeChild(popupBackground);
    }
}

function addEventToTimelineFromPopup() {
    const title = document.getElementById('event-title').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;

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
        body: JSON.stringify({ title, selectedDate, startTime, endTime })
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
            timelineRendering(title, startTime, endTime);
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