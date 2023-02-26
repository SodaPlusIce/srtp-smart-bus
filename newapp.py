import datetime
import json

import pymysql
from flask import Flask, request, make_response
from flask_cors import CORS
import numpy as np
import random
import itertools
import time
import redis

app = Flask(__name__)
CORS(app, resources=r'/*')  # 注册CORS, "/*" 允许访问所有api
redis_pool = redis.ConnectionPool(host='127.0.0.1', port=6379, db=0)
redis_conn = redis.Redis(connection_pool=redis_pool)
# 打开数据库连接
db = pymysql.connect(host='localhost',
                     user='root',
                     port=3306,
                     password='123456',
                     database='srtp-smart-bus-jks',
                     charset='utf8')
cursor = db.cursor()

stopName = [
    "换乘中心",  # 0
    "镇西村",  # 1
    "石淙村",  # 2
    "姚家坝村",  # 3
    "银子桥村",  # 4
    "羊河坝村",  # 5
    "花园湾村",  # 6
    "南坝村",  # 7
]


###############################
def input_distance():
    a = np.array([[0.0, 2.6, 1.7, 2.6, 2.4, 2.3, 3.0, 3.8],
                  [2.6, 0.0, 4.1, 4.9, 4.6, 3.7, 3.8, 4.7],
                  [1.7, 4.1, 0.0, 2.6, 3.6, 3.9, 4.5, 5.3],
                  [2.6, 4.9, 2.6, 0.0, 3.0, 4.1, 4.7, 5.5],
                  [2.4, 4.6, 3.6, 3.0, 0.0, 2.1, 3.0, 3.6],
                  [2.3, 3.7, 3.9, 4.1, 2.1, 0.0, 1.6, 1.5],
                  [3.0, 3.8, 4.5, 4.7, 3.0, 1.6, 0.0, 1.6],
                  [3.8, 4.7, 5.3, 5.5, 3.6, 1.5, 1.6, 0.0]])
    np.save('diatance.npy', a)
    b = np.load('diatance.npy')
    return b


class Stop:
    def __init__(self, name, passenger):
        self.name = name
        self.passenger = passenger

    def __str__(self):
        return str(self.name)


class Bus:
    def __init__(self, route, passengers):
        self.route = route
        self.passengers = passengers


min_stops = []


def gen_passenger(stop_num):
    stops = []
    for i in range(stop_num):
        a = random.randint(0, 6)
        stops.append(Stop(i, a))
    return stops


def gen_buses(bus_num):
    buses = []
    for j in range(5):
        buses.append(Bus([], 0))
    return buses


def calculate_min_time(dis, stops, stop_num, buses):
    j = 0
    for i in range(stop_num):
        if stops[i].passenger != 0:
            buses[j].passengers += stops[i].passenger
            if buses[j].passengers > 15:
                buses[j].passengers -= stops[i].passenger
                j += 1
                buses[j].passengers += stops[i].passenger
                buses[j].route.append(i + 1)
            else:
                buses[j].route.append(i + 1)
    i = 0
    while buses[i].passengers != 0:
        min_stops.append(pailie(dis, stops, 7, buses[i].route, buses[i].passengers))
        i += 1


def pailie(dis, stops, stop_num, bus, passengers):
    pailie = list(itertools.permutations(bus))
    min_dis = 0
    t_s = []
    min_stop = []

    for x in pailie:  # 排列组合所有可能路线
        head_stop = 0  # 重置头车站
        all_dis = 0  # 重置距离
        t_p = passengers  # 重置乘车人数
        t_s.clear()  # 重置车站顺序
        t_s.append(0)

        for y in x:
            t_s.append(y)
            tail_stop = y
            all_dis += dis[head_stop, tail_stop] * t_p
            t_p -= stops[y - 1].passenger
            head_stop = tail_stop
        if min_dis == 0:
            min_dis = all_dis
            for i in range(len(t_s)):
                min_stop.append(t_s[i])
        if all_dis < min_dis:
            min_dis = all_dis
            min_stop.clear()
            for i in range(len(t_s)):
                min_stop.append(t_s[i])
    return min_stop


