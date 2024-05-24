import { execFile } from 'child_process'
import { dirname } from 'path'
import { promisify } from 'util'
import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, TaskScope, Uri, window, workspace,  } from 'vscode'

export const TASK_TYPE_ARTISAN = 'artisan'
export const TASK_GLOB_ARTISAN = 'artisan'

export class ArtisanTaskDefinition implements TaskDefinition {
    type = TASK_TYPE_ARTISAN
}

export class ArtisanTask extends Task {

}

interface ListOutput {
    application: {
        name: string
        version: string
    }

    commands: {
        name: string
        description: string
        hidden: boolean
    }[]

    namespaces: {
        id: string
        commands: string[]
    }[]
}

const _execFile = promisify(execFile)

export default class TaskProviderArtisan implements TaskProvider<ArtisanTask> {

    private tasks: ArtisanTask[] = []

    async provideTasks(token: CancellationToken): Promise<ArtisanTask[]> {
        const tasks: ArtisanTask[] = []

        const files = await workspace.findFiles(TASK_GLOB_ARTISAN, undefined, undefined, token)
        const promises: Promise<void>[] = []

        for await (const artisan of files) {
            if (token.isCancellationRequested) {
                break
            }

            const cwd = dirname(artisan.fsPath)

            try {
                const { stdout } = await _execFile(artisan.fsPath, ['list', '--format=json', '--short'])

                const data = JSON.parse(stdout) as ListOutput

                const newTasks = data.namespaces
                    .flatMap(ns => ns.commands.map(cmd => ({ group: ns.id, name: cmd })))
                    .map(task => {
                        const found = data.commands.find(cmd => cmd.name === task.name)

                        return {
                            ...task,
                            description: found?.description,
                            hidden: found?.hidden,
                        }
                    })
                    .map(info => {
                        const task = new ArtisanTask(
                            new ArtisanTaskDefinition(),
                            TaskScope.Workspace,
                            info.name,
                            TASK_TYPE_ARTISAN,
                            new ShellExecution(`./artisan ${info.name}`, { cwd }),
                        )

                        task.detail = info.description

                        return task
                    })

                tasks.push(...newTasks)
            } catch (error) {
                console.error(error)
                window.showErrorMessage(error.message)
                break
            }
        }

        if (! token.isCancellationRequested) {
            await Promise.all(promises)

            this.tasks = tasks
        }

        return this.tasks
    }

    resolveTask(task: ArtisanTask): ProviderResult<ArtisanTask> {
        return task
    }

}
