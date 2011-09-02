from BeautifulSoup import BeautifulSoup          # For processing HTML
import urllib2


entries = [{'title' : "Welcome to Mementa",
            'body' : """
            Mementa is an electronic lab notebook that's designed to make it pleasant to record your scientific and research exploits in a searchable manner"""},
           {'title' : "Rich Text Support",
            'body' : """Mementa supports wysiwyg editing of the underlying entry type, of 'text'. Click on "edit" to see
            """}, 
           {'title' : "Look Ma, LaTeX support",
            'body' : """
            Mementa has first-class support for latex. Simply include your latex expression between two pairs of dollar signs like so: $ $\int_a^b \sin(x) $ $ (but with no space between the $ signs -- click "edit" to see the source). This gives rise to
            $$\int_a^b \sin(x)$$
            """}]



def mathjax():
    """
    Return entries representing the mathjax examples
    """
    
    page = urllib2.urlopen("http://www.mathjax.org/demos/tex-samples/")
    soup = BeautifulSoup(page)

    md = soup.findAll("div", {"class" : "math-header"})

    entries = []
    for d in md:
        title =  d.contents[0]
        ns = d.nextSibling
        body = ns
        entries.append({'title' : title,
                        'body' : body})

    return entries
