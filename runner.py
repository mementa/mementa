import sys

from mementa import app

app.config.from_pyfile(sys.argv[1])

app.run(debug=True)
