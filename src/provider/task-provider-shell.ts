import { basename } from 'path'
import { CancellationToken, ExtensionContext, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, TaskScope, workspace } from 'vscode'
import Config from '../services/config'
import TaskDataProvider from '../services/task-data-provider'

export const TASK_TYPE_SHELL = 'shell'
export const TASK_GLOB_SHELL = '**/*.sh'

export class ShellTaskDefinition implements TaskDefinition {
    type = TASK_TYPE_SHELL
}

export class ShellTask extends Task {

}

export default class TaskProviderShell implements TaskProvider<ShellTask> {

    private config: Config

    private tasks: ShellTask[] = []

    constructor(context: ExtensionContext, config: Config, taskDataProvider: TaskDataProvider) {
        this.config = config

        const {
            subscriptions,
        } = context

        const watcher = workspace.createFileSystemWatcher(TASK_GLOB_SHELL)

        watcher.onDidChange(() => taskDataProvider.refresh())
        watcher.onDidCreate(() => taskDataProvider.refresh())
        watcher.onDidDelete(() => taskDataProvider.refresh())

        subscriptions.push(watcher)
    }

    async provideTasks(token: CancellationToken): Promise<ShellTask[]> {
        const exclude = this.config.getOr('exclude', []).join(',')
        const files = await workspace.findFiles(TASK_GLOB_SHELL, `{${exclude}}`, undefined, token)

        const tasks: ShellTask[] = []

        for await (const file of files) {
            if (token.isCancellationRequested) {
                break
            }

            const name = basename(file.path)
            const folder = workspace.getWorkspaceFolder(file)

            // TODO: Get hashbang

            const task = new ShellTask(
                new ShellTaskDefinition(),
                folder ?? TaskScope.Workspace,
                name,
                TASK_TYPE_SHELL,
                new ShellExecution(
                    file.fsPath,
                    {
                        cwd: folder?.uri.fsPath,
                        executable: '/bin/bash',
                    }
                )
            )

            // attach directory of the script
            if (folder) {
                task.detail = file.path.replace(folder.uri.path, '')
            }

            tasks.push(task)
        }

        this.tasks = tasks

        return this.tasks
    }

    resolveTask(task: ShellTask): ProviderResult<ShellTask> {
        return task
    }

}
