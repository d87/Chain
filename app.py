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
from flask_admin import Admin, BaseView, expose
# from flask_admin.contrib.sqla import ModelView
from flask_admin.contrib.mongoengine import ModelView
from tasks import app as celery_app

import types
from flask_restful import Resource, Api
from flask_restful import fields, marshal_with, marshal_with_field
from flask_mongoengine import MongoEngine


from keys import TELEGRAM_BOT_URL
# from keys import SECRET_KEY

import json


app = Flask(__name__)

api = Api(app)

assets = json.load(open(app.root_path+"/build/asset-manifest.json"))

app.config['SQLALCHEMY_DATABASE_URI'] = "mysql://django@localhost/whiplash"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# app.config['SQLALCHEMY_DATABASE_URI'] = "sqlite:////tmp/test.db"
app.config['SECRET_KEY'] = "change-that"
app.config['CSRF_ENABLED'] = True
app.config['DEBUG'] = True
app.config['MONGODB_HOST'] = 'mongodb://localhost/whiplash'
app.config['MONGODB_PORT'] = 27017
# app.config['MONGODB_USERNAME'] = 'username'
# app.config['MONGODB_PASSWORD'] = 'password'

# import logging
# from logging import getLogger
# file_handler = logging.FileHandler(filename="app.log")
# file_handler.setLevel(logging.WARNING)
# app.logger.addHandler(file_handler)
# getLogger('sqlalchemy').addHandler(file_handler)

db = MongoEngine()
db.init_app(app)

# db = SQLAlchemy(app)



class Todo(db.Document):
    title = db.StringField(required=True, max_length=100)
    description = db.StringField(default=u"")
    priority = db.IntField(default=50)
    state = db.StringField(max_length=20, default=u"ACTIVE")
    color = db.StringField(max_length=8, default=u"")

    created_date = db.DateTimeField(default = datetime.utcnow())
    is_time_limited = db.BooleanField(default = False)
    expiration_date = db.DateTimeField(default = datetime.utcnow())

    # <Todo>.to_json(sort_keys=True, indent=4)

    def __repr__(self):
        return '<ListTask %r>' % (self.title)

    def merge_form(self, form):
        if form["priority"]:
            new_priority = int(float(form["priority"]))
            new_priority = min(new_priority, 100)
            new_priority = max(new_priority, 0)
            self.priority = new_priority

        if form["descbody"]:
            self.description = form["descbody"]

        if form["title"]:
            self.title = form["title"]

        if form["color"]:
            self.color = form["color"] or ""


class ScheduleTask(db.Document):
    title = db.StringField(required=True, max_length=120)
    task_start_time = db.IntField(default=0)
    task_length = db.IntField(default=3600)
    task_time = db.IntField(default=0)
    task_state = db.StringField(max_length=20, default = u"INACTIVE")

    pomo_time = db.IntField(default=0)
    pomo_length = db.IntField(default=25*60)
    pomo_break_length = db.IntField(default=5*60)
    pomo_completed = db.IntField(default=0)
    pomo_state = db.StringField(max_length=20, default = u"INACTIVE")

    color = db.StringField(max_length=8, default=u"")

    def __repr__(self):
        progress = int((float(self.task_time)/self.task_length)*100)
        return '<ScheduleTask %r - %d%%>' % (self.title, progress)

    def reset(self):
        self.task_time = 0
        self.task_state = "INACTIVE"
        self.pomo_time = 0
        self.pomo_state = "INACTIVE"
        self.pomo_completed = 0

    def add_time(self, v):
        self.task_time += v
        if self.task_time >= self.task_length:
            self.task_time = self.task_length
            self.task_state = "COMPLETED"


# decorator for flask-restful
def api_route(self, *args, **kwargs):
    def wrapper(cls):
        self.add_resource(cls, *args, **kwargs)
        return cls
    return wrapper

api.route = types.MethodType(api_route, api)



def statusWrap(data):
    return {
        'status': fields.String,
        'data': fields.Nested(data)
    }

def jsend(status, data=None, error_msg=None):
    r = {
        "status": status,
        "data": data
    }
    if error_msg:
        r["message"] = error_msg
    return r



todo_fields = statusWrap({
    'id': fields.String,
    'title': fields.String,
    'description': fields.String,
    'priority': fields.Integer,
    'state': fields.String,
    'color': fields.String,
    
    'created_date': fields.DateTime(dt_format='iso8601'),
    'is_time_limited': fields.Boolean,
    'expiration_date': fields.DateTime(dt_format='iso8601')
})
# todo_list_fields = statusWrap({
    # fields.List(fields.Nested(todo_fields)),
# })


@api.route('/api/todos/<string:todo_id>')
class TodoAPI(Resource):
    @marshal_with(todo_fields)
    def get(self, todo_id):
        todo = Todo.objects.get(id=todo_id)
        return jsend("success", todo)

    @marshal_with(todo_fields)
    def put(self, todo_id):
        todo = Todo.objects.get(id=todo_id)
        todo.merge_form(request.form)
        todo.save()
        return jsend("success", todo)

    def delete(self, todo_id):
        todo = Todo.objects.get(id=todo_id)
        if todo:
            todo.delete()

        return jsend("success")

@api.route('/api/todos')
class TodoRootAPI(Resource):
    @marshal_with(todo_fields)
    def get(self):
        todos = list(Todo.objects.all())
        # flask-restful doesn't marshal on querysets apparently
        return jsend("success", todos)

    @marshal_with(todo_fields)
    def post(self):
        todo = Todo()
        todo.merge_form(request.form)
        todo.save()
        return jsend("success", todo)




