#!/usr/bin/python
import sys
import os
import json
import time
import shlex
from subprocess import Popen, STDOUT, PIPE
import traceback

TIMEOUT = 10

img_filename = sys.argv[1]
req_filename = sys.argv[2]
result_filename = sys.argv[3]
out_filename = sys.argv[4]

try:
    req = json.load(file(req_filename, 'r'))
    outformat = req['outputformat']
    action = []
    if 'max' in req:
        action +=  ["-resize",  "%sx%s" % (str(req['max'].get("width", "")),
                                           str(req['max'].get("height", "")))]


    input = [img_filename]
    output = ['%s:%s' % (outformat, out_filename)]

    p = Popen(['convert'] + input + action + output, stdout=PIPE)
    t = time.time()

    while ( (time.time() - t)  <  TIMEOUT) :
        if p.poll() == None:
            time.sleep(0.5)
        else:
            retcode = p.poll()
            data = p.communicate()[0]
            resp = {'stdout' : data,
                    'retcode' : retcode}
            if retcode == 0:
                resp['status'] = 'success'
            else:
                resp['status'] = 'error'
                resp['reason'] = 'retcode'


            json.dump(resp, file(result_filename, 'w'))
            sys.exit(0)

    # timed out
    p.kill()

    resp = {'status' : error,
           'reason' : "timeout"}


except SystemExit:
    pass

except:
    # we should never really get here, so this is a catch-all
    resp = {'status' : 'error',
            'reason' : 'unexpected, exception thrown: %s' % traceback.format_exc()}

json.dump(resp, file(result_filename, 'w'))







