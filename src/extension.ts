import { ExtensionContext, commands, window } from 'vscode'
import Config from './config'
import TaskDataProvider from './task-data-provider'

export const EXTENSION_ID = 'task-explorer'

export async function activate(context: ExtensionContext) {
    const {
        subscriptions,
    } = context

    const config = new Config(context)
    subscriptions.push(config)

    const provider = new TaskDataProvider(config)
    window.registerTreeDataProvider(EXTENSION_ID, provider)

    //#region Commands
    subscriptions.push(commands.registerCommand(
        `${EXTENSION_ID}.refresh-tasks`,
        async () => await provider.refresh()
    ))

    subscriptions.push(commands.registerCommand(
        `${EXTENSION_ID}.favorite-task`,
        () => window.showInformationMessage('Favoriting tasks in currently work-in-progress.')
    ))

    subscriptions.push(commands.registerCommand(
        `${EXTENSION_ID}.unfavorite-task`,
        () => window.showInformationMessage('Favoriting tasks in currently work-in-progress.')
    ))
    //#endregion
}

export function deactivate() { }
