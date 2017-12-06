Creating migrations
===================
1) Make changes to models
2) PYTHONPATH=. alembic revision --autogenerate -m "Message"
3) PYTHONPATH=. alembic upgrade +1
