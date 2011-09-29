import subprocess
from subprocess import call
import tempfile
import sys
import datetime
import os
import gridfs
import json
from subprocess import Popen



def convert_request(dbcol, sourceid, conv_req, tempdir):
    """
    returns the conversion doc, and then also potentially advances
    the state machine. 
    
    """

    # find the conversion doc
    query = {'type' : 'conversion',
             'source' : sourceid}
    query.update(conv_req)

    doc = dbcol.find_one(query)

    if doc == None:
        # start the process
        newdoc = query
        newdoc['state'] = 'pending'
        newdoc['start'] = datetime.datetime.utcnow()

        oid = dbcol.insert(newdoc)
        newdoc["_id"] = oid
        conversion_start(dbcol.database, newdoc, tempdir)
        
        return newdoc
    
    else:
        # we found a single doc:
        
        if doc['state'] == 'done':
            return doc

        if doc['state'] == 'pending':
            donestate = conversion_check_done(dbcol.database, doc, tempdir)
            if donestate['done'] == False:
                # not done yet
                return doc
            elif donestate['done'] == True:
                # it's done, yay!
                doc['state'] = 'done'
                if donestate['error'] == None:
                    # success
                    gfs = gridfs.GridFS(dbcol.database)
                    fid = gfs.new_file() # FIX content type?
                    donefilename = donestate['filename']
                    fid.write(file(donefilename, 'r').read())
                    fid.close()
                    doc['error'] = None
                    doc['output'] = fid._id;
                    dbcol.update({"_id": doc['_id']},
                                 doc, safe=True)
                    
                    conversion_cleanup(doc, tempdir)
                else:
                    doc['error'] = donestate['error']
                    dbcol.update({"_id": doc['_id']},
                                 doc, safe=True)
                    conversion_cleanup(doc, tempdir)
                return doc

                

# Conversion process does everything based off of the conversion id,
# creating id.in, id.req, id.result, and id.out

    
def conversion_start(db, reqdoc, tempdir):
    """
    db : db
    reqdoc : conversion document
    tempdir : where shit is goin' 
    """
    src_id = reqdoc['source']
    conv_id = reqdoc['_id']

    # write the source filename
    gfs = gridfs.GridFS(db)
    fid = gfs.get(src_id)

    img_filename = os.path.join(tempdir, str(conv_id) + ".in")
    f = file(img_filename, 'w')
    f.write(fid.read())
    f.close()

    # write the request doc
    req_filename = os.path.join(tempdir, str(conv_id) + ".req")

    req_dict = {}
    for k, v in reqdoc.iteritems():
        if k == 'start':
            pass
        elif (k != '_id') and (k != 'source'):
            req_dict[k] = v
        
    f = file(req_filename, 'w')

    json.dump(req_dict, f)
    f.close()

    result_filename = os.path.join(tempdir, str(conv_id) + ".result")
    out_filename = os.path.join(tempdir, str(conv_id) + ".out")

    run_convert(img_filename, req_filename, result_filename, out_filename)
        
    

def conversion_check_done(dbcol, reqdoc, tempdir):
    """
    dbcol : db collection
    oid : document id of this conversion
    tempdir : where shit is goin' 

    returns:
       {'done' : True/false
       'error' : None / yes
       'filename' : output filename,
       'donedate' : last modified date on file 
       }
    """

    conv_id = str(reqdoc['_id'])
    result_filename = os.path.join(tempdir, str(conv_id) + ".result")
    out_filename = os.path.join(tempdir, str(conv_id) + ".out")
    
    if os.path.exists(result_filename):
        # done!
        res = {'done' : True,
               'error' : None}
        rd = json.load(file(result_filename, 'r'))
        if rd['status'] == 'error':
            res['error'] = {'stdout' : rd.get('stdout', ""),
                           'retcode' : rd.get('retcode', -1),
                           'reason' : rd.get('reason', "")}
        else:
            res['filename'] = out_filename
            res['donedate'] = os.path.getmtime(out_filename)
        
        return res
        
    else:
        return {'done' : False}
    
def conversion_cleanup(reqdoc, tempdir):
    """
    Clean up any of the conversion detritus
    """
    id = str(reqdoc['_id'])
    base =  os.path.join(tempdir, str(id))
    for ext in ['in', 'req', 'result', 'out']:
        try:
            os.remove(base + "." + ext)
        except:
            pass

def run_convert(img_filename, req_filename, result_filename, out_filename):
    """
    Actually perform the spawn, and then just leave it to do its thing


    """
    
    p = Popen(["python", "-m", "app.figure_convert_runner",
               img_filename, req_filename, result_filename, out_filename])

    
