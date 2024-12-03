#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "cJSON.h"

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
    if(ptr == NULL) {
        printf("Not enough memory\n");  
        return 0;
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

// 주소를 입력받아 좌표를 가져오는 함수
char* get_coordinates(const char* address) {
    CURL *curl;
    CURLcode res;
    struct MemoryStruct chunk;
    chunk.memory = malloc(1);
    chunk.size = 0;

    curl_global_init(CURL_GLOBAL_DEFAULT);
    curl = curl_easy_init();

    if(curl) {
        char url[256];
        char *encoded_address = curl_easy_escape(curl, address, 0);
        snprintf(url, sizeof(url), "https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=%s", encoded_address);
        curl_free(encoded_address);

        const char* api_key_id = getenv("NAVER_API_KEY_ID");
        const char* api_key_secret = getenv("NAVER_API_KEY_SECRET");

        if (api_key_id == NULL || api_key_secret == NULL) {
            fprintf(stderr, "API 키를 찾을 수 없습니다. .env 파일을 로드했는지 확인하세요.\n");
            return NULL;
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
        if(res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));
        } else {
            cJSON *json = cJSON_Parse(chunk.memory);
            if (json == NULL) {
                printf("Error parsing JSON\n");
                free(chunk.memory);
                return NULL;
            }

            cJSON *addresses = cJSON_GetObjectItem(json, "addresses");
            if (addresses == NULL || cJSON_GetArraySize(addresses) == 0) {
                printf("No addresses found.\n");
                cJSON_Delete(json);
                free(chunk.memory);
                return NULL;
            }

            cJSON *first = cJSON_GetArrayItem(addresses, 0);
            if (first == NULL) {
                printf("No address data found.\n");
                cJSON_Delete(json);
                free(chunk.memory);
                return NULL;
            }

            const char *x = cJSON_GetObjectItem(first, "x")->valuestring;
            const char *y = cJSON_GetObjectItem(first, "y")->valuestring;

            char *coordinates = (char *)malloc(50);
            snprintf(coordinates, 50, "%s,%s", x, y);

            cJSON_Delete(json);
            free(chunk.memory);
            curl_easy_cleanup(curl);
            return coordinates;
        }

        curl_easy_cleanup(curl);
        free(chunk.memory);
    }

    curl_global_cleanup();
    return NULL;
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <출발지 주소> <도착지 주소>\n", argv[0]);
        return 1;
    }

    const char *departure = argv[1];
    const char *destination = argv[2];

    // 출발지 좌표 가져오기
    char *start_coords = get_coordinates(departure);
    if (start_coords) {
        printf("%s\n", start_coords);
        free(start_coords);
    } else {
        fprintf(stderr, "출발지 좌표를 가져오는 데 실패했습니다.\n");
        return 1;
    }

    // 도착지 좌표 가져오기
    char *end_coords = get_coordinates(destination);
    if (end_coords) {
        printf("%s\n", end_coords);
        free(end_coords);
    } else {
        fprintf(stderr, "도착지 좌표를 가져오는 데 실패했습니다.\n");
        return 1;
    }

    return 0;
}