import time as timelib
import urllib
from flask import Flask
from flask import render_template
from flask import jsonify
from flask import request
from flask import Response
# from database import db.session
from flask_sqlalchemy import SQLAlchemy
from datetime import date, datetime, timedelta, time
from flask_admin import Admin, BaseView, expose #flask-admin
from flask_admin.contrib.sqla import ModelView
from tasks import app as celery_app

from keys import TELEGRAM_BOT_URL
# from keys import SECRET_KEY

import json


app = Flask(__name__)

assets = json.load(open(app.root_path+"/build/asset-manifest.json"))

app.config['SQLALCHEMY_DATABASE_URI'] = "mysql://django@localhost/whiplash"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"
app.config['SECRET_KEY'] = "change-that"
app.config['CSRF_ENABLED'] = True
app.config['DEBUG'] = True



# import logging
# from logging import getLogger
# file_handler = logging.FileHandler(filename="app.log")
# file_handler.setLevel(logging.WARNING)
# app.logger.addHandler(file_handler)
# getLogger('sqlalchemy').addHandler(file_handler)

db = SQLAlchemy(app)

#------------------------
# Models
#------------------------
from markdown import markdown
from flask import Markup

class UserData(db.Model):
    __tablename__ = 'userdata'
    id = db.Column(db.Integer, primary_key=True)
    day_start_date = db.Column(db.DateTime)
    water_level = db.Column(db.Float, default=0)

    def __repr__(self):
        return self.date.strftime("%x")

    def as_dict(self, markup=True):
        return {
            "id" : self.id,
            "day_start_date" :  self.day_start_date.strftime("%s"),
            "water_level" : self.water_level
        }

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
    color = db.Column(db.Unicode(8), default = u"")

    created_date = db.Column(db.DateTime, default=datetime.utcnow())
    is_time_limited = db.Column(db.Boolean, default = False)
    expiration_date = db.Column(db.DateTime, default=datetime.utcnow())

    use_markup = db.Column(db.Boolean, default = False)

    @property
    def description_markdown(self):
        return Markup(markdown(self.description, extensions=['markdown.extensions.tables']))

    def __repr__(self):
        return '<ListTask %r>' % (self.title)

    def as_dict(self, markup=True):
        obj = {
            "id" : self.id,
            "title" : self.title,
            "description" : self.description_markdown,
            "description_raw" : self.description,
            "priority" : self.priority,
            "state" : self.state,
            "color" : self.color,
            "created_date" : self.created_date.isoformat(),
            "is_time_limited" : self.is_time_limited,
            "expiration_date" : self.expiration_date.isoformat()
        }
        if not markup:
            obj["description_body"] = self.description
        return obj


class JournalEntry(db.Model):
    __tablename__ = 'journal'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.Unicode(100))
    text = db.Column(db.UnicodeText, default=u"")
    rating = db.Column(db.Integer, default=5)

    created_date = db.Column(db.DateTime, default=datetime.utcnow())
    edited_date = db.Column(db.DateTime)

    def __repr__(self):
        return '<JournalEntry %r>' % (self.text[:10])

    def as_dict(self):
        return {
            "id" : self.id,
            "text" : self.text,
            "rating" : self.rating,
            "created_date" : self.created_date.isoformat(),
            "edited_date" : self.created_date.isoformat(),
        }



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
    color = db.Column(db.Unicode(7), default=u"#33bb33")
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
            "pomo_break_length": self.pomo_break_length,
            "color": self.color
        }
        return resp

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

    def __init__(self, title="No Title", duration=5):
        self.title = title
        self.task_length = duration*60


    def __repr__(self):
        progress = int((float(self.task_time)/self.task_length)*100)
        return '<Task %r - %d%%>' % (self.title, progress)



#flask-admin setup

