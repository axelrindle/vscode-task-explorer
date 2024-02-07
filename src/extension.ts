import { ExtensionContext, ProgressLocation, commands, window } from "vscode"
import TaskDataProvider from "./task-data-provider"

export function activate(context: ExtensionContext) {
    const provider = new TaskDataProvider()

    window.registerTreeDataProvider('task-explorer', provider)

    context.subscriptions.push(commands.registerCommand(
        'task-explorer.refresh-tasks',
        async () => await provider.refresh()
    ))

    context.subscriptions.push(commands.registerCommand(
        'task-explorer.favorite-task',
        () => { }
    ))

    context.subscriptions.push(commands.registerCommand(
        'task-explorer.unfavorite-task',
        () => { }
    ))
}

export function deactivate() { }