def getNewPathAfterResponse(stop_on, stop_off, passengers, onBusPass_nums, paths, nextStopIds):
    # print(type(nextStopIds))
    # print(nextStopIds)
    # print(nextStopIds[0])
    # nextStopIds = list(int(char) for char in nextStopIds.split(','))

    res = [len(paths), [0, stop_on, 0]]  # 发新车

    current_path = []
    t_path = []

    for i in range(len(nextStopIds)):  # 获取当前实际剩余路线
        if nextStopIds[i] == 0:
            t_path = [0]
        else:
            t_path = paths[i]
            while t_path[0] != nextStopIds[i]:
                t_path.pop(0)
        current_path.append(t_path)

    for i in range(len(nextStopIds)):  # 有车辆线路覆盖上车点直接插入
        if onBusPass_nums[i] != 0 and onBusPass_nums[i] + passengers <= 15:
            if current_path[i].count(stop_on) > 0:
                res = [i, current_path[i]]
                return res

    for i in range(len(nextStopIds)):
        if onBusPass_nums[i] != 0 and onBusPass_nums[i] + passengers <= 15:
            current_path[i].insert(1, stop_on)
            res = [i, current_path[i]]
            return res

    return res


# point

# 预约场景描述：现在的预约模拟是所有乘客在换乘中心，要前往各个村，然后算法分配车辆，然后开始跑，然后订单陆续完成
# 返回各个车辆的路径
@app.route("/getSeqs")
def getSequences():
    # bus=request.data
    min_stops.clear()
    stops = gen_passenger(7)
    buses = gen_buses(5)
    dis = input_distance()
    calculate_min_time(dis, stops, 7, buses)

    pas = []
    for i in range(len(stops)):
        pas.append(stops[i].passenger)

    # 做预约订单存入数据库的逻辑，一方面维护order_info表，一方面维护path表
    # 预约订单存入数据库
    curr_car = 1
    index = 0
    for single_seq in min_stops:
        for path_stop in single_seq:
            if path_stop != 0:
                passes = pas[path_stop - 1]
                nowtime = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                date = time.strftime('%Y%m%d', time.localtime())
                yesterday = (datetime.datetime.now() + datetime.timedelta(days=-1)).strftime("%Y%m%d%H%M%S")
                order_id = "YS" + str(curr_car) + str(passes) + nowtime + str(index)
                index += 1
                # 预约场景描述：现在的预约模拟是所有乘客在换乘中心，要前往各个村，然后算法分配车辆，然后开始跑，然后订单陆续完成
                # sql = "INSERT INTO order_info(order_id,stop_on,stop_off,allo_bus,ifOnBus,passengers,expected_on,expected_off)" \
                #       " VALUES ('{0}','换乘中心','{1}','{2}','1','{3}','0730','0740');"\
                #     .format(order_id, stopName[path_stop], "S"+str(curr_car),passes)
                # 预约场景描述：现在的预约模拟是早上所有预约的乘客在各个站点，要前往换乘中心，然后算法分配车辆，然后跑，跑的中间可以响应几单加进来
                # 最后回到换乘中心0，所有订单完成
                sql = "INSERT INTO order_info(order_id,order_type,date,stop_on,stop_off,phone,status,passengers," \
                      "allo_bus,expected_on,created_time,onbus_time)" \
                      " VALUES ('{0}','0','{1}','{2}','换乘中心','123456789','0','{3}','{4}','0730','{5}','');" \
                    .format(order_id, date, stopName[path_stop], passes, "S" + str(curr_car), yesterday)
                cursor.execute(sql)
                db.commit()
        curr_car += 1
    # 维护path表
    # 每辆车路线的末尾加0
    for item in min_stops:
        item.append(0)
    paths = ["", "", "", "", ""]
    car_num = len(min_stops)
    for i in range(car_num):
        paths[i] = str(min_stops[i])
    cnt = car_num + 1
    if car_num < 5:
        while cnt != 6:
            paths[cnt - 1] = ""
            cnt += 1

    # 车辆路径
    redis_conn.set("S1", paths[0])
    redis_conn.set("S2", paths[1])
    redis_conn.set("S3", paths[2])
    redis_conn.set("S4", paths[3])
    redis_conn.set("S5", paths[4])

    # 各站点人数
    redis_conn.set("T0", 0)
    redis_conn.set("T1", pas[0])
    redis_conn.set("T2", pas[1])
    redis_conn.set("T3", pas[2])
    redis_conn.set("T4", pas[3])
    redis_conn.set("T5", pas[4])
    redis_conn.set("T6", pas[5])
    redis_conn.set("T7", pas[6])

    # 车上人数初始化
    redis_conn.set("P1", 0)
    redis_conn.set("P2", 0)
    redis_conn.set("P3", 0)
    redis_conn.set("P4", 0)
    redis_conn.set("P5", 0)

    print("分配路线：", min_stops)
    print("各站点人数：", pas)
    data = {
        'seqs': min_stops, 'passenger_num': pas
    }
    return make_response(data)


