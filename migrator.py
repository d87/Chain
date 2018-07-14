import json
import codecs

from app import ListTask, Task

from pymongo import MongoClient
client = MongoClient('mongodb://localhost:27017/')
db = client.whiplash
schedule_tasks = db.schedule_tasks
todos = db.todos


# listtasks = ListTask.query.all()
# ltlist = []

# for lt in listtasks:
#     d = lt.as_dict()
#     # print(type(d["description_raw"]))
#     d["description"] = d["description_raw"] #.replace("\r\n", "\\r\\n")

#     print(d["description"])
#     del d["description_raw"]
#     del d["id"]
#     ltlist.append(d)

# schedule_tasks.insert_many(ltlist)



# tasks = Task.query.all()
# tlist = []

# for t in tasks:
#     d = t.as_dict()
#     time = d["task_start_time"]

#     storedTime = time.hour * 3600 + time.minute * 60 + time.second
#     d["task_start_time"] = storedTime
#     del d["id"]
#     tlist.append(d)
    
# todos.insert_many(tlist)




# def export(pyobj, filename):
#     pretty_json = json.dumps( pyobj, sort_keys=True, indent=4)
#     pj2 = pretty_json.decode("unicode_escape")
#     # pj2 = pj2.encode("string_escape")

#     with codecs.open(filename, "wb", "utf8") as f:
#         f.write(pj2)
    
# export(ltlist, "ListTask.js")
# export(tlist, "Task.js")