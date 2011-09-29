import sys
sys.path.append('/home/dotcloud/current')
from app.mementa import app as application

# read the config data
import json
config = json.load(file('/home/dotcloud/environment.json', 'r'))


application.config['DB_URL'] = config['DOTCLOUD_DATA_MONGODB_URL']
secret_file = config['SECRETS']

application.config.from_pyfile(secret_file)

