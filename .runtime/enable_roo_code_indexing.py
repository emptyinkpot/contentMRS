import json
import os
import sqlite3

GLOBAL_DB = os.path.join(os.environ['APPDATA'], 'Code', 'User', 'globalStorage', 'state.vscdb')
SETTINGS_JSON = os.path.join(os.environ['APPDATA'], 'Code', 'User', 'settings.json')
WORKSPACE_DB = r'C:\Users\ASUS-KL\AppData\Roaming\Code\User\workspaceStorage\ccda5ebbe9847f4a72023874ddc9adaf\state.vscdb'
WORKSPACE_URI = 'file:///e%3A/My%20Project/ContentMRS'
WORKSPACE_KEY = 'codeIndexWorkspaceEnabled:' + WORKSPACE_URI


def update_global_state():
    con = sqlite3.connect(GLOBAL_DB, timeout=10)
    cur = con.cursor()
    cur.execute("select value from ItemTable where key=?", ('RooVeterinaryInc.roo-cline',))
    row = cur.fetchone()
    state = json.loads(row[0]) if row and row[0] else {}

    state['codebaseIndexEnabled'] = True
    state['codebaseIndexEmbedderProvider'] = 'openai-compatible'
    state['codebaseIndexEmbedderBaseUrl'] = state.get('openAiBaseUrl') or 'https://sub2api.tengokukk.com/v1'
    state['codebaseIndexOpenAiCompatibleBaseUrl'] = state['codebaseIndexEmbedderBaseUrl']
    state['codebaseIndexEmbedderModelId'] = 'text-embedding-3-small'
    state['codebaseIndexOpenAiCompatibleModelDimension'] = 1536
    state['codebaseIndexEmbedderModelDimension'] = 1536
    state['codebaseIndexSearchMinScore'] = 0.4
    state['codebaseIndexSearchMaxResults'] = 50
    state['codeIndexAutoEnableDefault'] = True

    cur.execute(
        "insert or replace into ItemTable(key,value) values(?,?)",
        ('RooVeterinaryInc.roo-cline', json.dumps(state, ensure_ascii=False, separators=(',', ':'))),
    )
    cur.execute(
        "insert or replace into ItemTable(key,value) values(?,?)",
        ('codeIndexAutoEnableDefault', json.dumps(True)),
    )
    con.commit()
    con.close()
    print('global codebaseIndexEnabled =', state['codebaseIndexEnabled'])
    print('global codebaseIndexEmbedderProvider =', state['codebaseIndexEmbedderProvider'])
    print('global codebaseIndexEmbedderModelId =', state['codebaseIndexEmbedderModelId'])


def update_user_settings():
    with open(SETTINGS_JSON, 'r', encoding='utf-8-sig') as handle:
        settings = json.load(handle)

    settings['roo-cline.maximumIndexedFilesForFileSearch'] = 50000
    settings['roo-cline.codeIndex.embeddingBatchSize'] = 60
    settings['roo-cline.codebaseIndexEnabled'] = True
    settings['roo-cline.codebaseIndexEmbedderProvider'] = 'openai-compatible'
    settings['roo-cline.codebaseIndexEmbedderBaseUrl'] = 'https://sub2api.tengokukk.com/v1'
    settings['roo-cline.codebaseIndexOpenAiCompatibleBaseUrl'] = 'https://sub2api.tengokukk.com/v1'
    settings['roo-cline.codebaseIndexEmbedderModelId'] = 'text-embedding-3-small'
    settings['roo-cline.codebaseIndexOpenAiCompatibleModelDimension'] = 1536
    settings['roo-cline.codebaseIndexEmbedderModelDimension'] = 1536
    settings['roo-cline.codebaseIndexSearchMinScore'] = 0.4
    settings['roo-cline.codebaseIndexSearchMaxResults'] = 50
    settings['roo-cline.codeIndexAutoEnableDefault'] = True

    with open(SETTINGS_JSON, 'w', encoding='utf-8') as handle:
        json.dump(settings, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    print('settings codebaseIndexEnabled = true')



def update_workspace_state():
    con = sqlite3.connect(WORKSPACE_DB, timeout=10)
    cur = con.cursor()
    cur.execute(
        "insert or replace into ItemTable(key,value) values(?,?)",
        (WORKSPACE_KEY, json.dumps(True)),
    )
    con.commit()
    con.close()
    print('workspace', WORKSPACE_KEY, '= true')


if __name__ == '__main__':
    update_user_settings()
    update_global_state()
    update_workspace_state()
