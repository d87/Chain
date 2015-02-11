from flask import Flask
from flask import render_template
from flask import jsonify
from flask import request
from database import db_session
from models import Task, ListTask

from flask.ext.admin import Admin, BaseView, expose #flask-admin
from flask.ext.admin.contrib.sqla import ModelView



# deps so far:
# dev-python/markdown
# flask-admin
# wtforms
# flask-wtf


app = Flask(__name__)


app.config['SECRET_KEY'] = 's547vn64dfkv84210sd97#68$f20'
app.config['CSRF_ENABLED'] = True

admin = Admin(app)
admin.add_view(ModelView(Task, db_session))
admin.add_view(ModelView(ListTask, db_session))


def json_response(status, data, code=200):
    return jsonify({
        "status": status,
        "data": data
    }), code


@app.route('/')
def tasks():
    tasks = Task.query.all()
    listtasks = ListTask.query.all()
    return render_template("home.html", tasks=tasks, listtasks=listtasks)


@app.route('/api/listtask/add', methods=['GET', 'POST'])
def listtask_add():
    if request.method == 'POST':
        title = request.form['title']
        lt = ListTask()
        lt.title = title
        db_session.add(lt)
        db_session.commit()

        return json_response("ok", lt.as_dict(), 201)


@app.route('/api/listtask/<int:ltid>', methods=['GET', 'POST'])
def listtask(ltid):
    if request.method == 'POST':
        lt = ListTask.query.get(ltid)

        if request.form["priority"]:
            new_priority = int(request.form["priority"])
            if new_priority > 100:
                new_priority = 100
            if new_priority < 0:
                new_priority = 0
            lt.priority = new_priority

        db_session.commit()

        return json_response("ok", lt.as_dict(), 200)
    else:
        return json_response("ok", lt.as_dict(), 200)


@app.route('/api/listtask/<int:ltid>/delete', methods=['GET', 'POST'])
def listtask_delete(ltid):
    if request.method == 'POST':
        lt = ListTask.query.get(ltid)
        if lt:
            db_session.delete(lt)
            db_session.commit()

        return json_response("ok", None, 200)


@app.route('/api/listtask/<int:ltid>/edit', methods=['GET', 'POST'])
def listtask_edit(ltid):
    if request.method == 'POST':
        lt = ListTask.query.get(ltid)

        if request.form["priority"]:
            new_priority = int(request.form["priority"])
            if new_priority > 100:
                new_priority = 100
            if new_priority < 0:
                new_priority = 0
            lt.priority = new_priority

        if request.form["descbody"]:
            lt.description = request.form["descbody"]

        if request.form["title"]:
            lt.title = request.form["title"]
        
        db_session.commit()

        return json_response("ok", lt.as_dict(markup=True), 200)

    if request.method == 'GET':
        lt = ListTask.query.get(ltid)
        return json_response("ok", lt.as_dict(markup=False), 200)



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
        return json_response("ok", task.as_dict())
        # assert False
    else:
        task = Task.query.filter(Task.id == task_id).first()
        return json_response("get", task.as_dict())

@app.teardown_appcontext
def shutdown_session(exception=None):
    db_session.remove()



if __name__ == '__main__':
    app.debug = True
    # app.run(host='0.0.0.0')
    app.run(host='nevihta.d87')