admin = Admin(app)
admin.add_view(ModelView(UserData, db.session))
admin.add_view(ModelView(Task, db.session))
admin.add_view(ModelView(ListTask, db.session))
admin.add_view(ModelView(Day, db.session))
admin.add_view(ModelView(JournalEntry, db.session))


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
    ud = UserData.query.all()[0]

    return render_template("home_react.html",
                    bundle_js=assets["main.js"],
                    bundle_css=assets["main.css"],
                    tasks=tasks,
                    listtasks=listtasks,
                    days=dayrange(d1, d2, query=days_query),
                    userdata=ud
                    # day_start_date=us
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


@app.route('/api/userdata/day_start', methods=['GET', 'POST'])
def day_start():
    if request.method == 'POST':
        datetimestamp = int(float(request.form['day_start_date']))
        date = datetime.fromtimestamp(datetimestamp)
        # date = datetime.strptime(datestring, "%Y-%m-%dT%H:%M:%S.%fZ")
        ud = UserData.query.all()[0]
        ud.day_start_date = date
        db.session.commit()

        return json_response("ok", ud.as_dict(), 200)
    else:
        try:
            ud = UserData.query.all()[0]
        except IndexError:
            ud = UserData()
            ud.day_start_date = datetime.utcnow()
            db.session.add(ud)
            db.session.commit()
        return json_response("ok", ud.as_dict(), 200)

@app.route('/api/userdata/water_level', methods=['GET', 'POST'])
def water_level():
    if request.method == 'POST':
        newwater = float(request.form['water_level'])
        ud = UserData.query.all()[0]
        ud.water_level = newwater
        db.session.commit()

        return json_response("ok", ud.as_dict(), 200)
    else:
        try:
            ud = UserData.query.all()[0]
        except IndexError:
            ud = UserData()
            ud.day_start_date = datetime.utcnow()
            db.session.add(ud)
            db.session.commit()
        return json_response("ok", ud.as_dict(), 200)



@app.route('/api/listtask/list', methods=['GET'])
def listtask_list():
    if request.method == 'GET':
        ltasks = ListTask.query.all()
        ltasks_dict = [ x.as_dict() for x in reversed(ltasks) ]

        return json_response("ok", ltasks_dict, 201)


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


# @app.route('/api/listtask/add', methods=['GET', 'POST'])
# def listtask_add():
#     if request.method == 'POST':
#         title = request.form['title']
#         lt = ListTask()
#         lt.title = title
#         db.session.add(lt)
#         db.session.commit()

#         return json_response("ok", lt.as_dict(), 201)

@app.route('/api/listtask/add', methods=['GET', 'POST'])
@app.route('/api/listtask/<int:ltid>/edit', methods=['GET', 'POST'])
def listtask_edit(ltid=None):
    if request.method == 'POST':
        if ltid == None: #when adding
            lt = ListTask()
        else:
            lt = ListTask.query.get(ltid)

        if request.form["priority"]:
            new_priority = int(request.form["priority"])
            new_priority = min(new_priority, 100)
            new_priority = max(new_priority, 0)
            lt.priority = new_priority

        if request.form["descbody"]:
            lt.description = request.form["descbody"]

        if request.form["title"]:
            lt.title = request.form["title"]

        if request.form["color"]:
            lt.color = request.form["color"] or ""

        if ltid == None:
            db.session.add(lt)

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

import pika

def event_stream():
    # pubsub = red.pubsub()
    # pubsub.subscribe('chat')
    # for message in pubsub.listen():
        # print message
    channel.queue_declare(queue='Q1')

    

    for method, properties, body in channel.consume('Q1'):
        # print body
        channel.basic_ack(method.delivery_tag)

        # method, properties, body
        # r = channel.consume(queue='Q1')
        # body="asdf"
        # channel.basic_ack()

        print("received message:", body)
        yield 'data: %s\n\n' % body

@app.route('/stream')
def stream():
    return Response(event_stream(),
                          mimetype="text/event-stream")


MBOX = {}
LastPollTable = {}

@app.route('/post', methods=['POST'])
def post():
    # for sid,queue in MBOX.items():
        # queue.append("event5123")

    connection = pika.BlockingConnection(pika.ConnectionParameters(
        host='localhost'))
    channel = connection.channel()
    channel.exchange_declare(exchange='events', type='fanout')

    print(request.form['event'])
    data = request.form['data']
    if request.form['event']:
        message = "{0}:{1}".format(request.form['event'], data)
    else:
        message = "{0}".format(data)

    channel.basic_publish(exchange='events',
                      routing_key='',
                      body=message)

    connection.close()

    return "OK", 200


@app.route("/notify", methods=['POST'])
def notify():
    notification_text = request.form['body']

    api_call_params = {
        'chat_id': 92475549,
        'text': notification_text
    }

    params = urllib.urlencode(api_call_params)
    urllib.urlopen(TELEGRAM_BOT_URL,  params.encode('utf-8'))
    return "OK", 200


@app.route('/api/events', methods=['GET', 'POST'])
def events():
    sessionID = request.form["sessionID"]
    if not sessionID in MBOX:
        MBOX[sessionID] = []
        now = timelib.time()
        LastPollTable[sessionID] = now
        # print(MBOX)

        #cleanup here too
        for sid in MBOX.keys():
            if now > LastPollTable[sid] + 180:
                del MBOX[sid]
                del LastPollTable[sid]

    while len(MBOX[sessionID]) > 0:
        event = MBOX[sessionID].pop(0)
        return "{ status: 'OK', event: %s }" % event, 200

    return "{ status: 'OK' }", 200


@app.route('/api/journal/list', methods=['GET'])
def journal_entry_list():
    if request.method == 'GET':
        posts = JournalEntry.query.all()
        posts_dict = [ x.as_dict() for x in reversed(posts) ]

        return json_response("ok", posts_dict, 201)

@app.route('/api/journal/add', methods=['GET', 'POST'])
def journal_entry_add():
    if request.method == 'POST':
        post = JournalEntry()
        text = request.form['text']
        if text:
            post.text = text
            db.session.add(post)
            db.session.commit()

            return json_response("ok", post.as_dict(), 201)


@app.route('/api/journal/<int:postID>/update', methods=['POST'])
def journal_entry_update(postID):
    if request.method == 'POST':
        post = JournalEntry.query.filter(JournalEntry.id == postID).first()
        text = request.form['text']
        if post and text:
            post.text = text
            db.session.commit()
            
            return "{ status: 'OK' }", 200


@app.route('/api/journal/<int:postID>/delete', methods=['GET', 'POST'])
def journal_entry_delete(postID):
    if request.method == 'POST':
        post = JournalEntry.query.filter(JournalEntry.id == postID).first()
        if post:
            db.session.delete(post)
            db.session.commit()

            return json_response("ok", None, 200)



@app.route('/journal', methods=['GET', 'POST'])
def journal():
    return render_template("journal.html")




@app.route('/api/tasks/list', methods=['GET'])
def tasks_api_list():
    if request.method == 'GET':
        tasks = Task.query.all()
        tasks_dict = [ x.as_dict() for x in reversed(tasks) ]

        return json_response("ok", tasks_dict, 201)

@app.route('/api/task/<int:task_id>/sync', methods=['POST'])
def tasks_api_sync(task_id):
    if request.method == 'POST':
        new_time = int(request.form['new_time'])

        task = Task.query.filter(Task.id == task_id).first()

        task.task_time = new_time
        if task.task_time >= task.task_length:
            task.task_time = task.task_length
            task.task_state = "COMPLETED"

        db.session.commit()
        return json_response("ok", task.as_dict())

@app.route('/api/task/<int:task_id>/pomo_complete', methods=['POST'])
def tasks_api_pomo_complete(task_id):
    if request.method == 'POST':
        task = Task.query.filter(Task.id == task_id).first()
        task.task_time = task.task_time + task.pomo_length
        if task.task_time >= task.task_length:
            task.task_time = task.task_length
            task.task_state = "COMPLETED"

        db.session.commit()
        return json_response("ok", task.as_dict())

@app.route('/api/task/<int:task_id>/reset', methods=['POST'])
def tasks_api_reset(task_id):
    if request.method == 'POST':
        task = Task.query.filter(Task.id == task_id).first()
        task.reset()
        db.session.commit()
        return json_response("ok", task.as_dict())

@app.route('/api/tasks/rainmeter', methods=['GET'])
def tasks_rainmeter():
    if request.method == 'GET':
        tasks = Task.query.all()

        return render_template("rainmeter.html", tasks=tasks )

if __name__ == '__main__':
    app.run(host='0.0.0.0')