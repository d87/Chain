from flask import Flask
from flask import render_template
from flask import jsonify
from flask import request
from database import db_session
from models import User, Task, ListTask

from flask.ext.admin import Admin, BaseView, expose #flask-admin
from flask.ext.admin.contrib.sqla import ModelView


app = Flask(__name__)


app.config['SECRET_KEY'] = 's547vn64dfkv84210sd97#68$f20'
app.config['CSRF_ENABLED'] = True

admin = Admin(app)
admin.add_view(ModelView(Task, db_session))
admin.add_view(ModelView(User, db_session))
admin.add_view(ModelView(ListTask, db_session))

@app.route('/')
def tasks():
    tasks = Task.query.all()
    listtasks = ListTask.query.all()
    return render_template("home.html", tasks=tasks, listtasks=listtasks)


@app.route('/api/task/<int:task_id>/', methods=['GET', 'POST'])
def taskjson(task_id):
    if request.method == 'POST':
        cmd = request.form['cmd']
        value = request.form['value']
        try:
            v = int(value)
        except:
            v = value

        task = Task.query.filter(Task.id == task_id).first()

        response = ""

        # if hasattr(task,cmd):
            # getattr(task,cmd)(key,val)

        if cmd == "reset":
            response = task.reset()
        elif cmd == "add_time":
            response = task.add_time(v)


        db_session.commit()
        return response
        # assert False
    else:
        task = Task.query.filter(Task.id == task_id).first()
        return task.ok_response("sync")

@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()



if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', threaded=True)