schedule_fields = statusWrap({
    'id': fields.String,
    'title': fields.String,
    'task_start_time': fields.Integer,
    'task_length': fields.Integer,
    'task_time': fields.Integer,
    'task_state': fields.String,

    'pomo_time': fields.Integer,
    'pomo_length': fields.Integer,
    'pomo_break_length': fields.Integer,
    'pomo_completed': fields.Integer,
    'pomo_state': fields.String,

    'color': fields.String,
})

@api.route('/api/schedule_tasks/<string:task_id>')
class ScheduleTaskAPI(Resource):
    @marshal_with(schedule_fields)
    def get(self, task_id):
        task = ScheduleTask.objects.get(id=task_id)
        return jsend("success", task)


@api.route('/api/schedule_tasks')
class ScheduleTaskRootAPI(Resource):
    @marshal_with(schedule_fields)
    def get(self):
        tasks = list(ScheduleTask.objects.all())
        return jsend("success", tasks)


@api.route('/api/schedule_tasks/<string:task_id>/sync')
class ScheduleTaskSyncCommand(Resource):
    @marshal_with(schedule_fields)
    def post(self, task_id):
        new_time = int(request.form['new_time'])

        task = ScheduleTask.objects.get(id=task_id)

        task.task_time = new_time
        if task.task_time >= task.task_length:
            task.task_time = task.task_length
            task.task_state = "COMPLETED"

        task.save()

        return jsend("success", task)


@api.route('/api/schedule_tasks/<string:task_id>/reset')
class ScheduleTaskResetCommand(Resource):
    @marshal_with(schedule_fields)
    def post(self, task_id):
        task = ScheduleTask.objects.get(id=task_id)
        task.reset()
        task.save()
        return jsend("success", task)


@api.route('/api/schedule_tasks/<string:task_id>/pomo_complete')
class ScheduleTaskPomoCompleteCommand(Resource):
    @marshal_with(schedule_fields)
    def post(self, task_id):
        task = ScheduleTask.objects.get(id=task_id)
        task.task_time = task.task_time + task.pomo_length
        if task.task_time >= task.task_length:
            task.task_time = task.task_length
            task.task_state = "COMPLETED"

        task.save()
        return jsend("success", task)
    
# class Day(db.Model):
#     __tablename__ = 'days'
#     id = db.Column(db.Integer, primary_key=True)
#     date = db.Column(db.Date)
#     state = db.Column(db.Unicode(15), default=u"MISSED")   #gotta try enums sometime
#     report = db.Column(db.UnicodeText, default=u"")

#     def __repr__(self):
#         return self.date.strftime("%x")

#     def as_dict(self, markup=True):
#         return {
#             "id" : self.id,
#             "date" : self.date.isoformat(),
#             "state" : self.state,
#             "report" : self.report,
#         }



#flask-admin setup

admin = Admin(app)
admin.add_view(ModelView(Todo))
admin.add_view(ModelView(ScheduleTask))
# admin.add_view(ModelView(UserData, db.session))
# admin.add_view(ModelView(Day, db.session))
# admin.add_view(ModelView(JournalEntry, db.session))


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
    todos = Todo.objects.all()
    schedule_tasks = ScheduleTask.objects.all()
    # tasks = Task.query.all()
    # listtasks = ListTask.query.all()
    # today = date.today()
    # d1 = today - timedelta(days=3)
    # d2 = today + timedelta(days=3)
    # days_query = Day.query.filter(Day.date >= d1).filter(Day.date < d2).order_by(Day.date).all()
    # ud = UserData.query.all()[0]

    return render_template("home_react.html",
                    bundle_js=assets["main.js"],
                    bundle_css=assets["main.css"],
                    tasks=schedule_tasks,
                    listtasks=todos,
                    # days=dayrange(d1, d2, query=days_query),
                    # userdata=ud
                    # day_start_date=us
                    )


# @app.route('/api/day/<datestr>/', methods=['GET', 'POST'])
# def day_state(datestr):
#     if request.method == 'POST':
#         date = datetime.strptime(datestr, "%Y-%m-%d").date()
#         day = Day.query.filter(Day.date == date).first()
#         if not day:
#             day = Day()
#             day.date = date
#             db.session.add(day)

#         newstate = request.form['state']
#         day.state = newstate

#         db.session.commit()

#         return json_response("ok", day.as_dict(), 200)


# @app.route('/api/userdata/day_start', methods=['GET', 'POST'])
# def day_start():
#     if request.method == 'POST':
#         datetimestamp = int(float(request.form['day_start_date']))
#         date = datetime.fromtimestamp(datetimestamp)
#         # date = datetime.strptime(datestring, "%Y-%m-%dT%H:%M:%S.%fZ")
#         ud = UserData.query.all()[0]
#         ud.day_start_date = date
#         db.session.commit()

#         return json_response("ok", ud.as_dict(), 200)
#     else:
#         try:
#             ud = UserData.query.all()[0]
#         except IndexError:
#             ud = UserData()
#             ud.day_start_date = datetime.utcnow()
#             db.session.add(ud)
#             db.session.commit()
#         return json_response("ok", ud.as_dict(), 200)


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


# @app.route('/api/tasks/rainmeter', methods=['GET'])
# def tasks_rainmeter():
#     if request.method == 'GET':
#         tasks = Task.query.all()

#         return render_template("rainmeter.html", tasks=tasks )

if __name__ == '__main__':
    app.run(host='0.0.0.0')