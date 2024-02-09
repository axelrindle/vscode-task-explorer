import { ExtensionContext, commands, window } from 'vscode'
import Config from './config'
import TaskDataProvider, { TaskItem } from './task-data-provider'

export interface TaskExplorerApi {
    getTasks(): TaskItem[]
    refresh(): Promise<void>
}

export const EXTENSION_ID = 'task-explorer'

export async function activate(context: ExtensionContext): Promise<TaskExplorerApi> {
    const {
        subscriptions,
    } = context

    const config = new Config(context)
    const treeProvider = new TaskDataProvider(config)

    subscriptions.push(
        config,
        window.registerTreeDataProvider(EXTENSION_ID, treeProvider),
    )


    //#region Commands
    subscriptions.push(commands.registerCommand(
        `${EXTENSION_ID}.refresh-tasks`,
        async () => await treeProvider.refresh()
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


    // api
    return {
        refresh: () => treeProvider.refresh(),
        getTasks: () => treeProvider.getTasks(),
    }
}

export function deactivate() { }
