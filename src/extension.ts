import { AwilixContainer, asClass, asValue, createContainer } from 'awilix'
import { ExtensionContext } from 'vscode'
import { TaskExplorerApi } from './api'
import registerCommands from './commands'
import Config from './services/config'
import { Favorites } from './services/favorites'
import TaskDataProvider from './services/task-data-provider'

interface Services {
    context: ExtensionContext
    api: TaskExplorerApi
    config: Config
    favorites: Favorites
    taskDataProvider: TaskDataProvider

    registerCommands: () => void
}

export type Container = AwilixContainer<Services>

export const EXTENSION_ID = 'task-explorer'

export async function activate(context: ExtensionContext): Promise<TaskExplorerApi> {
    const {
        subscriptions,
    } = context


    // init service container
    const ioc = createContainer<Services>({
        strict: true,
        injectionMode: 'CLASSIC',
    })

    ioc.register({
        context: asValue(context),
        api: asClass(TaskExplorerApi),

        config: asClass(Config),
        favorites: asClass(Favorites),
        taskDataProvider: asClass(TaskDataProvider),
    })

    subscriptions.push(ioc)


    // register commands
    registerCommands(ioc)


    // api
    return ioc.resolve('api')
}

export function deactivate() { }
