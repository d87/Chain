import os
from celery import Celery
from celery.task.schedules import crontab
from celery.decorators import periodic_task
from celery.utils.log import get_task_logger
import urllib

app = Celery('whiplash')

logger = get_task_logger(__name__)

# Using a string here means the worker will not have to
# pickle the object when using Windows.

celeryconfig = {
    "BROKER_URL": 'amqp://',
    "CELERY_RESULT_BACKEND": 'amqp://',
    "CELERY_ACCEPT_CONTENT": ['application/json'],
    "CELERY_TASK_SERIALIZER": 'json',
    "CELERY_RESULT_SERIALIZER": 'json',
    "CELERY_TIMEZONE": 'Asia/Novosibirsk'
}

app.config_from_object(celeryconfig)
# app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)


@periodic_task(run_every=(crontab(minute='*/1')), name="some_task", ignore_result=True)
def some_task():
    print("Hello")

@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))