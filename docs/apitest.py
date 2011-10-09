import urllib2

MEMENTAURL  = "127.0.0.1:5000"

USERNAME = "eric"
APIKEY = ""

APICALL = "/api/notebookadmin"


# create a password manager
password_mgr = urllib2.HTTPPasswordMgrWithDefaultRealm()

# Add the username and password.
# If we knew the realm, we could use it instead of None.
top_level_url = MEMENTAURL

password_mgr.add_password(None, top_level_url, USERNAME, APIKEY)


handler = urllib2.HTTPBasicAuthHandler(password_mgr)

# create "opener" (OpenerDirector instance)
opener = urllib2.build_opener(handler)
opener.addheaders = [("Content-Type", "application/json")]

url = "http://" + MEMENTAURL + APICALL
print "opening", url
response = opener.open(url)

html = response.read()

print html

