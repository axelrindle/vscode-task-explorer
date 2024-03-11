import TaskDataProvider, { TaskItem } from './services/task-data-provider'

export class TaskExplorerApi {

    private taskDataProvider: TaskDataProvider

    constructor(taskDataProvider: TaskDataProvider) {
        this.taskDataProvider = taskDataProvider
    }

    getTasks(): TaskItem[] {
        return this.taskDataProvider.getTasks()
    }

    refresh(): Promise<void> {
        return this.taskDataProvider.refresh()
    }

}