@app.route("/getOrderInfo")  # 获取订单信息，返回order_info表中内容
def getOrderInfo():
    sql = "SELECT * FROM order_info where status=0 or status =1;"
    cursor.execute(sql)
    data = cursor.fetchall()
    db.commit()
    return make_response(json.dumps(data))


@app.route("/getStopWaitingNum")  # 获取每个站点的等待人数（ifOnBus为0）和车上人数（ifOnBus为1），返回一个长度为8的数组
def getStopWaitingNum():
    stopNum = []
    busPassengersNum = []

    # 获取等待人数
    for i in range(0, 8):
        stopIndex = "T" + str(i)
        stop_num = redis_conn.get(stopIndex).decode()
        stopNum.append(stop_num)

    print(stopNum)

    # 获取车上人数
    for i in range(1, 6):
        pasIndex = "P" + str(i)
        pas_num = redis_conn.get(pasIndex).decode()
        busPassengersNum.append(pas_num)
    print(busPassengersNum)
    finalData = [stopNum, busPassengersNum]

    return make_response(json.dumps(finalData))


# 返回已完成的预约订单总数，已完成响应订单总数，今日已完成订单总数
@app.route("/getHistoryOrder")
def getHistoryOrder():
    # 返回已完成的预约订单总数
    reserve_done_sql = "SELECT count(*) FROM order_info where order_type=1 and status=2;"
    cursor.execute(reserve_done_sql)
    reserved_num = cursor.fetchall()
    db.commit()

    # 已完成响应订单总数
    response_done_sql = "SELECT count(*) FROM order_info where order_type=0 and status=2;"
    cursor.execute(response_done_sql)
    response_num = cursor.fetchall()
    db.commit()

    # 今日已完成订单总数
    date = time.strftime('%Y%m%d', time.localtime())
    today_done_sql = "SELECT count(*) FROM order_info where date={0} and status=2;".format(date)
    cursor.execute(today_done_sql)
    count = cursor.fetchall()
    db.commit()

    res = [reserved_num[0][0], response_num[0][0], count[0][0]]
    return make_response(json.dumps(res))


@app.route("/carAtStop")  # 车辆到站  返回上下车人数以及车辆行驶路径
def carAtStop():
    car_id = request.values.get('car_id')
    stop_id = request.values.get('stop_id')

    car_ids = car_id
    car_id = "S" + str(int(car_id) + 1)
    stop_id = stopName[int(stop_id)]
    # 根据order_info计算下车几个人（根据分配车辆号和目的站点）,然后将订单改为已完成
    sql = "SELECT count(*) FROM order_info WHERE status=1 AND stop_off='{0}' AND allo_bus='{1}';".format(stop_id,
                                                                                                         car_id)
    cursor.execute(sql)
    data = cursor.fetchall()
    db.commit()
    off_num = data[0][0]
    sql = "update order_info set status=2 WHERE status=1 AND stop_off='{0}' AND allo_bus='{1}';".format(stop_id, car_id)
    cursor.execute(sql)
    db.commit()

    # 根据order_info计算上车几个人（根据分配车辆号和上车站点）
    sql = "SELECT count(*) FROM order_info WHERE status=0 AND stop_on='{0}' AND allo_bus='{1}';".format(stop_id, car_id)
    cursor.execute(sql)
    data = cursor.fetchall()
    on_num = data[0][0]
    db.commit()
    former_num=redis_conn.get("P"+str(int(car_ids) + 1))
    redis_conn.set("P"+str(int(car_ids) + 1),former_num-off_num+on_num)
    former_num = redis_conn.get("T" + stop_id)
    redis_conn.set("T" + stop_id, former_num-on_num)
    nowtime = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    sql = "UPDATE order_info SET status=1,onbus_time={0}  WHERE status=0 AND stop_on='{1}' AND allo_bus='{2}';".format(
        nowtime, stop_id,
        car_id)
    cursor.execute(sql)
    db.commit()

    # 查找path表返回路径
    path_table = redis_conn.get(car_id).decode()
    path_table = path_table[4:]
    path_table = '[' + path_table
    redis_conn.set(car_id, path_table)
    res = [str(on_num + off_num), path_table, on_num, off_num]

    return make_response(json.dumps(res))


