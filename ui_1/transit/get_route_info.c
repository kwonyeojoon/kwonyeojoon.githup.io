#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <curl/curl.h>
#include "cJSON.h"
#include "get_route_info.h"

// 메모리 구조체 정의
struct MemoryStruct {
    char *memory;
    size_t size;
};

// curl 콜백 함수 - API 응답 데이터를 메모리에 저장
static size_t WriteMemoryCallback(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t realsize = size * nmemb;
    struct MemoryStruct *mem = (struct MemoryStruct *)userp;

    char *ptr = realloc(mem->memory, mem->size + realsize + 1);
    if (ptr == NULL) {
        printf("메모리 부족\n");
        return 0;
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

// 출발지와 도착지 좌표로부터 최단 소요 시간을 가져오는 함수
void get_duration(const char* start_coords, const char* end_coords) {
    CURL *curl;
    CURLcode res;
    struct MemoryStruct chunk;
    chunk.memory = malloc(1);
    chunk.size = 0;

    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();

    if(curl) {
        char url[512];
        snprintf(url, sizeof(url), "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=%s&goal=%s", start_coords, end_coords);
    
        const char* api_key_id = getenv("NAVER_API_KEY_ID");
        const char* api_key_secret = getenv("NAVER_API_KEY_SECRET");

        if (api_key_id == NULL || api_key_secret == NULL) {
            fprintf(stderr, "API 키를 찾을 수 없습니다. .env 파일을 로드했는지 확인하세요.\n");
            return;
        }

        struct curl_slist *headers = NULL;
        char api_key_id_header[100];
        char api_key_secret_header[100];
        snprintf(api_key_id_header, sizeof(api_key_id_header), "X-NCP-APIGW-API-KEY-ID: %s", api_key_id);
        snprintf(api_key_secret_header, sizeof(api_key_secret_header), "X-NCP-APIGW-API-KEY: %s", api_key_secret);
        headers = curl_slist_append(headers, api_key_id_header);
        headers = curl_slist_append(headers, api_key_secret_header);
   
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);

        res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() 실패: %s\n", curl_easy_strerror(res));
        } else {
            cJSON *json = cJSON_Parse(chunk.memory);
            if (json) {
                cJSON *route = cJSON_GetObjectItem(json, "route");
                if (route) {
                    cJSON *traoptimal = cJSON_GetObjectItem(route, "traoptimal");
                    if (traoptimal && cJSON_GetArraySize(traoptimal) > 0) {
                        cJSON *first_route = cJSON_GetArrayItem(traoptimal, 0);
                        cJSON *summary = cJSON_GetObjectItem(first_route, "summary");
                        if (summary) {
                            const cJSON *duration = cJSON_GetObjectItem(summary, "duration");
                            if (duration) {
                                int duration_seconds = duration->valueint / 1000;
                                int hours = duration_seconds / 3600;
                                int minutes = (duration_seconds % 3600) / 60;

                                if (hours > 0) {
                                    printf("%d시간 %d분\n", hours, minutes);
                                } else {
                                    printf("%d분\n", minutes);
                                }
                            }
                        }
                    }
                }
                cJSON_Delete(json);
            }
        }
        curl_easy_cleanup(curl);
        free(chunk.memory);
    }

    curl_global_cleanup();
}


int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <출발지 좌표> <도착지 좌표>\n", argv[0]);
        return 1;
    }

    const char *start_coords = argv[1];
    const char *end_coords = argv[2];

    // 최단 소요 시간 가져오기
    get_duration(start_coords, end_coords);

    return 0;
}