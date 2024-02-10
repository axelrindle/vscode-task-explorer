import { basename } from 'path'
import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, TaskScope, workspace } from 'vscode'

export class ShellTaskDefinition implements TaskDefinition {
    type = 'shell'
}

export class ShellTask extends Task {

}

export default class TaskProviderShell implements TaskProvider<ShellTask> {

    private tasks: ShellTask[] = []

    async provideTasks(token: CancellationToken): Promise<ShellTask[]> {
        const files = await workspace.findFiles('**/*.sh', undefined, undefined, token)
        const tasks: ShellTask[] = []

        for await (const file of files) {
            if (token.isCancellationRequested) {
                break
            }

            const name = basename(file.path)
            const folder = workspace.getWorkspaceFolder(file)

            // const contents = await workspace.fs.readFile(file)
            // contents.

            // TODO: Get hashbang

            const task = new ShellTask(
                new ShellTaskDefinition(),
                folder ?? TaskScope.Workspace,
                name,
                'shell',
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
