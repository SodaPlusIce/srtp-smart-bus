// 开启子线程，车辆平滑
AMap.plugin('AMap.MoveAnimation', function () {
    carMarker.moveTo(stopPoint[1], {
        duration: 1000,
        delay: 500,
    });
});