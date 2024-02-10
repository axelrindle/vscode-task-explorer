import { createHash } from 'crypto'
import { stat } from 'fs/promises'
import { join } from 'path'
import { groupBy, identity } from 'remeda'
import { Command, Event, EventEmitter, ProgressLocation, ProviderResult, Task, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, tasks, window } from 'vscode'
import Config from './config'

function makeTaskId(task: Task): string {
    const id = `${task.definition.type}-${task.name.replace(/\s+/g, '_').toLocaleLowerCase()}-${task.source}`
    return createHash('md5').update(id).digest('hex')
}

function makeGroupLabel(label: string): string {
    switch (label) {
    case '$composite':
        return 'Composite Tasks'
    default:
        return label
    }
}

/**
 * Represents a task group (e.g. npm, shell, etc.)
 */
export class GroupItem extends TreeItem {

    readonly originalLabel: string

    constructor(
        label: string
    ) {
        super(makeGroupLabel(label), TreeItemCollapsibleState.Collapsed)

        this.originalLabel = label
        this.setIconPath()
    }

    private iconName(): string {
        return (this.originalLabel)
            .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
            .replace(/\$/g, '')
    }

    private async setIconPath() {
        const name = this.iconName()

        // use product icons where applicable
        switch (name) {
        case 'composite':
            this.iconPath = new ThemeIcon('layers')
            return
        case 'shell':
            this.iconPath = new ThemeIcon('terminal-view-icon')
            return
        }

        const file = join(__dirname, '..', 'resources', 'icons', `${name}.svg`)

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

export class TaskItem extends TreeItem {

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

    contextValue = 'taskItem'

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

    getTreeItem(element: TreeItem): TreeItem {
        return element
    }

    getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
        if (this.isGroupItem(element)) {
            return this.tasks[(element as GroupItem).originalLabel as string]
        }

        return this.groups
    }

    private isGroupItem(element?: TreeItem): boolean {
        return !!element && element.collapsibleState !== TreeItemCollapsibleState.None
    }

    private buildArguments(item: Task): string[] {
        if (item.source === 'Workspace') {
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

    getTasks(): TaskItem[] {
        return Object.values(this.tasks).flatMap(identity)
    }

}
