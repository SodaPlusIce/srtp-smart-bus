# 192.168.203.129
import redis
redis_pool = redis.ConnectionPool(host='192.168.203.129', port= 6379, password= '000415', db=1)
redis_conn = redis.Redis(connection_pool= redis_pool)
redis_conn.set('name_2', 'Zarten_2')