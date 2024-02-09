import assert from 'assert'
import { extensions } from 'vscode'
import { EXTENSION_ID, TaskExplorerApi } from '../src/extension'

import { publisher } from '../package.json'

const fullExtensionId = `${publisher}.${EXTENSION_ID}`

suite('General', () => {
    test('Initialization', async () => {
        const _ext = extensions.getExtension(fullExtensionId)
        assert.notStrictEqual(_ext, undefined)

        const ext = _ext!

        const api: TaskExplorerApi = await ext.activate()
        assert.ok(ext.isActive)

        await api.refresh()

        const tasks = api.getTasks()
        assert.equal(tasks.length, 1)

        assert.equal(tasks[0].label, 'echo')

        await api.refresh()
    })
})
