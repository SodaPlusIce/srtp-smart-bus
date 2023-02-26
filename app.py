import datetime
import json

import pymysql
from flask import Flask, request, make_response
from flask_cors import CORS
import numpy as np
import random
import itertools
import time

app = Flask(__name__)
CORS(app, resources=r'/*')  # 注册CORS, "/*" 允许访问所有api

# 打开数据库连接
db = pymysql.connect(host='localhost',
                     user='root',
                     port=3306,
                     password='123456',
                     database='srtp_smart_bus',
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
    nextStopIds = list(int(char) for char in nextStopIds.split(','))

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
                nowtime = time.strftime('%Y%m%d%H%M%S', time.localtime())
                order_id = "YS" + str(curr_car) + str(passes) + nowtime + str(index)
                index += 1
                # 预约场景描述：现在的预约模拟是所有乘客在换乘中心，要前往各个村，然后算法分配车辆，然后开始跑，然后订单陆续完成
                # sql = "INSERT INTO order_info(order_id,stop_on,stop_off,allo_bus,ifOnBus,passengers,expected_on,expected_off)" \
                #       " VALUES ('{0}','换乘中心','{1}','{2}','1','{3}','0730','0740');"\
                #     .format(order_id, stopName[path_stop], "S"+str(curr_car),passes)
                # 预约场景描述：现在的预约模拟是早上所有预约的乘客在各个站点，要前往换乘中心，然后算法分配车辆，然后跑，跑的中间可以响应几单加进来
                # 最后回到换乘中心0，所有订单完成
                sql = "INSERT INTO order_info(order_id,stop_on,stop_off,allo_bus,ifOnBus,passengers,expected_on,expected_off)" \
                      " VALUES ('{0}','{1}','换乘中心','{2}','0','{3}','0730','0740');" \
                    .format(order_id, stopName[path_stop], "S" + str(curr_car), passes)
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
    sql = "UPDATE path SET S1='{0}' WHERE flag=1;".format(paths[0])
    cursor.execute(sql)
    db.commit()
    sql = "UPDATE path SET S2='{0}' WHERE flag=1;".format(paths[1])
    cursor.execute(sql)
    db.commit()
    sql = "UPDATE path SET S3='{0}' WHERE flag=1;".format(paths[2])
    cursor.execute(sql)
    db.commit()
    sql = "UPDATE path SET S4='{0}' WHERE flag=1;".format(paths[3])
    cursor.execute(sql)
    db.commit()
    sql = "UPDATE path SET S5='{0}' WHERE flag=1;".format(paths[4])
    cursor.execute(sql)
    db.commit()

    print("分配路线：", min_stops)
    print("各站点人数：", pas)
    data = {
        'seqs': min_stops, 'passenger_num': pas
    }
    return make_response(data)


# 还要做的：给后端 目前各个车上的人数，新订单的上车站点、下车站点、乘客数，目前各个车的路线可以从数据库拉取
# 后端算法处理完后 更新数据库里的路线，前端车到了调用carAtStop会检测到路线的变化；同时把新订单的信息写入order_info
@app.route("/addOrder")  # 添加新订单，往order_info中插入新数据
def addOrder():
    stop_on = request.values.get('stop_on')
    stop_off = request.values.get('stop_off')
    passengers = request.values.get('passengers')
    onBusPass_num = request.values.get('onBusPass_num')  # 目前各个车上的人数(字符串，如 14,0,0,0,0)，还要加上未上车的将要上车的人数
    nextStopIds = request.values.get('nextStopIds')  # 新增订单时刻各个车辆的下一站
    # 调用getNewPathAfterResponse函数得知分配给哪辆车，新的路线是什么
    # onBusPass_num加上未上车的将要上车的人数
    sql = "SELECT * FROM order_info;"
    cursor.execute(sql)
    data = cursor.fetchall()
    onBusPass_num = list(int(char) for char in onBusPass_num.split(','))  # 车上乘客数转化为数组
    for item in data:
        if item[4] == 0:  # 不在公交车上
            if item[3] == "S1":
                onBusPass_num[0] += 1
            elif item[3] == "S2":
                onBusPass_num[1] += 1
            elif item[3] == "S3":
                onBusPass_num[2] += 1
            elif item[3] == "S4":
                onBusPass_num[3] += 1
            elif item[3] == "S5":
                onBusPass_num[4] += 1
    # 调用数据库看各个车的路线
    sql = "SELECT * FROM path WHERE flag=1;"
    cursor.execute(sql)
    data = cursor.fetchall()
    paths = []
    for item in data[0]:
        if item and item != 1:
            item = item[1:len(item) - 1]
            item = list(int(char) for char in item.split(','))
            paths.append(item)
    res = getNewPathAfterResponse(int(stop_on), int(stop_off), int(passengers), onBusPass_num, paths, nextStopIds)
    print("新增响应后的影响车辆及路线：", res)
    # 更新path表
    if res[0] == 0:
        tmpStr = ','.join(str(i) for i in res[1])
        tmpStr = '[' + tmpStr + ']'
        sql = "UPDATE path SET S1='{0}'  WHERE flag=1;".format(tmpStr)
        cursor.execute(sql)
        db.commit()
    elif res[0] == 1:
        tmpStr = ','.join(str(i) for i in res[1])
        tmpStr = '[' + tmpStr + ']'
        sql = "UPDATE path SET S2='{0}'  WHERE flag=1;".format(tmpStr)
        cursor.execute(sql)
        db.commit()
    elif res[0] == 2:
        tmpStr = ','.join(str(i) for i in res[1])
        tmpStr = '[' + tmpStr + ']'
        sql = "UPDATE path SET S3='{0}'  WHERE flag=1;".format(tmpStr)
        cursor.execute(sql)
        db.commit()
    elif res[0] == 3:
        tmpStr = ','.join(str(i) for i in res[1])
        tmpStr = '[' + tmpStr + ']'
        sql = "UPDATE path SET S4='{0}'  WHERE flag=1;".format(tmpStr)
        cursor.execute(sql)
        db.commit()
    elif res[0] == 4:
        tmpStr = ','.join(str(i) for i in res[1])
        tmpStr = '[' + tmpStr + ']'
        sql = "UPDATE path SET S5='{0}'  WHERE flag=1;".format(tmpStr)
        cursor.execute(sql)
        db.commit()
    # 新订单的信息写入order_info
    allo_bus = "S" + str(1 + res[0])
    # 根据分配车辆号加上年月日时分秒生成订单号
    # X表示响应的订单，Y表示预约的订单  订单号=X/Y+车辆编号+人数+年月日时分秒
    order_id = 'X' + allo_bus + passengers + datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    stop_on = stopName[int(stop_on)]
    stop_off = stopName[int(stop_off)]

    sql = "INSERT INTO order_info(order_id,stop_on,stop_off,allo_bus,ifOnBus,passengers)" \
          " VALUES ('{0}','{1}','{2}','{3}',0,'{4}');" \
        .format(order_id, stop_on, stop_off, allo_bus, passengers)
    cursor.execute(sql)
    db.commit()
    return make_response(json.dumps(res))  # 在此处通知前端需不需要新派一辆车，并把车的id和路线返回回去


@app.route("/getOrderInfo")  # 获取订单信息，返回order_info表中内容
def getOrderInfo():
    sql = "SELECT * FROM order_info;"
    cursor.execute(sql)
    data = cursor.fetchall()
    db.commit()
    return make_response(json.dumps(data))


@app.route("/getStopWaitingNum")  # 获取每个站点的等待人数（ifOnBus为0）和车上人数（ifOnBus为1），返回一个长度为8的数组
def getStopWaitingNum():
    # 做sql查询
    stopNum = [0, 0, 0, 0, 0, 0, 0, 0]
    busPassengersNum = [0, 0, 0, 0, 0]
    sql = "SELECT * FROM order_info;"
    cursor.execute(sql)
    data = cursor.fetchall()
    for item in data:
        if item[4] == 0:  # 不在公交车上
            if item[1] == "换乘中心":
                stopNum[0] += item[5]
            elif item[1] == "镇西村":
                stopNum[1] += item[5]
            elif item[1] == "石淙村":
                stopNum[2] += item[5]
            elif item[1] == "姚家坝村":
                stopNum[3] += item[5]
            elif item[1] == "银子桥村":
                stopNum[4] += item[5]
            elif item[1] == "羊河坝村":
                stopNum[5] += item[5]
            elif item[1] == "花园湾村":
                stopNum[6] += item[5]
            elif item[1] == "南坝村":
                stopNum[7] += item[5]
        else:  # 在公交车上
            if item[3] == "S1":
                busPassengersNum[0] += item[5]
            elif item[3] == "S2":
                busPassengersNum[1] += item[5]
            elif item[3] == "S3":
                busPassengersNum[2] += item[5]
            elif item[3] == "S4":
                busPassengersNum[3] += item[5]
            elif item[3] == "S5":
                busPassengersNum[4] += item[5]
    finalData = [stopNum, busPassengersNum]

    return make_response(json.dumps(finalData))


@app.route("/carAtStop")  # 车辆到站  返回上下车人数以及车辆行驶路径
def carAtStop():
    car_id = request.values.get('car_id')
    stop_id = request.values.get('stop_id')

    car_ids = car_id
    car_id = "S" + str(int(car_id) + 1)
    stop_id = stopName[int(stop_id)]
    # 根据order_info计算下车几个人（根据分配车辆号和目的站点），然后把这些记录delete，同时导入到历史账单
    sql = "SELECT * FROM order_info WHERE ifOnBus=1 AND stop_off='{0}' AND allo_bus='{1}';".format(stop_id, car_id)
    cursor.execute(sql)
    data = cursor.fetchall()
    off_num = 0
    for item in data:
        off_num += item[5]
    for item in data:
        if item[0][0] == 'Y':
            isReserved = 1
        else:
            isReserved = 0
        sql = "INSERT INTO history_order_info VALUES ('{0}','{1}','{2}','{3}','{4}');" \
            .format(item[0], item[1], item[2], item[3], isReserved)
        cursor.execute(sql)
        db.commit()
    sql = "DELETE FROM order_info WHERE ifOnBus=1 AND stop_off='{0}' AND allo_bus='{1}';".format(stop_id, car_id)
    cursor.execute(sql)
    db.commit()
    # 根据order_info计算上车几个人（根据分配车辆号和上车站点），然后把这些记录的ifOnBus  update成true
    sql = "SELECT * FROM order_info WHERE ifOnBus=0 AND stop_on='{0}' AND allo_bus='{1}';".format(stop_id, car_id)
    cursor.execute(sql)
    data = cursor.fetchall()
    on_num = 0
    for item in data:
        on_num += item[5]
    sql = "UPDATE order_info SET ifOnBus=1  WHERE ifOnBus=0 AND stop_on='{0}' AND allo_bus='{1}';".format(stop_id,
                                                                                                          car_id)
    cursor.execute(sql)
    db.commit()
    # 根据car_id查找path表返回路径
    sql = "SELECT * FROM path WHERE flag=1;"
    cursor.execute(sql)
    data = cursor.fetchall()
    res = [str(on_num + off_num), data[0][int(car_ids)],on_num,off_num]

    return make_response(json.dumps(res))


@app.route("/getHistoryOrder")
def getHistoryOrder():
    sql = "SELECT count(*),isReserved FROM history_order_info GROUP BY isReserved;"
    cursor.execute(sql)
    data = cursor.fetchall()
    response_num = 0
    reserved_num = 0
    if len(data) == 2:
        if data[0][1] == 0:
            response_num = data[0][0]
            reserved_num = data[1][0]
        elif data[0][1] == 1:
            response_num = data[1][0]
            reserved_num = data[0][0]
    elif len(data) == 1:
        if data[0][1] == 0:
            response_num = data[0][0]
        elif data[0][1] == 1:
            reserved_num = data[0][0]
    # 计算今日的历史订单
    nowtime = time.strftime('%Y%m%d', time.localtime())
    count = 0
    sql = "SELECT * FROM history_order_info;"
    cursor.execute(sql)
    data = cursor.fetchall()
    for item in data:
        if item[0][4:12] == nowtime:
            count += 1
    res = [reserved_num, response_num, count]
    return make_response(json.dumps(res))

if __name__ == '__main__':
    app.run()
