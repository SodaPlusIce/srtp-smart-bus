$(function () {
	//页面淡入效果
	$(".animsition").animsition({
		inClass: 'fade-in',
		outClass: 'fade-out',
		inDuration: 300,
		outDuration: 1000,
		// e.g. linkElement   :   'a:not([target="_blank"]):not([href^=#])'
		loading: false,
		loadingParentElement: 'body', //animsition wrapper element
		loadingClass: 'animsition-loading',
		unSupportCss: ['animation-duration',
			'-webkit-animation-duration',
			'-o-animation-duration'
		],
		//"unSupportCss" option allows you to disable the "animsition" in case the css property in the array is not supported by your browser.
		//The default setting is to disable the "animsition" in a browser that does not support "animation-duration".

		overlay: false,

		overlayClass: 'animsition-overlay-slide',
		overlayParentElement: 'body'
	});

	document.onreadystatechange = subSomething;
	function subSomething() {
		if (document.readyState == "complete") {
			$('#loader').hide();
		}
	}

	//顶部时间
	function getTime() {
		var myDate = new Date();
		var myYear = myDate.getFullYear(); //获取完整的年份(4位,1970-????)
		var myMonth = myDate.getMonth() + 1; //获取当前月份(0-11,0代表1月)
		var myToday = myDate.getDate(); //获取当前日(1-31)
		var myDay = myDate.getDay(); //获取当前星期X(0-6,0代表星期天)
		var myHour = myDate.getHours(); //获取当前小时数(0-23)
		var myMinute = myDate.getMinutes(); //获取当前分钟数(0-59)
		var mySecond = myDate.getSeconds(); //获取当前秒数(0-59)
		var week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
		var nowTime;

		nowTime = myYear + '-' + fillZero(myMonth) + '-' + fillZero(myToday) + '&nbsp;&nbsp;' + week[myDay] + '&nbsp;&nbsp;' + fillZero(myHour) + ':' + fillZero(myMinute) + ':' + fillZero(mySecond);
		$('.topTime').html(nowTime);
	};
	function fillZero(str) {
		var realNum;
		if (str < 10) {
			realNum = '0' + str;
		} else {
			realNum = str;
		}
		return realNum;
	}
	setInterval(getTime, 1000);

	function totalNum(obj, speed) {
		var singalNum = 0;
		var timer;
		var totalNum = obj.attr('total');

		if (totalNum) {
			timer = setInterval(function () {
				singalNum += speed;
				if (singalNum >= totalNum) {
					singalNum = totalNum;
					clearInterval(timer);
				}
				obj.html(singalNum);
			}, 1);
		}
	}

	//--------------------------高德地图--------------------------------
	AMapLoader.load({
		"key": "1efbbfb20e6ada2251a3d62dd65f7bc0",              // 申请好的Web端开发者Key，首次调用 load 时必填
		"version": "2.0",   // 指定要加载的 JSAPI 的版本，缺省时默认为 1.4.15
		"plugins": ["AMap.Driving", "AMap.LngLat", "AMap.Pixel", "AMap.Polyline", "AMap.Circle"],           // 需要使用的的插件列表，如比例尺'AMap.Scale'等
		"AMapUI": {             // 是否加载 AMapUI，缺省不加载
			"version": '1.1',   // AMapUI 版本
			"plugins": ['overlay/SimpleMarker'],       // 需要加载的 AMapUI ui插件
		},
		"Loca": {                // 是否加载 Loca， 缺省不加载
			"version": '2.0'  // Loca 版本
		},
	}).then((AMap) => {
		// 建立和后台的socketio连接
		var socket = io.connect("127.0.0.1:5000");
		// 地图初始化
		var myMap = new AMap.Map('myMap', {
			resizeEnable: true,
			zoom: 13,
			// mapStyle: 'amap://styles/darkblue',
			center: [120.265966, 30.721857],
		});
		var stopLngLat = [
			[120.265966, 30.721857], //0
			[120.247437, 30.724458], //1
			[120.268674, 30.731679], //2
			[120.289797, 30.725002], //3
			[120.276203, 30.705706], //4
			[120.262589, 30.703787], //5
			[120.252128, 30.707662], //6
			[120.25047, 30.697339],//7
		]
		var stopName = [
			"换乘中心", //0
			"镇西村", //1
			"石淙村", //2
			"姚家坝村", //3
			"银子桥村", //4
			"羊河坝村", //5
			"花园湾村", //6
			"南坝村", //7
		]
		// 5辆车的Marker初始化
		var carMarker = [];
		for (var i = 0; i < 5; i++) {
			carMarker[i] = new AMap.Marker({
				// map: myMap, // 五辆车的marker先不加入地图，根据预约单的派车数量动态加入
				position: stopLngLat[0],
				icon: 'images/bus' + (i + 1) * 11 + '.png',
				offset: new AMap.Pixel(-14, -16.5)
			})
		}
		// 8个站点的marker初始化
		var stopMarker = [];
		var carAtStopInfo = ["", "", "", "", "", "", "", ""];// 车到站弹出的信息
		// 遍历所有站点，设置marker及对应content
		for (var i = 0; i < 8; i++) {
			stopMarker[i] = new AMap.Marker({
				position: stopLngLat[i],
				map: myMap,
				label: {
					direction: "top",
					content: stopName[i]
				},
			});
			stopMarker[i].content = carAtStopInfo[i];
		}
		// 各站点闪烁圆圈的初始化
		var stopCircle = [];
		for (var i = 0; i < 8; i++) {
			stopCircle[i] = new AMap.Circle({
				center: new AMap.LngLat(stopLngLat[i][0] + '', stopLngLat[i][1] + ''),
				radius: 200, //半径
				strokeColor: "#F33", //线颜色
				strokeOpacity: 1, //线透明度
				strokeWeight: 3, //线粗细度
				fillColor: "#ee2200", //填充颜色
				fillOpacity: 0.35, //填充透明度
			})
		}
		var seqs = [];//存放从后端拉来的数据  预约单每辆车的路线
		var stops;//存放从后端拉来的数据  预约单每个站点的人数
		var lineArr = [];//存放路径,lineArr[0]代表第一辆车的路径集合
		var ifHandle = true;// ifHandle表示是否处理了响应
		// 互斥锁机制，避免重新规划线路后要等待下车却没有的问题（开启了新线程，之前的动画并没有取消，所以会执行两次，导致setTimeout不起作用）
		var waiting = [false, false, false, false, false];
		// 设置信息窗体样式（车辆到站后显示的内容）
		// var infoWindow = [];
		// for (var i = 0; i < 8; i++) {
		// 	infoWindow[i] = new AMap.InfoWindow({
		// 		offset: new AMap.Pixel(16, -36)
		// 	});
		// }
		// ----------------上面是数据，下面是函数---------------分隔符-----------------
		function deepClone(initalObj, finalObj) {
			var obj = finalObj || {};
			for (var i in initalObj) {
				var prop = initalObj[i]; // 避免相互引用对象导致死循环，如initalObj.a = initalObj的情况
				if (prop === obj) {
					continue;
				}
				if (typeof prop === "object") {
					obj[i] = prop.constructor === Array ? [] : Object.create(prop);
				} else {
					obj[i] = prop;
				}
			}
			return obj;
		}
		// 站点的闪烁
		function startGlitter(index) {
			myMap.add(stopCircle[index]);
			var cnt = 0;
			var clock = setInterval(function () {
				stopCircle[index].setOptions({
					fillOpacity:
						stopCircle[index].getOptions().fillOpacity == 0.45 ? 0 : 0.45,
				});
				cnt += 1;
				if (cnt == 14) {
					clearInterval(clock);
					myMap.remove(stopCircle[index]);
				}
			}, 500);
		}
		// 涉及计算路径的部分    start,end是id，middle是id的数组，lineArr_index代表第几辆车
		function calLineArr(start, end, middle, lineArr_index) {
			start = stopLngLat[start]; //id转[lng,lat]
			end = stopLngLat[end]; //id转[lng,lat]
			lineArr[lineArr_index] = [start];
			var driving = new AMap.Driving({
				map: myMap,//不显示规划路径
				showTraffic: false,
			});
			var middlePoints = [];
			for (var i = 0; i < middle.length; i++) {
				middle[i] = stopLngLat[middle[i]]; //id转[lng,lat]
				middlePoints[i] = new AMap.LngLat(middle[i][0], middle[i][1]);
			}
			// 根据起终点经纬度规划驾车导航路线
			driving.search(
				new AMap.LngLat(start[0], start[1]),
				new AMap.LngLat(end[0], end[1]),
				{
					waypoints: middlePoints,
				},
				function (status, result) {
					// result 即是对应的驾车导航信息，相关数据结构文档请参考
					// https://lbs.amap.com/api/javascript-api/reference/route-search#m_DrivingResult
					if (status === "complete") {
						var len = result.routes[0].steps.length;
						var count = 1;
						for (var i = 0; i < len; i++) {
							for (var j = 0; j < result.routes[0].steps[i].path.length; j++) {
								// lineArr[lineArr_index][count++] = [
								// 	result.routes[0].steps[i].path[j].lng,
								// 	result.routes[0].steps[i].path[j].lat,
								// ];
								lineArr[lineArr_index].push([
									result.routes[0].steps[i].path[j].lng,
									result.routes[0].steps[i].path[j].lat,
								]);
							}
						}
						lineArr[lineArr_index].push(end);
					} else {
						console.log("获取数据失败");
					}
				}
			);
		}
		// 点击车辆marker后显示infowindow内容（实际是车辆到站后弹出）
		// function markerClick(e, index) {
		// 	infoWindow[index].setContent(carAtStopInfo[index]);
		// 	infoWindow[index].open(myMap, e.target.getPosition());
		// }
		// 涉及动画的部分   start,end是id，middle是id的数组，lineArr_index代表第几辆车，seqs表示路径（用于和新路径比较）
		function navigate(start, end, middle, lineArr_index, seqs) {
			if (middle.length == 0) {// [0,7]这种情况
				// 显示下一站，即end
				$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(2).text(stopName[end]);
				// 显示下下站，即end
				$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(3).text(stopName[end]);
			} else if (middle.length == 1) {//[0,6,7]这种情况
				// 显示下一站，即middle[0]
				$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(2).text(stopName[middle[0]]);
				// 显示下下站，即end
				$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(3).text(stopName[end]);
			} else {
				// 显示下一站，即middle[0]
				$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(2).text(stopName[middle[0]]);
				// 显示下下站，即middle[1]
				$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(3).text(stopName[middle[1]]);
			}

			AMap.plugin('AMap.MoveAnimation', function () {
				setTimeout(() => {//解决异步同步问题
					carMarker[lineArr_index].moveAlong(lineArr[lineArr_index], {
						speed: 1200
					});
					//备份middle和end数据
					var midIds = deepClone(middle, midIds);
					var endId = end;
					for (var i = 0; i < middle.length; i++) {
						//id转[lng,lat]
						middle[i] = stopLngLat[middle[i]];
					}
					end = stopLngLat[end];
					var count1 = 0// 解决在某个站点一直徘徊的问题
					var isPassedLast = false;// 是否已经走过了除了0的最后一站，避免刚开始就判断到车到终点的bug
					var count2 = 0;// 解决socket持续发送的问题
					carMarker[lineArr_index].on("moving", function (e) {
						count2++;
						// 通过socketio给后台公交车的数据
						if (count2 % 20 == 0) {
							socket.emit('bus_pos', { bus_index: lineArr_index, pos: e.pos });
						}
						var i;
						for (i = 0; i < middle.length; i++) {
							if (
								e.pos.lng <= middle[i][0] + 0.0005 &&
								e.pos.lng >= middle[i][0] - 0.0005 &&
								e.pos.lat <= middle[i][1] + 0.0005 &&
								e.pos.lat >= middle[i][1] - 0.0005 &&
								count1 == i
							) {
								count1++;
								carMarker[lineArr_index].pauseMove();
								// 车到站，更新下一站显示
								if (i != middle.length - 1) {
									$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(2).text(stopName[midIds[i + 1]]);
								} else {
									isPassedLast = true;
									$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(2).text(stopName[endId]);
								}
								// 车到站，更新下下站显示
								if (i < middle.length - 2) {//到了middle的倒数第二站及之前
									$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(3).text(stopName[midIds[i + 2]]);
								} else {
									$('#busPassengersNum ul li:eq(' + (1 + lineArr_index) + ') span').eq(3).text(stopName[endId]);
								}
								// 车到站，向服务器发送数据，得到 上下车人数 和 该辆车的新路径->做几件事 
								// 1)判断是否发生修改，没有就不用管，有的话就重新navigate
								// 2)更新左中车辆下一站的显示和最下方的路线显示
								var sumNum = 0;
								var on_num = 0;
								var off_num = 0;
								$.ajax({
									url: "http://127.0.0.1:5000/carAtStop",
									async: false,
									data: {
										car_id: lineArr_index,
										stop_id: midIds[i]
									},
									dataType: "JSON",
									success: function (res) {
										sumNum = parseInt(res[0]);
										on_num = parseInt(res[2]);
										off_num = parseInt(res[3]);
										// 该辆车的路径发生了改变
										newPath = JSON.parse(res[1]);
										if (newPath.toString() !== seqs.toString() && !ifHandle) {
											console.log("S" + (lineArr_index + 1) + "车进入路径变化函数执行范围！");
											handleResponse(sumNum, newPath, lineArr_index);
										}
									}
								});
								if (!waiting[lineArr_index]) {
									waiting[lineArr_index] = true;
									// 车到站，弹出上下车信息
									$.growl.notice({
										title: "S" + (lineArr_index + 1) + "车到达 " + stopName[midIds[i]] + " 站",
										message: "上车" + on_num + "人，下车" + off_num + "人，上下车中......"
									});
									console.log("S" + (lineArr_index + 1) + "车，上下乘客共" + sumNum + "人，上下车中......");
									setTimeout(function () {
										carMarker[lineArr_index].resumeMove();
										waiting[lineArr_index] = false;
									}, 1000 * sumNum);//每个人按1s计算
								}
							}
						}
						// 车到终点
						if (
							isPassedLast == true &&
							e.pos.lng <= end[0] + 0.0005 &&
							e.pos.lng >= end[0] - 0.0005 &&
							e.pos.lat <= end[1] + 0.0005 &&
							e.pos.lat >= end[1] - 0.0005
						) {
							var sumNum = 0;
							var on_num = 0;
							var off_num = 0;
							//终止动画
							carMarker[lineArr_index].stopMove();
							//通知后端
							$.ajax({
								url: "http://127.0.0.1:5000/carAtStop",
								async: false,
								data: {
									car_id: lineArr_index,
									stop_id: endId
								},
								dataType: "JSON",
								success: function (res) {
									sumNum = parseInt(res[0]);
									on_num = parseInt(res[2]);
									off_num = parseInt(res[3]);
									// 该辆车的路径发生了改变
									newPath = JSON.parse(res[1]);
									if (newPath.toString() !== seqs.toString() && !ifHandle) {
										handleResponse(sumNum, newPath, lineArr_index);
									}
								}
							});
							$.growl.notice({
								title: "S" + (lineArr_index + 1) + "车到达 " + stopName[endId] + " 站",
								message: "上车" + on_num + "人，下车" + off_num + "人，上下车中......"
							});
							console.log("S" + (lineArr_index + 1) + "车，上下乘客共" + sumNum + "人，上下车中......");
						}
					});
				}, 1000);
			});

		}
		// 让第index(从0开始)辆车跑起来,路线是seqs
		function startDriving(index, seqss) {
			// 先把Marker加入地图
			myMap.add(carMarker[index]);
			// 计算路径并开始动画
			calLineArr(seqss[0], seqss[seqss.length - 1], seqss.slice(1, seqss.length - 1), index);
			navigate(seqss[0], seqss[seqss.length - 1], seqss.slice(1, seqss.length - 1), index, seqss);
		}
		// 处理新增的响应
		function handleResponse(sumNum, newPath, lineArr_index) {
			ifHandle = true;
			// 车辆暂停动画
			carMarker[lineArr_index].stopMove();
			// 重新动画前完成上下车的等待时间
			setTimeout(function () {
				// 做出路线改变的提醒
				$.growl.warning({
					title: "路线变更提醒",
					message: "新增响应，S" + (lineArr_index + 1) + "号车路线已发生改变!"
				});
				// 重新navigate...
				calLineArr(newPath[0], newPath[newPath.length - 1], newPath.slice(1, newPath.length - 1), lineArr_index);
				navigate(newPath[0], newPath[newPath.length - 1], newPath.slice(1, newPath.length - 1), lineArr_index, newPath);
			}, 1000 * sumNum);
		}
		//尝试5辆车一起跑，just run it!
		function test5cars() {
			$.ajax({
				url: "http://127.0.0.1:5000/getSeqs", async: false, success: function (res) {
					seqs = res.seqs;
					stops = res.passenger_num;
				}
			});
			// 判断需要发动几辆车，计算路线并启动动画
			var car_num = seqs.length;
			for (var i = 0; i < car_num; i++) {
				startDriving(i, seqs[i]);
			}
			// 更新右上在驶车辆数
			$('.infoPie ul #indicator1').text(car_num);
		}
		test5cars();
		// 实现不同html页面通信：监听localstorage变化，增加响应触发站点闪烁
		window.addEventListener('storage', function (e) {
			if (e.key === 'addOrder') {
				if (e.newValue) {// 增加响应订单，逻辑处理
					// 站点的闪烁
					startGlitter(e.newValue);
					// 新增响应，计算一下目前各个车上的人数，jquery获取
					var onBusPass_nums = [];
					var cnt = 0;
					$('#busPassengersNum ul li span strong').each(function () {
						onBusPass_nums[cnt] = ($(this).text());
						cnt += 1;
					})
					var nextStopIds = [];
					cnt = 0;
					$('#busPassengersNum ul li:nth-child(n+2)').each(function () {
						nextStopIds[cnt] = stopName.findIndex((name) => {
							return name == $(this).children('span:nth-child(3)').text()
						})
						cnt += 1;
					})
					nextStopIds = nextStopIds.filter((id) => {
						return id != -1;
					})
					$.ajax({
						url: "http://127.0.0.1:5000/addOrder",
						data: {
							stop_on: localStorage.getItem('stop_on'),
							stop_off: localStorage.getItem('stop_off'),
							passengers: localStorage.getItem('passengers'),
							onBusPass_num: onBusPass_nums.toString(),
							nextStopIds: nextStopIds.toString()
						},
						dataType: "JSON",
						async: false,
						success: function (res) {
							var nowDrivingCarNum = $('.infoPie ul #indicator1').text();
							if (res[0] + 1 > nowDrivingCarNum) {//新派一辆车
								// 做出路线改变的提醒
								$.growl.warning({
									title: "新派车辆提醒",
									message: "新增响应，S" + (res[0] + 1) + "号车已派出运营!"
								});
								startDriving(res[0], res[1]);
								$('.infoPie ul #indicator1').text(res[0] + 1);
								ifHandle = true;
							}
							ifHandle = false;
							// 拿到后端返回的res，通过对比res[0]和现在行驶的车辆数，判断是否是新派一辆车的情况
							// 如果是，就startDriving(res[0],res[1])
							// 不是就不用管，行驶中的车辆carAtStop后会判断与库里的路线一直不一致，不一致就又重新跑了
						}
					});
				}
			}
		});
	}).catch((e) => {
		console.error(e);  //加载错误提示
	});
	//--------------------------------------------GaodeMap End------------------------------------------------
	//月运单量统计图
	// var myChart1 = echarts.init(document.getElementById('myChart1'));
	// var option1 = {

	// 	tooltip: {
	// 		trigger: 'item',
	// 		formatter: function (params) {
	// 			var res = '本月' + params.name + '号运单数：' + params.data;
	// 			return res;
	// 		}
	// 	},
	// 	grid: {
	// 		top: '5%',
	// 		left: '0%',
	// 		width: '100%',
	// 		height: '95%',
	// 		containLabel: true
	// 	},
	// 	xAxis: {
	// 		data: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'],
	// 		axisLabel: {
	// 			show: true,
	// 			textStyle: {
	// 				fontSize: '12px',
	// 				color: '#fff',
	// 			}
	// 		},
	// 		axisLine: {
	// 			lineStyle: {
	// 				color: '#fff',
	// 				width: 1,
	// 			}
	// 		}
	// 	},

	// 	yAxis: {
	// 		axisLabel: {
	// 			show: true,
	// 			textStyle: {
	// 				fontSize: '12px',
	// 				color: '#fff',
	// 			}
	// 		},
	// 		axisLine: {
	// 			lineStyle: {
	// 				color: '#fff',
	// 				width: 1,
	// 			}
	// 		},
	// 		splitLine: {
	// 			show: false,
	// 		}
	// 	},

	// 	series: {
	// 		name: '',
	// 		type: 'bar',
	// 		barWidth: 10,
	// 		data: ['5', '14', '3', '6', '8', '18', '11', '4', '8', '7', '16', '13', '6', '10', '11', '9', '19', '13', '4', '20', '12', '7', '13', '15', '8', '3', '9', '16', '11', '16', '8'],
	// 		itemStyle: {
	// 			normal: {
	// 				barBorderRadius: [5, 5, 5, 5],
	// 				color: new echarts.graphic.LinearGradient(
	// 					0, 0, 0, 1,
	// 					[
	// 						{ offset: 0, color: '#3876cd' },
	// 						{ offset: 0.5, color: '#45b4e7' },
	// 						{ offset: 1, color: '#54ffff' }
	// 					]
	// 				),
	// 			},
	// 		},
	// 	},
	// }

	// 订单状态数据源问题    每5秒请求一次数据库订单数据，更新面板上的数据信息
	setInterval(function () {
		var arr = [];
		$.ajax({
			url: "http://127.0.0.1:5000/getOrderInfo",
			async: false,
			dataType: "json",
			success: function (res) {
				arr = res;
			}
		});
		$("#FontScroll ul").empty();
		// console.log(arr);
		// console.log(arr[0][4] == 0 ? "(等待中)" : "(已上车)");
		var temp = "";
		for (var i = 0; i < arr.length; i++) {
			temp = arr[i][8] + (arr[i][6] == 0 ? "(等待中)" : "(已上车)")
			var addHtml = "<li><div class='fontInner clearfix'>"
			addHtml += "<span>" + arr[i][0] + "</span>"
			addHtml += "<span>" + arr[i][3] + "</span>"
			addHtml += "<span>" + arr[i][4] + "</span>"
			addHtml += "<span>" + temp + "</span>"
			addHtml += "</div></li>"
			$('#FontScroll ul').append(addHtml)
		}
		// 同时修改 右中当前订单数
		$('.infoPie ul #indicator3').text(arr.length);
		// 同时修改 左下站点的等待人数 和 左中车上人数
		$.ajax({
			url: "http://127.0.0.1:5000/getStopWaitingNum",
			async: false,
			dataType: "json",
			success: function (res) {
				// console.log(res);
				var cnt = 0;
				$('#stopWaitingNum ul li span strong').each(function () {
					$(this).text(res[0][cnt]);
					cnt++;
				})
				cnt = 0;
				$('#busPassengersNum ul li span strong').each(function () {
					$(this).text(res[1][cnt]);
					cnt++;
				})
			}
		});
		// 同时修改左上历史订单数
		var reserved_num = 0;
		var response_num = 0;
		var todayCompletedOrderNum = 0;
		$.ajax({
			url: "http://127.0.0.1:5000/getHistoryOrder",
			async: false,
			dataType: "json",
			success: function (res) {
				reserved_num = res[0];
				response_num = res[1];
				todayCompletedOrderNum = res[2];
			}
		});
		var reserved_percent = Math.round(reserved_num / (reserved_num + response_num) * 100) + "%";
		var response_percent = Math.round(response_num / (reserved_num + response_num) * 100) + "%";
		$('#totalOrderNum h4').eq(0).text(reserved_percent);
		$('#totalOrderNum h4').eq(1).text(response_percent);
		$('#totalOrderNum .progress').find('.progressBar span').eq(0)
			.animate({ width: reserved_percent }, parseInt(reserved_percent) * 50);
		$('#totalOrderNum .progress').find('.progressBar span').eq(1)
			.animate({ width: response_percent }, parseInt(response_percent) * 50);
		$('#totalOrderNum i').eq(0).text(reserved_num + "单");
		$('#totalOrderNum i').eq(1).text(response_num + "单");
		// 修改右上总订单数
		$('#totalNum').text(reserved_num + response_num);
		// 修改右中当前已完成订单数
		$('.infoPie ul #indicator2').text(todayCompletedOrderNum);
	}, 5000);

	// 订单状态文字滚动
	$('#FontScroll').FontScroll({ time: 3000, num: 1 });

	setTimeout(function () {
		$('.progress').each(function (i, ele) {
			var PG = $(ele).attr('progress');
			var PGNum = parseInt(PG);
			var zero = 0;
			var speed = 50;
			var timer;
			$(ele).find('h4').html(zero + '%');
			if (PGNum < 10) {
				$(ele).find('.progressBar span').addClass('bg-red');
				$(ele).find('h3 i').addClass('color-red');
			} else if (PGNum >= 10 && PGNum < 50) {
				$(ele).find('.progressBar span').addClass('bg-yellow');
				$(ele).find('h3 i').addClass('color-yellow');
			} else if (PGNum >= 50 && PGNum < 100) {
				$(ele).find('.progressBar span').addClass('bg-blue');
				$(ele).find('h3 i').addClass('color-blue');
			} else {
				$(ele).find('.progressBar span').addClass('bg-green');
				$(ele).find('h3 i').addClass('color-green');
			}
			$(ele).find('.progressBar span').animate({ width: PG }, PGNum * speed);
			timer = setInterval(function () {
				zero++;
				$(ele).find('h4').html(zero + '%');
				if (zero == PGNum) {
					clearInterval(timer);
				}
			}, speed);
		});



		//基本信息
		totalNum($('#indicator1'), 1);
		totalNum($('#indicator2'), 1);
		totalNum($('#indicator3'), 1);

		//总计运单数
		totalNum($('#totalNum'), 100);

		// myChart1.setOption(option1);

	}, 500);


	var summaryPie1, summaryPie2, summaryPie3, summaryBar, summaryLine;
	var pieData;
	function setSummary() {
		summaryPie1 = echarts.init(document.getElementById('summaryPie1'));
		summaryPie2 = echarts.init(document.getElementById('summaryPie2'));
		summaryPie3 = echarts.init(document.getElementById('summaryPie3'));

		var ww = $(window).width();
		var pieData;
		if (ww > 1600) {
			pieData = {
				pieTop: '40%',
				pieTop2: '36%',
				titleSize: 20,
				pieRadius: [80, 85],
				itemSize: 32
			}
		} else {
			pieData = {
				pieTop: '30%',
				pieTop2: '26%',
				titleSize: 16,
				pieRadius: [60, 64],
				itemSize: 28
			}
		};
		//弹出框调用ECharts饼图
		var pieOption1 = {
			title: {
				x: 'center',
				y: pieData.pieTop,
				text: '司机',
				textStyle: {
					fontWeight: 'normal',
					color: '#ffd325',
					fontSize: pieData.titleSize,
				},
				subtext: '总数：100人\n今日工作：25人',
				subtextStyle: {
					color: '#fff',
				}
			},
			tooltip: {
				show: false,
			},
			toolbox: {
				show: false,
			},

			series: [{
				type: 'pie',
				clockWise: false,
				radius: pieData.pieRadius,
				hoverAnimation: false,
				center: ['50%', '50%'],
				data: [{
					value: 25,
					label: {
						normal: {
							formatter: '{d}%',
							position: 'outside',
							show: true,
							textStyle: {
								fontSize: pieData.itemSize,
								fontWeight: 'normal',
								color: '#ffd325'
							}
						}
					},
					itemStyle: {
						normal: {
							color: '#ffd325',
							shadowColor: '#ffd325',
							shadowBlur: 10
						}
					}
				}, {
					value: 75,
					name: '未工作',
					itemStyle: {
						normal: {
							color: 'rgba(44,59,70,1)', // 未完成的圆环的颜色
							label: {
								show: false
							},
							labelLine: {
								show: false
							}
						},
						emphasis: {
							color: 'rgba(44,59,70,1)' // 未完成的圆环的颜色
						}
					},
					itemStyle: {
						normal: {
							color: '#11284e',
							shadowColor: '#11284e',
						}
					},
				}]
			}]
		}
		var pieOption2 = {
			title: {
				x: 'center',
				y: pieData.pieTop,
				text: '车辆',
				textStyle: {
					fontWeight: 'normal',
					color: '#32ffc7',
					fontSize: pieData.titleSize
				},
				subtext: '总数：100辆\n今日工作：75辆人',
				subtextStyle: {
					color: '#fff',
				}
			},
			tooltip: {
				show: false,
			},
			toolbox: {
				show: false,
			},

			series: [{
				type: 'pie',
				clockWise: false,
				radius: pieData.pieRadius,
				hoverAnimation: false,
				center: ['50%', '50%'],
				data: [{
					value: 75,
					label: {
						normal: {
							formatter: '{d}%',
							position: 'outside',
							show: true,
							textStyle: {
								fontSize: pieData.itemSize,
								fontWeight: 'normal',
								color: '#32ffc7'
							}
						}
					},
					itemStyle: {
						normal: {
							color: '#32ffc7',
							shadowColor: '#32ffc7',
							shadowBlur: 10
						}
					}
				}, {
					value: 25,
					name: '未工作',
					itemStyle: {
						normal: {
							color: 'rgba(44,59,70,1)', // 未完成的圆环的颜色
							label: {
								show: false
							},
							labelLine: {
								show: false
							}
						},
						emphasis: {
							color: 'rgba(44,59,70,1)' // 未完成的圆环的颜色
						}
					},
					itemStyle: {
						normal: {
							color: '#11284e',
							shadowColor: '#11284e',
						}
					},
				}]
			}]
		}
		var pieOption3 = {
			title: {
				x: 'center',
				y: pieData.pieTop2,
				text: '运单',
				textStyle: {
					fontWeight: 'normal',
					color: '#1eb6fe',
					fontSize: pieData.titleSize
				},
				subtext: '总数：100单\n正常单：50单\n异常单：50单',
				subtextStyle: {
					color: '#fff',
				}
			},
			tooltip: {
				show: false,
			},
			toolbox: {
				show: false,
			},

			series: [{
				type: 'pie',
				clockWise: false,
				radius: pieData.pieRadius,
				hoverAnimation: false,
				center: ['50%', '50%'],
				data: [{
					value: 50,
					label: {
						normal: {
							formatter: '{d}%',
							position: 'outside',
							show: true,
							textStyle: {
								fontSize: pieData.itemSize,
								fontWeight: 'normal',
								color: '#1eb6fe'
							}
						}
					},
					itemStyle: {
						normal: {
							color: '#1eb6fe',
							shadowColor: '#1eb6fe',
							shadowBlur: 10
						}
					}
				}, {
					value: 50,
					name: '未工作',
					itemStyle: {
						normal: {
							color: 'rgba(44,59,70,1)', // 未完成的圆环的颜色
							label: {
								show: false
							},
							labelLine: {
								show: false
							}
						},
						emphasis: {
							color: 'rgba(44,59,70,1)' // 未完成的圆环的颜色
						}
					},
					itemStyle: {
						normal: {
							color: '#11284e',
							shadowColor: '#11284e',
						}
					},
				}]
			}]
		}

		//弹出框调用ECharts柱状图
		summaryBar = echarts.init(document.getElementById('summaryBar'));
		var barOption = {

			tooltip: {
				trigger: 'item',
				formatter: function (params) {
					var res = '本月' + params.name + '号运单数：' + params.data;
					return res;
				}
			},
			grid: {
				top: '20%',
				left: '15%',
				width: '80%',
				height: '80%',
				containLabel: true
			},
			xAxis: {
				data: ['美的南沙分厂', '美的商业空调事业部', '佛山信华'],
				axisLabel: {
					show: true,
					textStyle: {
						fontSize: '12px',
						color: '#fff',
					}
				},
				axisLine: {
					lineStyle: {
						color: '#fff',
						width: 1,
					}
				}
			},

			yAxis: {
				axisLabel: {
					show: true,
					textStyle: {
						fontSize: '12px',
						color: '#fff',
					}
				},
				axisLine: {
					lineStyle: {
						color: '#fff',
						width: 1,
					}
				},
				splitLine: {
					show: false,
				}
			},

			series: {
				name: '',
				type: 'bar',
				barWidth: 20,
				data: ['15', '13', '17'],
				itemStyle: {
					normal: {
						color: new echarts.graphic.LinearGradient(
							0, 0, 0, 1,
							[
								{ offset: 0, color: '#3876cd' },
								{ offset: 0.5, color: '#45b4e7' },
								{ offset: 1, color: '#54ffff' }
							]
						),
					},
				},
			},
		}

		//弹出框调用ECharts折线图
		summaryLine = echarts.init(document.getElementById('summaryLine'));
		var lineOption = {

			tooltip: {
				trigger: 'item',
				formatter: function (params) {
					var res = '本月' + params.name + '号运单数：' + params.data;
					return res;
				}
			},
			grid: {
				top: '20%',
				left: '0%',
				width: '100%',
				height: '80%',
				containLabel: true
			},
			xAxis: {
				data: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31'],
				axisLabel: {
					show: true,
					textStyle: {
						fontSize: '12px',
						color: '#3e70b0',
					}
				},
				axisLine: {
					lineStyle: {
						color: '#0e2c52',
						width: 1,
					}
				}
			},

			yAxis: {
				axisLabel: {
					show: true,
					textStyle: {
						fontSize: '12px',
						color: '#3e70b0',
					}
				},
				axisLine: {
					lineStyle: {
						color: '#0e2c52',
						width: 1,
					}
				},
				splitLine: {
					show: true,
					lineStyle: {
						color: '#0e2c52',
						width: 1,
					}
				}
			},

			series: {
				name: '',
				type: 'line',
				data: ['5', '14', '3', '6', '8', '18', '11', '4', '8', '7', '16', '13', '6', '10', '11', '9', '19', '13', '4', '20', '12', '7', '13', '15', '8', '3', '9', '16', '11', '16', '8'],
				areaStyle: {
					normal: {
						color: 'rgba(79,237,247,0.3)',
					}
				},
				itemStyle: {
					normal: {
						lineStyle: {
							color: '#00dafb',
							width: 1,
						},
						color: '#00dafb',
					},
				},
			},
		}

		summaryPie1.setOption(pieOption1);
		summaryPie2.setOption(pieOption2);
		summaryPie3.setOption(pieOption3);
		summaryBar.setOption(barOption);
		summaryLine.setOption(lineOption);
	}

	//弹窗
	$('.summaryBtn').on('click', function () {
		$('.filterbg').show();
		$('.popup').show();
		$('.popup').width('3px');
		$('.popup').animate({ height: '76%' }, 400, function () {
			$('.popup').animate({ width: '82%' }, 400);
		});
		setTimeout(summaryShow, 800);
	});
	$('.popupClose').on('click', function () {
		$('.popupClose').css('display', 'none');
		$('.summary').hide();
		summaryPie1.clear();
		summaryPie2.clear();
		summaryPie3.clear();
		summaryBar.clear();
		summaryLine.clear();
		$('.popup').animate({ width: '3px' }, 400, function () {
			$('.popup').animate({ height: 0 }, 400);
		});
		setTimeout(summaryHide, 800);
	});
	function summaryShow() {
		$('.popupClose').css('display', 'block');
		$('.summary').show();
		setSummary();

	};
	function summaryHide() {
		$('.filterbg').hide();
		$('.popup').hide();
		$('.popup').width(0);
	};

	// $(window).resize(function () {
	// 	myChart1.resize();
	// 	try {
	// 		summaryPie1.resize();
	// 		summaryPie2.resize();
	// 		summaryPie3.resize();
	// 		summaryBar.resize();
	// 		summaryLine.resize();
	// 	} catch (err) {
	// 		return false;
	// 	}
	// });



	/***************2018-01-03增加js****************/

	//地图上的搜索
	$('.searchBtn').on('click', function () {
		$(this).hide();
		$('.searchInner').addClass('open');
		setTimeout(function () {
			$('.searchInner').find('form').show();
		}, 400);
	});

	$('.search').on('click', function (event) {
		event.stopPropagation();
	});
	$('body').on('click', function () {
		$('.searchInner').find('form').hide();
		$('.searchInner').removeClass('open');
		setTimeout(function () {
			$('.searchBtn').show();
		}, 400);
	});

	//车辆状态滚动条样式
	$('.stateUl').niceScroll({
		cursorcolor: "#045978",//#CC0071 光标颜色
		cursoropacitymax: 0.6, //改变不透明度非常光标处于活动状态（scrollabar“可见”状态），范围从1到0
		touchbehavior: false, //使光标拖动滚动像在台式电脑触摸设备
		cursorwidth: "4px", //像素光标的宽度
		cursorborder: "0", // 	游标边框css定义
		cursorborderradius: "4px",//以像素为光标边界半径
		autohidemode: false //是否隐藏滚动条
	});


	//车辆信息工作时间表
	//模拟数据
	var carData = [
		{
			dateLable: "2022-01-01 星期一",
			data: {
				workTime: [
					{ start: "07:30", end: "13:15" },
					{ start: "14:40", end: "21:50" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		},
		{
			dateLable: "2022-01-02 星期二",
			data: {
				workTime: [
					{ start: "03:10", end: "09:40" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		},
		{
			dateLable: "2022-01-03 星期三",
			data: {
				workTime: [
					{ start: "06:15", end: "14:08" },
					{ start: "15:53", end: "24:00" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		},
		{
			dateLable: "2022-01-04 星期四",
			data: {
				workTime: [
					{ start: "00:00", end: "07:32" },
					{ start: "12:20", end: "19:50" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		},
		{
			dateLable: "2022-01-05 星期五",
			data: {
				workTime: [
					{ start: "06:15", end: "17:20" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		},
		{
			dateLable: "2022-01-06 星期六",
			data: {
				workTime: [
					{ start: "14:40", end: "22:38" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		},
		{
			dateLable: "2022-01-07 星期天",
			data: {
				workTime: [
					{ start: "06:30", end: "12:20" },
					{ start: "14:25", end: "20:33" }
				],
				standard: [
					{ start: "00:00", end: "05:00" },
					{ start: "08:00", end: "12:00" },
					{ start: "14:00", end: "19:00" }
				]
			}
		}
	];

	function Schedule() {
		var Item = $('.dataBox');
		var Size = Item.eq(0).width();
		var oDay = 24 * 60;

		function getMin(timeStr) {
			var timeArray = timeStr.split(":");
			var Min = parseInt(timeArray[0]) * 60 + parseInt(timeArray[1]);
			return Min;
		}

		//在时间轴上添加工作时间数据
		Item.each(function (i, ele) {
			var ItemData = carData[i];
			function addData(obj, dataParam) {
				for (var j = 0; j < dataParam.length; j++) {
					var pos, wid, workCeil, sDate, sStart, sEnd, sConsume;
					pos = getMin(dataParam[j].start) / oDay * 100 + '%';
					wid = (getMin(dataParam[j].end) - getMin(dataParam[j].start)) / oDay * 100 + '%';
					sDate = ItemData.dateLable;
					sStart = dataParam[j].start;
					sEnd = dataParam[j].end;
					sConsume = getMin(dataParam[j].end) - getMin(dataParam[j].start);
					workCeil = '<span style="width: ' + wid + ';left: ' + pos + '" sDate="' + sDate + '" sStart="' + sStart + '" sEnd="' + sEnd + '" sConsume="' + sConsume + '"></span>';
					obj.append(workCeil);
				}
			}
			addData($(ele).find('.workTime'), ItemData.data.workTime);
			addData($(ele).find('.standard'), ItemData.data.standard);
		});

		//添加总用时与总单数
		var Total = $('.totalItem');
		Total.each(function (i, ele) {
			var ItemData = carData[i].data.workTime;
			var timeUsed = 0;
			for (var j = 0; j < ItemData.length; j++) {
				timeUsed += getMin(ItemData[j].end) - getMin(ItemData[j].start);
			}
			var realHour = Math.floor(timeUsed / 60);
			$(ele).find('span').eq(0).html(realHour + ':' + (timeUsed - realHour * 60));
			$(ele).find('span').eq(1).html(ItemData.length);
		});
	};
	Schedule();

	//鼠标移入运单显示信息框
	$('.workTime').on('mouseenter', 'span', function (ev) {
		var x = ev.clientX;
		var y = ev.clientY;
		var sDate, sStart, sEnd, sConsume, infos, sHour, sMin;
		sDate = $(this).attr("sDate");
		sStart = $(this).attr("sStart");
		sEnd = $(this).attr("sEnd");
		sConsume = $(this).attr("sConsume");
		sHour = Math.floor(sConsume / 60);
		sMin = sConsume - sHour * 60;

		infos = '<div class="workTimeInfo" style="left:' + x + 'px;top:' + y + 'px"><p>日期：' + sDate + '</p><p>开始时间：' + sStart + '</p><p>结束时间：' + sEnd + '</p><p>总用时：' + sHour + '小时' + sMin + '分钟</p></div>';
		$('body').append(infos);
	});
	$('.workTime').on('mouseout', function () {
		$('.workTimeInfo').remove();
	});


	//车辆信息弹出框的显示隐藏效果
	$('.infoBtn').on('click', function () {
		$('.filterbg').show();
		$('.carInfo').show();
		$('.carInfo').width('3px');
		$('.carInfo').animate({ height: '76%' }, 400, function () {
			$('.carInfo').animate({ width: '82%' }, 400);
		});
		setTimeout(function () {
			$('.infoBox').show();
			$('.carClose').css('display', 'block');
		}, 800);

	});
	$('.carClose').on('click', function () {
		$('.carClose').css('display', 'none');
		$('.infoBox').hide();

		$('.carInfo').animate({ width: '3px' }, 400, function () {
			$('.carInfo').animate({ height: 0 }, 400);
		});
		setTimeout(function () {
			$('.filterbg').hide();
			$('.carInfo').hide();
			$('.carInfo').width(0);
		}, 800);
	});
});