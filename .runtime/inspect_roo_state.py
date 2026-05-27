import sqlite3
import os

paths = [
    os.path.join(os.environ['APPDATA'], 'Code', 'User', 'globalStorage', 'state.vscdb'),
    r'C:\Users\ASUS-KL\AppData\Roaming\Code\User\workspaceStorage\ccda5ebbe9847f4a72023874ddc9adaf\state.vscdb',
]

for path in paths:
    print('---', path)
    con = sqlite3.connect(path, timeout=2)
    cur = con.cursor()
    cur.execute("select name from sqlite_master where type='table'")
    print(cur.fetchall())
    try:
        cur.execute("""
            select key, substr(value, 1, 1200)
            from ItemTable
            where key like '%roo%'
               or key like '%codeIndex%'
               or value like '%codebaseIndex%'
               or value like '%codeIndex%'
            limit 80
        """)
        for row in cur.fetchall():
            print(row)
    except Exception as exc:
        print('ERR', exc)
    con.close()
