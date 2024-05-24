import { ExtensionContext, window } from 'vscode'
import { Disposable } from '../disposable'
import TypedEventEmitter from '../events'
import { EXTENSION_ID } from '../extension'
import { TaskItem } from './task-data-provider'

interface LocalEventTypes {
    'change': []
}

const storageKey = `${EXTENSION_ID}-favorites`

export class Favorites extends TypedEventEmitter<LocalEventTypes> implements Disposable {

    private context: ExtensionContext

    private items: Set<string> = new Set()

    constructor(context: ExtensionContext) {
        super()

        this.context = context

        this.init()
    }

    private notify(): void {
        this.emit('change')
    }

    private save() {
        const ids: string[] = []
        this.items.forEach(v => ids.push(v))
        this.context.workspaceState.update(storageKey, ids)
    }

    init(): void {
        const items = this.context.workspaceState.get<string[]>(storageKey)
        if (Array.isArray(items)) {
            this.items = new Set(items)
            this.notify()
        }
    }

    dispose(): void {
        this.emitter.removeAllListeners()
        this.save()
    }

    list(): Set<string> {
        return this.items
    }

    add(item: TaskItem): void {
        this.items.add(item.id)
        this.notify()
        this.save()
    }

    remove(item: TaskItem): void {
        const id = item.id.startsWith('favorite') ? item.id.substring(9) : item.id
        if (this.items.delete(id)) {
            this.notify()
            this.save()
        } else {
            window.showWarningMessage(`item with ID "${item.id}" was not in Set!`)
        }
    }

}
