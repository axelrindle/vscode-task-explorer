import { commands } from 'vscode'
import { Container, EXTENSION_ID } from './extension'
import { TaskItem } from './services/task-data-provider'

export default function registerCommands(ioc: Container) {
    const context = ioc.resolve('context')
    const taskDataProvider = ioc.resolve('taskDataProvider')
    const favorites = ioc.resolve('favorites')

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
            (item: TaskItem) => favorites.add(item)
        ),
        commands.registerCommand(
            `${EXTENSION_ID}.unfavorite-task`,
            (item: TaskItem) => favorites.remove(item)
        ),
    )
}
