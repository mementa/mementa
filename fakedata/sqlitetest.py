import sqlite3

conn = sqlite3.connect('/tmp/example5')

c = conn.cursor()

# Create table
c.execute('''create table stocks
(date text, trans text, symbol text,
 qty real, price real)''')

# Insert a row of data
c.execute("""insert into stocks
          values ('2006-01-05','BUY','RHAT',100,35.14)""")

c.execute("""CREATE VIRTUAL TABLE docs USING fts3(title, body);""")

# Save (commit) the changes
conn.commit()

# We can also close the cursor if we are done with it
c.close()


