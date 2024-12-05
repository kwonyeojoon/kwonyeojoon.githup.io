#include <stdio.h>
#include <sqlite3.h>
#include <string.h>

// 데이터베이스 연결 및 테이블 생성 함수
sqlite3* get_db_connection() {
    sqlite3 *conn;
    int rc = sqlite3_open("../users.db", &conn);

    if (rc) {
        fprintf(stderr, "Can't open database: %s\n", sqlite3_errmsg(conn));
        return NULL;
    } else {
        char *err_msg = 0;

        // users 테이블 생성
        const char *sql_users = "CREATE TABLE IF NOT EXISTS users ("
                                "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                                "username TEXT UNIQUE NOT NULL,"
                                "password TEXT NOT NULL"
                                ");";

        rc = sqlite3_exec(conn, sql_users, 0, 0, &err_msg);

        if (rc != SQLITE_OK) {
            fprintf(stderr, "SQL error (users table): %s\n", err_msg);
            sqlite3_free(err_msg);
            sqlite3_close(conn);
            return NULL;
        }

        // events 테이블 생성
        const char *sql_events = "CREATE TABLE IF NOT EXISTS events ("
                                 "id INTEGER PRIMARY KEY AUTOINCREMENT,"
                                 "username TEXT NOT NULL,"
                                 "date TEXT NOT NULL,"
                                 "title TEXT NOT NULL,"
                                 "start_time TEXT NOT NULL,"
                                 "end_time TEXT NOT NULL"
                                 ");";

        rc = sqlite3_exec(conn, sql_events, 0, 0, &err_msg);

        if (rc != SQLITE_OK) {
            fprintf(stderr, "SQL error (events table): %s\n", err_msg);
            sqlite3_free(err_msg);
            sqlite3_close(conn);
            return NULL;
        }
    }
    return conn;
}

// 사용자 로그인 함수
int login(const char *username, const char *password) {
    sqlite3 *conn = get_db_connection();
    if (conn == NULL) return 0;

    sqlite3_stmt *stmt;
    const char *sql = "SELECT * FROM users WHERE username = ? AND password = ?";

    int rc = sqlite3_prepare_v2(conn, sql, -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        fprintf(stderr, "Failed to execute statement: %s\n", sqlite3_errmsg(conn));
        sqlite3_close(conn);
        return 0;
    }

    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, password, -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    int success = (rc == SQLITE_ROW); // 로그인 성공 여부

    sqlite3_finalize(stmt);
    sqlite3_close(conn);

    return success;
}

// 사용자 회원가입 함수
int register_user(const char *username, const char *password) {
    sqlite3 *conn = get_db_connection();
    if (conn == NULL) return 0;

    const char *sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    sqlite3_stmt *stmt;

    int rc = sqlite3_prepare_v2(conn, sql, -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        fprintf(stderr, "Failed to execute statement: %s\n", sqlite3_errmsg(conn));
        sqlite3_close(conn);
        return 0;
    }

    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, password, -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        fprintf(stderr, "Failed to insert data: %s\n", sqlite3_errmsg(conn));
        sqlite3_finalize(stmt);
        sqlite3_close(conn);
        return 0; // 중복 아이디 등으로 실패했을 때
    }

    sqlite3_finalize(stmt);
    sqlite3_close(conn);
    return 1; // 회원가입 성공 시
}

// 이벤트 저장 함수
int save_event(const char *username, const char *date, const char *title, const char *start_time, const char *end_time) {
    sqlite3 *conn = get_db_connection();
    if (conn == NULL) return 0;

    const char *sql = "INSERT INTO events (username, date, title, start_time, end_time) VALUES (?, ?, ?, ?, ?)";
    sqlite3_stmt *stmt;
    
    int rc = sqlite3_prepare_v2(conn, sql, -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        fprintf(stderr, "Failed to prepare statement: %s\n", sqlite3_errmsg(conn));
        sqlite3_close(conn);
        return 0;
    }

    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, date, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 3, title, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 4, start_time, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 5, end_time, -1, SQLITE_STATIC);

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        fprintf(stderr, "Failed to insert event: %s\n", sqlite3_errmsg(conn));
        sqlite3_finalize(stmt);
        sqlite3_close(conn);
        return 0;
    }

    sqlite3_finalize(stmt);
    sqlite3_close(conn);
    return 1;
}

// 이벤트 로드 함수
int load_events(const char *username, const char *date) {
    sqlite3 *conn = get_db_connection();
    if (conn == NULL) return 0;

    const char *sql = "SELECT title, start_time, end_time FROM events WHERE username = ? AND date = ?";
    sqlite3_stmt *stmt;

    int rc = sqlite3_prepare_v2(conn, sql, -1, &stmt, 0);
    if (rc != SQLITE_OK) {
        fprintf(stderr, "Failed to prepare statement: %s\n", sqlite3_errmsg(conn));
        sqlite3_close(conn);
        return 0;
    }

    sqlite3_bind_text(stmt, 1, username, -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, date, -1, SQLITE_STATIC);

    // 성공을 표시하기 위해 첫 줄에 success 출력
    printf("success\n");

    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
        const unsigned char *title = sqlite3_column_text(stmt, 0);
        const unsigned char *start_time = sqlite3_column_text(stmt, 1);
        const unsigned char *end_time = sqlite3_column_text(stmt, 2);
        // 각 이벤트를 한 줄로 출력 (필드 구분은 세미콜론으로)
        printf("%s;%s;%s\n", title, start_time, end_time);
    }

    sqlite3_finalize(stmt);
    sqlite3_close(conn);
    return 1;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Invalid command or arguments\n");
        return 1;
    }

    if (strcmp(argv[1], "login") == 0 && argc == 4) {
        const char *username = argv[2];
        const char *password = argv[3];
        if (login(username, password)) {
            printf("success\n");
        } else {
            printf("fail\n");
        }
    } else if (strcmp(argv[1], "register") == 0 && argc == 4) {
        const char *username = argv[2];
        const char *password = argv[3];
        if (register_user(username, password)) {
            printf("success\n");
        } else {
            printf("fail\n");
        }
    } else if (strcmp(argv[1], "save_event") == 0 && argc == 8) {
        const char *username = argv[2];
        const char *date = argv[3];
        const char *title = argv[4];
        const char *start_time = argv[5];
        const char *end_time = argv[6];
        const char *trans_time = argv[7];

        if (save_event(username, date, title, start_time, end_time)) {
            if(strcmp(trans_time,"")!=0 && trans_time != NULL) {
                char transit_title[256];
                snprintf(transit_title, sizeof(transit_title), "%s에 대한 이동시간", title);
                save_event(username, date, transit_title, trans_time, start_time);
            }
            printf("success");
        } else {
            printf("fail");
        }
    } else if (strcmp(argv[1], "load_events") == 0 && argc == 4) {
        const char *username = argv[2];
        const char *date = argv[3];
        if (!load_events(username, date)) {
            printf("fail");
        }
    } else {
        printf("Invalid command or arguments\n");
    }

    return 0;
}
