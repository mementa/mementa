import BeautifulSoup as bs

from BeautifulSoup import BeautifulSoup          # For processing HTML

import urllib2
import urllib
import simplejson as json

#page = urllib2.urlopen("http://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=Bayes%27_theorem")
import re
from htmlentitydefs import name2codepoint

excluded_titles  = ['See also', 'Notes', 'References', 'Further reading', "External links"]

def htmlentitydecode(s):
    return re.sub('&(%s);' % '|'.join(name2codepoint), 
            lambda m: unichr(name2codepoint[m.group(1)]), s)


def get_page(title):
    title_encoded = urllib.quote_plus(title)
    page = urllib2.urlopen("http://en.wikipedia.org/w/api.php?action=parse&page=%s&format=json" % title_encoded)


    x = page.read()
    y = json.loads(x)

    parse_text =  y['parse']['text']['*']


    soup = BeautifulSoup(parse_text)

    # remove tables
    
    tables = soup.findAll('table')
    [table.extract() for table in tables]

    # remove edit section links
    [es.extract() for es in soup.findAll("span", {'class' : 'editsection'})]
    
    imgs = soup.findAll('img')
    for i in imgs:
        attrdict = dict(i.attrs)
        if 'class' in attrdict and attrdict['class'] == 'tex':
            realtex = htmlentitydecode(attrdict['alt'])
            if i.parent.name == "dd":
                i.replaceWith("$$%s$$" % realtex)
            else:
                i.replaceWith("\(%s\)" % realtex)
            
        else:
            # not the right one
            i.extract()
    
    entries = []

    for s in  soup.findAll('h2'):
        title = s.find("span", {'class': 'mw-headline'})
        if title:
            titles =  title.contents[0]
            if titles.upper() in [x.upper() for x in excluded_titles]:
                print "Excluding", titles
                continue

            
            tags = []
            next = s.nextSibling
            while next:
                if isinstance(next, bs.Tag) and next.name == 'h2':
                    #print "reached end of section", next.contents
                    break
                tags.append(next)
                next = next.nextSibling

                # every image tag we'll replace
            #print tags
            
            body = "".join([str(t) for t in tags])
            r = BeautifulSoup(body)
            print "Creating entry for", titles
            entries.append({'title' : titles,
                            'body' : body,
                            'textonly' : ''.join(soup.findAll(text=True))})

            


    return entries


