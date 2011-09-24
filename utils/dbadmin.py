


def create_system_db(conn, dbname):
    db = conn[dbname]
    create_system_indices(db)

def add_user(systemdb, username):
    pass


             
