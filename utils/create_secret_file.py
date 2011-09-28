import sys
import random
import os
import json

outfilename = sys.argv[1]

BYTES = 256

PASSWORDSALT = os.urandom(BYTES)
SECRET_KEY = os.urandom(BYTES)

def convert(x):
    return "".join(["\\x%02x" % ord(y) for y in x])
    
fid = file(outfilename, 'w')

fid.write("PASSWORDSALT = '%s'\n" % convert(PASSWORDSALT))
fid.write("SECRET_KEY = '%s'\n" % convert(SECRET_KEY))
fid.write("DEBUG = False\n")
