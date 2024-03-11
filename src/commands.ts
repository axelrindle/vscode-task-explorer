import { commands, window } from 'vscode'
import { Container, EXTENSION_ID } from './extension'

export default function registerCommands(ioc: Container) {
    const context = ioc.resolve('context')
    const taskDataProvider = ioc.resolve('taskDataProvider')

    const {
        subscriptions,
    } = context

    subscriptions.push(
        commands.registerCommand(
            `${EXTENSION_ID}.refresh-tasks`,
            async () => await taskDataProvider.refresh()
        ),
        commands.registerCommand(
            `${EXTENSION_ID}.favorite-task`,
            () => window.showInformationMessage('Favoriting tasks in currently work-in-progress.')
        ),
        commands.registerCommand(
            `${EXTENSION_ID}.unfavorite-task`,
            () => window.showInformationMessage('Favoriting tasks in currently work-in-progress.')
        ),
    )
}
