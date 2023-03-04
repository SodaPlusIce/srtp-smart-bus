from flask import Flask, render_template
from flask_socketio import SocketIO,send,emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app,cors_allowed_origins="*")
@app.route('/')
def index():
    return render_template('index.html')
@socketio.on('connect')
def test_connect():
    print('socket connected, this is server')

@socketio.on('disconnect')
def test_disconnect():
    print('socket disconnected, this is server')

@socketio.on('my_event')
def handle_message():
    socketio.emit('test_pos',"ddd")

if __name__ == '__main__':
    socketio.run(app, debug=True)