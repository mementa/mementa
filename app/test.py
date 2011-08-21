import bson

x = bson.BSON.encode({u'hello' : u"world"})

y = bson.dbref.DBRef("hello", "world")

print "x=", x
print "y=", y
#x['silly'] = "wicket"
del x['hello']

