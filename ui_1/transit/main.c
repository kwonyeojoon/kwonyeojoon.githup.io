/* #include <stdio.h>
#include <stdlib.h>
#include "get_coordinates.h"
#include "get_route_info.h"

int main(int argc, char *argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <출발지 주소> <도착지 주소>\n", argv[0]);
        return 1;
    }

    const char *departure = argv[1];
    const char *destination = argv[2];

    char *start_coords = get_coordinates(departure);
    char *end_coords = get_coordinates(destination);

    if (start_coords && end_coords) {
        printf("출발지 좌표: %s\n", start_coords);
        printf("도착지 좌표: %s\n", end_coords);

        get_duration(start_coords, end_coords);

        free(start_coords);
        free(end_coords);
    } else {
        fprintf(stderr, "좌표를 가져오는 데 실패했습니다.\n");
    }

    return 0;
} */