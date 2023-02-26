后端环境配置方法：

1. git clone项目到本地文件夹，拖进pycharm，分支选择back
2. 自行配置python环境，我这里是python3.9，尽量一致吧
3. 安装flask，pymysql等包，可以不断运行项目看报错说缺什么
4. 在navicat里新建个数据库srtp_smart_bus，然后右键选择运行sql脚本，选择我发给你的sql文件，然后表和数据应该就能看到了
5. 运行flask项目，出现运行的地址127.0.0.1:5000即说明跑通了
6. 在浏览器里输入127.0.0.1:5000/getOrderInfo如果能获取到数据就说明ok了