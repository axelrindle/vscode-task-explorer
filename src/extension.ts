import { AwilixContainer, asClass, asValue, createContainer } from 'awilix'
import { ExtensionContext, tasks } from 'vscode'
import { TaskExplorerApi } from './api'
import registerCommands from './commands'
import Config from './services/config'
import { Favorites } from './services/favorites'
import TaskDataProvider from './services/task-data-provider'
import TaskProviderShell, { TASK_TYPE_SHELL } from './provider/task-provider-shell'

interface Services {
    context: ExtensionContext
    api: TaskExplorerApi
    config: Config
    favorites: Favorites
    taskDataProvider: TaskDataProvider
    taskProviderShell: TaskProviderShell

    registerCommands: () => void
}

export type Container = AwilixContainer<Services>

export const EXTENSION_ID = 'task-explorer'

export async function activate(context: ExtensionContext): Promise<TaskExplorerApi> {
    const {
        subscriptions,
    } = context


    const ioc = createContainer<Services>({
        strict: true,
        injectionMode: 'CLASSIC',
    })

    ioc.register({
        context: asValue(context),
        api: asClass(TaskExplorerApi),

        config: asClass(Config).singleton(),
        favorites: asClass(Favorites).singleton(),
        taskDataProvider: asClass(TaskDataProvider).singleton(),

        taskProviderShell: asClass(TaskProviderShell).singleton(),
    })

    subscriptions.push(ioc)


    init(ioc)


    // NOTE: TaskDataProvider#refresh() is called automagically by resolving the
    //       api component below, which itself requires the TaskDataProvider. Thus
    //       the TaskDataProvider will be resolved and initialized.


    return ioc.resolve('api')
}

function init(ioc: Container) {
    const config = ioc.resolve('config')
    if (config.get('scanShell')) {
        tasks.registerTaskProvider(TASK_TYPE_SHELL, ioc.resolve('taskProviderShell'))
    }

    registerCommands(ioc)
}

export function deactivate() { }
