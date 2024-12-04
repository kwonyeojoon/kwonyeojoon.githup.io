
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const message = document.createElement('p');
    loginForm.appendChild(message);

    // 로그인 폼 제출 시 이벤트 처리
    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();

        // 입력된 사용자명과 비밀번호를 가져옴
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // 서버에 로그인 요청
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            // 로그인 성공 시 달력 페이지로 리디렉션
            if (data.status === 'success') {
                window.location.href = data.redirect;
            } else {
                // 로그인 실패 메시지 출력
                message.style.color = 'red';
                message.textContent = data.message;
            }
        });
    });
});

// 회원가입 팝업 열기 함수
function openSignup() {
    document.getElementById('signupPopup').style.display = 'flex';
}

// 회원가입 팝업 닫기 함수
function closeSignup() {
    document.getElementById('signupPopup').style.display = 'none';
}




// 위의 코드는 조원이 보내준 코드이고, 제가 추가한 부분은 여기부터입니다.
// 회원가입 처리 함수
function submitSignup() {
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    // 서버에 회원가입 요청
    fetch('/register', {
        method: 'POST', // POST 메서드로 서버에 데이터 전송
        headers: { 'Content-Type': 'application/json' }, // JSON 형식으로 데이터 전송
        body: JSON.stringify({ username, password }) // 사용자명과 비밀번호를 JSON 형식으로 변환하여 요청 본문에 포함
    })
    .then(response => response.json()) // 서버 응답을 JSON으로 변환
    .then(data => {
        alert(data.message); // 서버에서 전달된 메시지를 사용자에게 알림
        // 회원가입 성공 시 팝업 닫기
        if (data.status === 'success') {
            closeSignup(); // 회원가입 팝업을 닫음
        }
    });
}
