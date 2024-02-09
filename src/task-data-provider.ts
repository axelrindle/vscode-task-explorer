import { createHash } from 'crypto'
import { stat } from 'fs/promises'
import { join } from 'path'
import { groupBy } from "remeda"
import { Command, Event, EventEmitter, ProgressLocation, ProviderResult, Task, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, tasks, window, workspace } from "vscode"
import { EXTENSION_ID } from './extension'
import Config from './config'

function makeTaskId(task: Task): string {
    const id = `${task.definition.type}-${task.name.replace(/\s+/g, '_').toLocaleLowerCase()}-${task.source}`
    return createHash('md5').update(id).digest('hex')
}

/**
 * Represents a task group (e.g. npm, shell, etc.)
 */
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

        // use product icons where applicable
        switch (name) {
            case 'shell':
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

    contextValue = 'taskItem';

}

type TaskList = Record<string, TaskItem[]>

export default class TaskDataProvider implements TreeDataProvider<TreeItem> {

    private config: Config

    private groups: TreeItem[] = []
    private tasks: TaskList = {}

    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | void> = new EventEmitter<TreeItem | undefined | void>()
    readonly onDidChangeTreeData: Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event

    constructor(config: Config) {
        this.config = config

        this.config.on('change', () => this.refresh())

        this.refresh()
    }

    private buildArguments(item: Task): string[] {
        if (item.definition.type === 'shell') {
            return [item.name]
        }

        return [
            `${item.definition.type}: ${item.name}`
        ]
    }

    private async fetchTasks(): Promise<TaskItem[]> {
        const list = await tasks.fetchTasks()

        const excludedGroups = this.config.get('excludeGroups')

        return list
            .filter(item => !excludedGroups?.includes(item.definition.type))
            .map(item => new TaskItem(item, {
                command: 'workbench.action.tasks.runTask',
                title: 'Run this task',
                arguments: this.buildArguments(item),
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
