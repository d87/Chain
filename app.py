from flask import Flask
from flask import render_template
from flask import jsonify
from flask import request
# from database import db.session
from flask.ext.sqlalchemy import SQLAlchemy
from datetime import date, datetime, timedelta, time
from flask.ext.admin import Admin, BaseView, expose #flask-admin
from flask.ext.admin.contrib.sqla import ModelView

# deps so far:
# dev-python/markdown
# flask-admin
# flask-sqlalchemy
# wtforms
# flask-wtf

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = "mysql://django@localhost/whiplash"
# app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"
app.config['SECRET_KEY'] = 'change-that'
app.config['CSRF_ENABLED'] = True
app.config['DEBUG'] = True

db = SQLAlchemy(app)

#------------------------
# Models
#------------------------
from markdown import markdown
from flask import Markup

class Day(db.Model):
    __tablename__ = 'days'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date)
    state = db.Column(db.Unicode(15), default=u"MISSED")   #gotta try enums sometime
    report = db.Column(db.UnicodeText, default=u"")

    def __repr__(self):
        return self.date.strftime("%x")

    def as_dict(self, markup=True):
        return {
            "id" : self.id,
            "date" : self.date.isoformat(),
            "state" : self.state,
            "report" : self.report,
        }


class ListTask(db.Model):
    __tablename__ = 'listtasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Unicode(100))
    description = db.Column(db.UnicodeText, default=u"")
    priority = db.Column(db.Integer, default = 50)
    state = db.Column(db.Unicode(10), default = u"ACTIVE")

    created_date = db.Column(db.DateTime, default=datetime.now())
    is_time_limited = db.Column(db.Boolean, default = False)
    expiration_date = db.Column(db.DateTime, default=datetime.now())

    use_markup = db.Column(db.Boolean, default = False)

    @property
    def description_markdown(self):
        return Markup(markdown(self.description))

    # def __init__(self, title=None):
    #     self.title = title

    def __repr__(self):
        return '<ListTask %r>' % (self.title)

    def as_dict(self, markup=True):
        obj = {
            "id" : self.id,
            "title" : self.title,
            "description" : self.description_markdown,
            "priority" : self.priority,
            "state" : self.state,
            "created_date" : self.created_date.isoformat(),
            "is_time_limited" : self.is_time_limited,
            "expiration_date" : self.expiration_date.isoformat()
        }
        if not markup:
            obj["description_body"] = self.description
        return obj



class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Unicode(120))
    task_start_time = db.Column(db.Time,default=time(0))
    task_length = db.Column(db.Integer)
    task_time = db.Column(db.Integer,default=0)
    task_state = db.Column(db.Unicode(12), default=u"INACTIVE")
    pomo_time = db.Column(db.Integer,default=0)
    pomo_length = db.Column(db.Integer, default=25*60)
    pomo_break_length = db.Column(db.Integer, default=5*60)
    pomo_completed = db.Column(db.Integer, default=0)
    pomo_state = db.Column(db.Unicode(12), default=u"INACTIVE")
    # mask = x < daynum
    # repeat & mask

    def as_dict(self, cmd=None, params=None):
        resp = {
            "id": self.id,
            "title": self.title,
            "task_start_time": self.task_start_time.isoformat(),
            "task_state": self.task_state,
            "task_length": self.task_length,
            "task_time": self.task_time,
            "pomo_state": self.pomo_state,
            "pomo_time": self.pomo_time,
            "pomo_length": self.pomo_length,
            "pomo_break_length": self.pomo_break_length
        }
        return resp
        # if cmd:
            # resp['cmd'] = cmd
            # if params:
                # resp['params'] = params
        # return jsonify(resp)

    def reset(self):
        self.task_time = 0
        self.task_state = "INACTIVE"
        self.pomo_time = 0
        self.pomo_state = "INACTIVE"
        self.pomo_completed = 0

        # return self.ok_response("reset")

    def add_time(self, v):
        self.task_time += v
        if self.task_time >= self.task_length:
            self.task_time = self.task_length
            self.task_state = "COMPLETED"
            # return self.ok_response("completed")
            
        # return self.ok_response("inc_task_time", v)

    def __init__(self, title="No Title", duration=5):
        self.title = title
        self.task_length = duration*60


    def __repr__(self):
        progress = int((float(self.task_time)/self.task_length)*100)
        return '<Task %r - %d%%>' % (self.title, progress)



#flask-admin setup

admin = Admin(app)
admin.add_view(ModelView(Task, db.session))
admin.add_view(ModelView(ListTask, db.session))
admin.add_view(ModelView(Day, db.session))


#------------------------
# Internal functions
#------------------------

def json_response(status, data, code=200):
    return jsonify({
        "status": status,
        "data": data
    }), code

def dayrange(start, end, query=[], fill_in_blanks=False):
    delta=timedelta(days=1)
    cdate = start
    query_index = 0

    # for day in query:
    #     if day.date == start:
    #         break
    #     query_index +=1

    while cdate < end:
        try:
            day = query[query_index]
        except IndexError:
            day = None

        if day and cdate == day.date:
            yield (cdate, day)
            query_index += 1

        else:
            nday = None
            if fill_in_blanks:
                nday = Day()
                nday.date = cdate
                db.session.add(nday)
            yield (cdate, nday)


        cdate += delta

    if fill_in_blanks:
        db.session.commit()


#------------------------
# Views
#------------------------


@app.route('/')
def tasks():
    tasks = Task.query.all()
    listtasks = ListTask.query.all()
    today = date.today()
    d1 = today - timedelta(days=3)
    d2 = today + timedelta(days=3)
    days_query = Day.query.filter(Day.date >= d1).filter(Day.date < d2).order_by(Day.date).all()

    return render_template("home.html",
                    tasks=tasks,
                    listtasks=listtasks,
                    days=dayrange(d1, d2, query=days_query)
                    )


@app.route('/api/day/<datestr>/', methods=['GET', 'POST'])
def day_state(datestr):
    if request.method == 'POST':
        date = datetime.strptime(datestr, "%Y-%m-%d").date()
        day = Day.query.filter(Day.date == date).first()
        if not day:
            day = Day()
            day.date = date
            db.session.add(day)

        newstate = request.form['state']
        day.state = newstate

        db.session.commit()

        return json_response("ok", day.as_dict(), 200)


@app.route('/api/listtask/add', methods=['GET', 'POST'])
def listtask_add():
    if request.method == 'POST':
        title = request.form['title']
        lt = ListTask()
        lt.title = title
        db.session.add(lt)
        db.session.commit()

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

        db.session.commit()

        return json_response("ok", lt.as_dict(), 200)
    else:
        return json_response("ok", lt.as_dict(), 200)


@app.route('/api/listtask/<int:ltid>/delete', methods=['GET', 'POST'])
def listtask_delete(ltid):
    if request.method == 'POST':
        lt = ListTask.query.get(ltid)
        if lt:
            db.session.delete(lt)
            db.session.commit()

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
        
        db.session.commit()

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


        db.session.commit()
        return json_response("ok", task.as_dict())
        # assert False
    else:
        task = Task.query.filter(Task.id == task_id).first()
        return json_response("get", task.as_dict())


## this is for plain SQLAlchemy
# @app.teardown_appcontext
# def shutdown_session(exception=None):
#     db.session.remove()



if __name__ == '__main__':
    # app.run(host='0.0.0.0')
    app.run(host='nevihta.d87')