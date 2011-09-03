import apsw
import nltk
import nltk.corpus
import time
import numpy as np
import os
import enron


def download():
    
    print nltk.download()

    
def load_gutenberg():
    connection=apsw.Connection("gutenberg.db")
    cursor=connection.cursor()


    cursor.execute("CREATE VIRTUAL TABLE corpus USING fts4(rowid, title, body);")

    paragraphs = []

    for fid in nltk.corpus.gutenberg.fileids():
        raw = nltk.corpus.gutenberg.raw(fid)
        x= raw.split("\n\n")
        paragraphs += x

    for pi, p in enumerate(paragraphs):
        try:
            x = unicode(p)
            cursor.execute("insert into corpus values(?,?,?)", (pi, x[:30], x))        
        except:
            pass


        if pi % 100 == 0:
            print pi

def load_enron():
    """

    Use the enron corpus, roughly 500k messages.

    http://www.cs.cmu.edu/~enron/
    August 21, 2009 Version of dataset: http://www.cs.cmu.edu/~enron/enron_mail_20110402.tgz
    
    """
    connection=apsw.Connection("enron.db")
    cursor=connection.cursor()

    
    cursor.execute("CREATE VIRTUAL TABLE corpus USING fts4(rowid, title, body);")


    enrondir = "/Users/jonas/Downloads/enron_mail_20110402/maildir"

    pi = 0
    
    for dirpath, dirnames, filenames in os.walk(enrondir):
        for filename in filenames:
            try:
                subject, body = enron.parse_file(os.path.join(dirpath, filename))
                
                cursor.execute("insert into corpus values(?,?,?)", (pi, subject, body))
            except:
                pass
                
            if pi % 100 == 0:
                print pi
            pi += 1


def countintegers(*args):
    "a scalar function"
    
    return len(args[0].split(" "))




def querytest(dbname, QUERYN, queries):
    connection=apsw.Connection(dbname)
    connection.createscalarfunction("countintegers", countintegers)
    
    cursor=connection.cursor()
    res = {}
    
    for q in queries:
        resultsizes = []
        t1 = time.time()
        for i in range(QUERYN):
            results = 0
            for d in cursor.execute(q):
                results += 1
            resultsizes.append(results)
        t2 = time.time()
        res[q] = t2-t1
    return res




def search():
    q = 'the'
    MAXN = 10
    qstr = "select rowid from corpus where body match '%s' LIMIT %d" % (q, MAXN)

    print querytest('gutenberg.db', 1000, [qstr])
    
    ## qstr = """SELECT rowid FROM corpus
    ## WHERE body MATCH 'the'
    ## ORDER BY countintegers(offsets(corpus)) DESC
    ## LIMIT 10 OFFSET 0"""

    ## print querytest('gutenberg.db', 10, [qstr])
    
