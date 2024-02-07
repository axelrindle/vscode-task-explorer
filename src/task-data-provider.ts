import { createHash } from 'crypto'
import { stat } from 'fs/promises'
import { join } from 'path'
import { groupBy } from "remeda"
import { Command, Event, EventEmitter, ProgressLocation, ProviderResult, Task, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, tasks, window, workspace } from "vscode"

function makeTaskId(task: Task): string {
    const id = task.definition.type + '-' + task.name + '-' + task.scope ?? 'global'
    return createHash('md5').update(id).digest('hex')
}

class GroupItem extends TreeItem {

    constructor(
        label: string
    ) {
        super(label, TreeItemCollapsibleState.Collapsed)

        this.setIconPath()
    }

    private iconName(): string {
        return (this.label as string).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    }

    private async setIconPath() {
        const name = this.iconName()
        if (name === 'shell') {
            this.iconPath = new ThemeIcon('terminal-view-icon')
            return
        }

        const file = join(__filename, '..', '..', 'resources', 'icons', `${name}.svg`)

        try {
            const stats = await stat(file)
            if (stats.isFile()) {
                this.iconPath = {
                    light: file,
                    dark: file
                }
            }
        } catch (error) {
            // ¯\_(ツ)_/¯
        }
    }

}

class TaskItem extends TreeItem {

    readonly id: string
    readonly group: string

    constructor(
        task: Task,
        command: Command,
    ) {
        super(task.name, TreeItemCollapsibleState.None)

        this.id = makeTaskId(task)
        this.group = task.definition.type
        this.description = task.detail
        this.command = command
    }

    contextValue = 'task';

}

type TaskList = Record<string, TaskItem[]>

export default class TaskDataProvider implements TreeDataProvider<TreeItem> {

    private groups: TreeItem[] = []
    private tasks: TaskList = {}

    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | void> = new EventEmitter<TreeItem | undefined | void>()
    readonly onDidChangeTreeData: Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event

    constructor() {
        this.refresh()
    }

    private async fetchTasks(): Promise<TaskItem[]> {
        const list = await tasks.fetchTasks()

        return list
            .map(item => new TaskItem(item, {
                command: 'workbench.action.tasks.runTask',
                title: 'Run this task',
                arguments: [
                    `${item.definition.type}: ${item.name}`
                ],
            }))
            .sort((a, b) => (a.label as string).localeCompare(b.label as string))
    }

    async refresh(): Promise<void> {
        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                cancellable: false,
            },
            async () => {
                await new Promise((resolve, reject) => {
                    setTimeout(resolve, 1000)
                })

                const list = await this.fetchTasks()

                this.tasks = groupBy(
                    list,
                    item => item.group
                )
                this.groups = Object.keys(this.tasks)
                    .sort()
                    .map(key => new GroupItem(key))

                this._onDidChangeTreeData.fire()
            }
        )
    }

    getTreeItem(element: TreeItem): TreeItem {
        return element
    }

    getChildren(element?: TreeItem | undefined): ProviderResult<TreeItem[]> {
        if (element) {
            return this.tasks[element.label as string]
        }

        return this.groups
    }

}
