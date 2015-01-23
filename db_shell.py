import os

pythonstartup = os.environ['PYTHONSTARTUP']

if os.path.isfile(pythonstartup):
    execfile(pythonstartup)

import os

if os.path.isfile('database.py'):
    execfile('database.py')

if os.path.isfile('models.py'):
	execfile('models.py')
