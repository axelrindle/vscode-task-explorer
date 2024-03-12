import { createHash } from 'crypto'
import { stat } from 'fs/promises'
import { join } from 'path'
import { groupBy, identity } from 'remeda'
import { Command, Event, EventEmitter, ExtensionContext, ProgressLocation, ProviderResult, Task, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, tasks, window } from 'vscode'
import { Disposable } from '../disposable'
import { EXTENSION_ID } from '../extension'
import { notEmpty } from '../util'
import Config from './config'
import { Favorites } from './favorites'

const groupKeyFavorites = 'favorites'

function makeTaskId(task: Task, isFavorite: boolean): string {
    const id = `${task.definition.type}-${task.name.replace(/\s+/g, '_').toLocaleLowerCase()}-${task.source}`
    const hash = createHash('md5').update(id).digest('hex')

    if (isFavorite) {
        return `favorite-${hash}`
    }

    return hash
}

function makeGroupLabel(label: string): string {
    switch (label) {
    case '$composite':
        return 'Composite Tasks'
    case groupKeyFavorites:
        return 'Favorite Tasks'
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
        case groupKeyFavorites:
            this.iconPath = new ThemeIcon('star-full')
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

    readonly task: Task
    readonly id: string
    readonly group: string

    constructor(
        task: Task,
        command: Command,
        isFavorite: boolean = false,
    ) {
        super(task.name, TreeItemCollapsibleState.None)

        this.task = task
        this.id = makeTaskId(task, isFavorite)
        this.group = isFavorite ? groupKeyFavorites : task.definition.type
        this.description = task.detail
        this.command = command
    }

    public get isFavorite() : boolean {
        return this.group === groupKeyFavorites
    }

    contextValue = 'taskItem'

}

export class FavoriteItem extends TaskItem {

    constructor(
        task: Task,
        command: Command,
    ) {
        super(task, command, true)
    }

    contextValue = 'favoriteItem'

}

type TaskList = Record<string, TaskItem[]>

export default class TaskDataProvider implements TreeDataProvider<TreeItem>, Disposable {

    private config: Config

    private groups: TreeItem[] = []
    private tasks: TaskList = {}
    private favorites: Favorites

    private _onDidChangeTreeData: EventEmitter<TreeItem | undefined | void> = new EventEmitter<TreeItem | undefined | void>()
    readonly onDidChangeTreeData: Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event

    constructor(config: Config, context: ExtensionContext, favorites: Favorites) {
        this.config = config
        this.favorites = favorites

        this.config.on('change', () => this.refresh())
        this.favorites.on('change', () => this.refresh())

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

    dispose(): void {
        window.registerTreeDataProvider(EXTENSION_ID, this)
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

        const result = list
            .filter(item => !excludedGroups?.includes(item.definition.type))
            .map(item => new TaskItem(item, {
                command: 'workbench.action.tasks.runTask',
                title: 'Run this task',
                arguments: this.buildArguments(item),
            }))
            .sort((a, b) => (a.label as string).localeCompare(b.label as string))

        const favorites = Array.from(this.favorites.list())
            .map(id => {
                const item = result.find(item => item.id === id)
                if (item !== undefined) {
                    return new FavoriteItem(item.task, item.command!)
                }

                return undefined
            })
            .filter(notEmpty)
            .sort((a, b) => a.task.name.localeCompare(b.task.name))

        return favorites.concat(result)
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
                    .sort((a, b) => {
                        if (a === groupKeyFavorites) {
                            return -1
                        }
                        else if (b === groupKeyFavorites) {
                            return 1
                        }

                        return a.localeCompare(b)
                    })
                    .map(key => new GroupItem(key))

                this._onDidChangeTreeData.fire()
            }
        )
    }

    getTasks(): TaskItem[] {
        return Object.values(this.tasks).flatMap(identity)
    }

}
