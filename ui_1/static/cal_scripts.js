document.addEventListener('DOMContentLoaded', () => {
    // 현재 날짜 기준으로 달력, 주간 표시 업데이트
    const today = new Date();
    renderCalendar(today.getFullYear(), today.getMonth());

    //파라미터 값을 받아 선택한 날짜 강조처리
    const urlParams = new URLSearchParams(window.location.search);
    const selectedDate = urlParams.get('date');
    if(selectedDate) selectDate(new Date(selectedDate));
    else selectDate(today);


    let sDate = selectedDate?.today;

    //해당일자 timeline 가져오기
    fetch('/loadTimeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sDate })
    })
    .then(response => response.json())
    .then(data => {
        // 로그인 성공 시 달력 페이지로 리디렉션
        if (data.status === 'success') {
            console.log(data.d);
            // data.d.forEach(e => {
            //     timelineRendering(e.title, e.start_time, e.end_time);    
            // });
            
        } else {
            // 로그인 실패 메시지 출력
            message.style.color = 'red';
            message.textContent = data.message;
        }
    });
});

let currentYear, currentMonth, selectedDate;

function renderCalendar(year, month) { // 날짜에 맞는 달력 생성 함수
    currentYear = year;
    currentMonth = month;

    // 월 표시
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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

function selectDate(date) { // 선택한 날짜 강조
    selectedDate = date;
    document.querySelectorAll('.date-box').forEach(box => box.classList.remove('selected'));

    const day = date.getDate();
    const selectedDateBox = Array.from(document.querySelectorAll('.date-box')).find(box => parseInt(box.innerText) === day);
    if (selectedDateBox) selectedDateBox.classList.add('selected');

    // 선택한 날짜를 쿼리 파라미터로 전달하여 cal.html로 이동
    //const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    //window.location.href = `/cal?date=${formattedDate}`;

    updateWeekDisplay(date)
}

function updateWeekDisplay(date) { // 주간 범위 표시 업데이트
    const weekDisplay = document.getElementById('week-display');
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // 주간 날짜 html에 추가
    let weekDays = [];
    for (let d = startOfWeek; d <= endOfWeek; d.setDate(d.getDate() + 1)) {
        const dayDisplay = d.getDate();
        const isSelected = d.toDateString() === date.toDateString();
        const isDimmed = d.getMonth() !== date.getMonth();

        weekDays.push(`<span class="${isDimmed ? 'dimmed' : ''} ${isSelected ? 'selected' : ''}" onclick="selectDate(new Date(${d.getFullYear()}, ${d.getMonth()}, ${dayDisplay}))">${dayDisplay}</span>`);
    }

    weekDisplay.innerHTML = weekDays.join(' ');
}

function prevMonth() { // 이전 달로 이동
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentYear, currentMonth);
}

function nextMonth() { // 다음 달로 이동
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar(currentYear, currentMonth);
}

function prevWeek() { // 이전 주로 이동
    selectedDate.setDate(selectedDate.getDate() - 7);
    selectDate(selectedDate);
}

function nextWeek() { // 다음 주로 이동
    selectedDate.setDate(selectedDate.getDate() + 7);
    selectDate(selectedDate);
}

// 팝업 창을 띄우는 함수 추가
function openPopup() {

    const popupBackground = document.createElement('div');
    popupBackground.className = 'popup-background';

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
    document.body.appendChild(popupBackground); // 반드시 body에 추가
}

// 팝업 창을 닫는 함수
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

    // 입력값 검증
    if (!title || !startTime || !endTime) {
        alert("모든 필드를 입력해 주세요.");
        return;
    }

    // 서버에 timeline 저장
    console.log(selectedDate);

    fetch('/saveTimeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, selectedDate, startTime, endTime })
    })
    .then(response => response.json())
    .then(data => {
        // 로그인 성공 시 달력 페이지로 리디렉션
        if (data.status === 'success') {
            timelineRendering(title, startTime, endTime);
        } else {
            // 로그인 실패 메시지 출력
            message.style.color = 'red';
            message.textContent = data.message;
        }
    });

    // 팝업 닫기
    closePopup();
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
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                document.getElementById("minimum-time").value = data.time;
            } else {
                alert(data.error);
            }
        })
        .catch((error) => {
            console.error("Error fetching route time:", error);
            alert("서버와 통신 중 오류가 발생했습니다.");
        });
}

function timelineRendering(title, startTime, endTime) {
    // 시간 값을 숫자로 변환
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    
    // 타임라인 높이 계산 변수
    const hourHeight = 50; // 한 시간의 높이
    const minuteHeight = hourHeight / 60; // 1분에 해당하는 높이

    // 타임블럭 시작 및 종료 위치 계산
    const startTopOffset =
        (startHour % 12) * hourHeight + startMinute * minuteHeight + 25;
    const endTopOffset =
        (endHour % 12) * hourHeight + endMinute * minuteHeight + 20;
    const blockHeight = endTopOffset - startTopOffset;

    // 타임블럭이 생성될 타임라인 선택
    const timelineContainer = startHour < 12
        ? document.getElementById('timeline-am') // 오전
        : document.getElementById('timeline-pm'); // 오후

    // 타임라인 높이와의 비교로 유효 범위 확인
    const timelineHeight = timelineContainer.offsetHeight;
    if (startTopOffset > timelineHeight || endTopOffset > timelineHeight) {
        alert("타임블럭의 시간이 타임라인 범위를 초과합니다.");
        return;
    }

    // 블럭 생성
    const timeBlock = document.createElement('div');
    timeBlock.className = 'time-block';
    timeBlock.style.position = 'absolute';
    timeBlock.style.top = `${startTopOffset}px`; // 블럭 시작 위치
    timeBlock.style.height = `${blockHeight}px`; // 블럭 높이
    timeBlock.style.left = '12%'; // 타임라인 내부 위치 조정
    timeBlock.style.width = '85%'; // 타임라인 내부 너비
    timeBlock.style.backgroundColor = '#86a4bf';
    timeBlock.style.color = 'white';
    timeBlock.style.padding = '5px';
    timeBlock.style.borderRadius = '4px';
    timeBlock.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
    timeBlock.style.display = 'flex';
    timeBlock.style.alignItems = 'center';
    timeBlock.style.justifyContent = 'center';
    timeBlock.innerText = `${title}\n(${startTime} - ${endTime})`;

    // 타임블럭 추가
    timelineContainer.appendChild(timeBlock);
}
