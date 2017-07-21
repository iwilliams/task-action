class Action {
    update() { return false; }
}

class OneOffAction extends Action {
    constructor(update) {
        super();
        this.updateFn = update;
    }

    update(delta) {
        return this.updateFn(delta) || false;
    }
}

class WaitAction extends Action {
    constructor(waitFor) {
        super();
        this.waitFor     = waitFor;
        this.elapsedTime = 0;
    }

    update(delta) {
        this.elapsedTime += delta;
        return this.elapsedTime < this.waitFor;
    }
}

class Task {
    constructor(action) {
        if(!(action instanceof Action)) throw new Error(`${action} must be instanceof Action`);
        this.action        = action;
        this.isParallel    = false;
        this.isDone        = false;
        this.queuedTasks   = [];
        this.parallelTasks = [];
    }

    get currentQueuedTask() { return this.queuedTasks[0]; }
    get hasQueuedTasks()    { return this.queuedTasks.length > 0; }
    get hasParallelTasks()  { return this.parallelTasks.length > 0; }

    update(delta) {
        // If not done then run the update for this task otherwise find the next non parallel
        // queued task and run that.
        if(!this.isDone) {
            this.isDone = !this.action.update(delta);
        } else {
            // shift off queued tasks until we find a non parallel one
            while(this.hasQueuedTasks && this.currentQueuedTask.isParallel) {
                this.parallelTasks.push(this.queuedTasks.shift());
            }

            // if there is a queued task then run the update and remove it if it's done
            if(this.hasQueuedTasks) {
                let currentQueuedTask = this.currentQueuedTask;
                if(!currentQueuedTask.update(delta)) {
                    this.queuedTasks = this.queuedTasks.filter(task => task !== currentQueuedTask);
                }
            }
        }

        // Run any parallel tasks
        if(this.hasParallelTasks) {
            this.parallelTasks = this.parallelTasks.filter(parallelTask => parallelTask.update(delta));
        }

        // If the main task is done and there are no more queued tasks or parallel tasks
        // then return false otherwise true.
        if(this.isDone && !this.hasQueuedTasks && !this.hasParallelTasks) {
            return false;
        } else {
            return true;
        }
    }

    then(task) {
        if(!(task instanceof Task)) throw new Error(`${task} must be instanceof Task`);
        this.queuedTasks.push(task);
        return this;
    }

    next(task) {
        if(!(task instanceof Task)) throw new Error(`${task} must be instanceof Task`);
        this.queuedTasks.unshift(task);
        return this;
    }

    also(task) {
        if(!(task instanceof Task)) throw new Error(`${task} must be instanceof Task`);
        task.isParallel = true;
        this.parallelTasks.push(task);
        return this;
    }

    thenAlso(task) {
        if(!(task instanceof Task)) throw new Error(`${task} must be instanceof Task`);
        task.isParallel = true;
        return this.then(task);
    }

    cancel(task) {
        if(!(task instanceof Task)) throw new Error(`${task} must be instanceof Task`);
        this.queuedTasks   = this.queuedTasks.filter(queuedTask => queuedTask !== task);
        this.parallelTasks = this.parallelTasks.filter(parallelTask => parallelTask !== task);
    }
}

module.exports = {
    Task,
    Action,
    WaitAction,
    OneOffAction
};