@app.route("/addOrder")  # 添加新订单，往order_info中插入新数据
def addOrder():
    stop_on = request.values.get('stop_on')
    stop_off = request.values.get('stop_off')
    passengers = request.values.get('passengers')
    # 从redis拉取到目前各个车的车上人数，各车下一站，各车路线
    onBusPass_num = []
    onBusPass_num.append(int(redis_conn.get('P1').decode()))
    onBusPass_num.append(int(redis_conn.get('P2').decode()))
    onBusPass_num.append(int(redis_conn.get('P3').decode()))
    onBusPass_num.append(int(redis_conn.get('P4').decode()))
    onBusPass_num.append(int(redis_conn.get('P5').decode()))
    # onBusPass_num加上未上车的将要上车的人数
    sql = "SELECT * FROM order_info;"
    cursor.execute(sql)
    data = cursor.fetchall()
    for item in data:
        if item[6] == 0:  # 不在公交车上
            if item[8] == "S1":
                onBusPass_num[0] += item[7]
            elif item[8] == "S2":
                onBusPass_num[1] += item[7]
            elif item[8] == "S3":
                onBusPass_num[2] += item[7]
            elif item[8] == "S4":
                onBusPass_num[3] += item[7]
            elif item[8] == "S5":
                onBusPass_num[4] += item[7]
    nextStopIds = []
    for i in range(1, 6):
        tmpPath = redis_conn.get('S' + str(i)).decode()
        if tmpPath:
            nextStopIds.append(int(tmpPath[1]))
    paths = []
    for i in range(1, 6):
        tmpPath = redis_conn.get('S' + str(i)).decode()
        if tmpPath:
            tmpPath=tmpPath[1:len(tmpPath)-1]
            tmpPath = list(int(char) for char in tmpPath.split(','))
            paths.append(tmpPath)
    res = getNewPathAfterResponse(int(stop_on), int(stop_off), int(passengers),
                                  onBusPass_num, paths, nextStopIds)
    print("新增响应后的影响车辆及路线：", res)
    # 更新path
    tmpStr = ','.join(str(i) for i in res[1])
    tmpStr = '[' + tmpStr + ']'
    redis_conn.set('S' + str(res[0] + 1), tmpStr)
    # 新订单写入order_info
    allo_bus = "S" + str(1 + res[0])
    nowtime = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    order_id = 'X' + allo_bus + passengers + nowtime
    date = datetime.datetime.now().strftime('%Y%m%d')
    stop_on = stopName[int(stop_on)]
    stop_off = stopName[int(stop_off)]
    sql = "INSERT INTO order_info(order_id,order_type,date,stop_on,stop_off,phone,status,passengers," \
             "allo_bus,expected_on,created_time,onbus_time)" \
             " VALUES ('{0}','1','{1}','{2}','{3}','123456789','0','{4}','{5}','','{6}','');" \
        .format(order_id, date, stop_on, stop_off, passengers, allo_bus, nowtime)
    cursor.execute(sql)
    db.commit()
    return make_response(json.dumps(res))


if __name__ == '__main__':
    app.run()
