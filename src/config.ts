import { ExtensionContext, WorkspaceConfiguration, workspace } from 'vscode'
import TypedEventEmitter, { EventTypes } from './events'
import { EXTENSION_ID } from './extension'

export interface ConfigSchema {
    excludeGroups: string[]
}

type ConfigKey = keyof ConfigSchema

interface LocalEventTypes {
    'change': []
}

export default class Config extends TypedEventEmitter<LocalEventTypes> {

    private delegate: WorkspaceConfiguration

    constructor({
        subscriptions
    }: ExtensionContext) {
        super()

        this.delegate = workspace.getConfiguration(EXTENSION_ID)

        // listen for config changes
        subscriptions.push(
            workspace.onDidChangeConfiguration(e => {
                if (!e.affectsConfiguration(EXTENSION_ID)) {
                    return
                }

                this.delegate = workspace.getConfiguration(EXTENSION_ID)

                this.emit('change')
            })
        )
    }

    dispose(): void {
        this.emitter.removeAllListeners()
    }

    has(key: ConfigKey): boolean {
        return this.delegate.has(key)
    }

    get<T extends ConfigKey>(key: ConfigKey): ConfigSchema[T] | undefined {
        return this.delegate.get<ConfigSchema[T]>(key)
    }

}
