from sqlalchemy import Column, Integer, String, DateTime, Time, Boolean, Unicode, UnicodeText
from flask import jsonify
from database import Base
import datetime

from markdown import markdown
from flask import Markup


# class User(Base):
#     __tablename__ = 'users'
#     id = Column(Integer, primary_key=True)
#     name = Column(String(50), unique=True)
#     email = Column(String(120), unique=True)

#     # def __init__(self, name=None, email=None):
#     #     self.name = name
#     #     self.email = email


#     def __repr__(self):
#         return '<User %r>' % (self.name)


class ListTask(Base):
    __tablename__ = 'listtasks'
    id = Column(Integer, primary_key=True)
    title = Column(Unicode(100))
    description = Column(UnicodeText, default=u"")
    priority = Column(Integer, default = 50)
    state = Column(Unicode(10), default = u"ACTIVE")

    created_date = Column(DateTime, default=datetime.datetime.now())
    is_time_limited = Column(Boolean, default = False)
    expiration_date = Column(DateTime, default=datetime.datetime.now())

    use_markup = Column(Boolean, default = False)

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



class Task(Base):
    __tablename__ = 'tasks'
    id = Column(Integer, primary_key=True)
    title = Column(Unicode(120))
    task_start_time = Column(Time,default=datetime.time(0))
    task_length = Column(Integer)
    task_time = Column(Integer,default=0)
    task_state = Column(Unicode(12), default=u"INACTIVE")
    pomo_time = Column(Integer,default=0)
    pomo_length = Column(Integer, default=25*60)
    pomo_break_length = Column(Integer, default=5*60)
    pomo_completed = Column(Integer, default=0)
    pomo_state = Column(Unicode(12), default=u"INACTIVE")
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