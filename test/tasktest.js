const assert = require('assert');
const {
    Task,
    Action,
    OneOffAction
} = require('../src');

describe('Task', function() {
    describe('#constructor', function() {
        it('Creates a Task with a supplied Action', function() {
            let a = new Action();
            let t = new Task(a);

            assert.equal(t.action, a);
        });
    });

    describe('#then', function() {
        it('Queues a task for running', function() {
            let a     = new Action();
            let rootT = new Task(a);

            assert.equal(rootT.queuedTasks.length, 0);
            assert.equal(rootT.parallelTasks.length, 0);

            let aThen = new Action();
            let t     = new Task(aThen);

            let aThen2 = new Action();
            let t2     = new Task(aThen2);

            rootT.then(t).then(t2);

            assert.equal(rootT.queuedTasks.length, 2);
            assert.ok(rootT.queuedTasks.includes(t));
            assert.ok(rootT.queuedTasks.includes(t2));
            assert.equal(rootT.parallelTasks.length, 0);
        });
    });

    describe('#next', function() {
        it('Queues a task for running next instead of at the end', function() {
            let bool1 = false;
            let bool2 = false;
            let bool3 = false;
            let bool4 = false;

            let rootT = new Task(new OneOffAction(() => {
                bool1 = true;
            }));

            rootT.then(new Task(new OneOffAction(() => {
                bool2 = true;

                let nestedTask = new Task(new OneOffAction(() => {
                    bool3 = true;
                }));

                nestedTask.then(new Task(new OneOffAction(() => {
                    bool4 = true;
                })));

                rootT.next(nestedTask);
            })));

            assert.equal(bool1, false);
            assert.equal(bool2, false);
            assert.equal(bool3, false);
            assert.equal(bool4, false);

            rootT.update(1);

            assert.equal(bool1, true);
            assert.equal(bool2, false);
            assert.equal(bool3, false);
            assert.equal(bool4, false);

            rootT.update(1);

            assert.equal(bool1, true);
            assert.equal(bool2, true);
            assert.equal(bool3, false);
            assert.equal(bool4, false);

            rootT.update(1);

            assert.equal(bool1, true);
            assert.equal(bool2, true);
            assert.equal(bool3, true);
            assert.equal(bool4, false);

            rootT.update(1);

            assert.equal(bool1, true);
            assert.equal(bool2, true);
            assert.equal(bool3, true);
            assert.equal(bool4, true);
        });
    });

    describe('#also', function() {
        it('Adds the task to parallel task list', function() {
            let a     = new Action();
            let rootT = new Task(a);

            assert.equal(rootT.queuedTasks.length, 0);
            assert.equal(rootT.parallelTasks.length, 0);

            let aThen = new Action();
            let t     = new Task(aThen);

            let aThen2 = new Action();
            let t2     = new Task(aThen2);

            rootT.also(t).also(t2);

            assert.equal(rootT.parallelTasks.length, 2);
            assert.ok(rootT.parallelTasks.includes(t));
            assert.ok(rootT.parallelTasks.includes(t2));
            assert.equal(rootT.queuedTasks.length, 0);
        });
    });

    describe('#thenAlso', function() {
        it('Queues a parallel task', function() {
            let a     = new Action();
            let rootT = new Task(a);

            assert.equal(rootT.queuedTasks.length, 0);
            assert.equal(rootT.parallelTasks.length, 0);

            let aThen = new Action();
            let t     = new Task(aThen);

            let aThen2 = new Action();
            let t2     = new Task(aThen2);

            rootT.thenAlso(t).thenAlso(t2);

            assert.equal(rootT.queuedTasks.length, 2);
            assert.ok(rootT.queuedTasks.includes(t));
            assert.ok(rootT.queuedTasks.includes(t2));
            assert.ok(rootT.queuedTasks.every(task => task.isParallel));
            assert.equal(rootT.parallelTasks.length, 0);
        });
    });

    describe('#cancel', function() {
        it('Removes a queued task.', function() {
            let rootTask = new Task(new Action());

            let childTask1 = new Task(new Action());
            rootTask.then(childTask1);

            let childTask2 = new Task(new Action());
            rootTask.then(childTask2);

            assert.ok(rootTask.queuedTasks.includes(childTask1));
            assert.ok(rootTask.queuedTasks.includes(childTask2));

            rootTask.cancel(childTask1);

            assert.ok(!rootTask.queuedTasks.includes(childTask1));
            assert.ok(rootTask.queuedTasks.includes(childTask2));
        });

        it('Removes a parallel task.', function() {
            let rootTask = new Task(new Action());

            let childTask1 = new Task(new Action());
            rootTask.also(childTask1);

            let childTask2 = new Task(new Action());
            rootTask.also(childTask2);

            assert.ok(rootTask.parallelTasks.includes(childTask1));
            assert.ok(rootTask.parallelTasks.includes(childTask2));

            rootTask.cancel(childTask1);

            assert.ok(!rootTask.parallelTasks.includes(childTask1));
            assert.ok(rootTask.parallelTasks.includes(childTask2));
        });
    });

    describe('#update', function() {
        it('Sets the task to done when the action returns false.', function() {
            let a = new Action();
            let t = new Task(a);

            assert.equal(t.isDone, false);
            t.update(1);
            assert.equal(t.isDone, true);
        });

        it('Runs the task\'s Action\'s update', function() {
            let testBool = false;

            let a = new OneOffAction(() => {
                testBool = true;
            });
            let t = new Task(a);

            assert.equal(testBool, false);
            t.update(1);
            assert.equal(testBool, true);
            assert.equal(t.isDone, true);
        });

        it('Runs queued tasks in order', function() {
            let testBool1 = false;
            let testBool2 = false;
            let testBool3 = false;

            let a1 = new OneOffAction(() => { testBool1 = true; });
            let rootTask = new Task(a1);

            let a2 = new OneOffAction(() => { testBool2 = true; });
            rootTask.then(new Task(a2));

            let a3 = new OneOffAction(() => { testBool3 = true; });
            rootTask.then(new Task(a3));

            assert.equal(testBool1, false);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
        });

        it('Runs parallel tasks', function() {
            let testBool1 = false;
            let testBool2 = false;
            let testBool3 = false;

            let a1 = new OneOffAction(() => { testBool1 = true; });
            let rootTask = new Task(a1);

            let a2 = new OneOffAction(() => { testBool2 = true; });
            rootTask.also(new Task(a2));

            let a3 = new OneOffAction(() => { testBool3 = true; });
            rootTask.also(new Task(a3));

            assert.equal(testBool1, false);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
        });

        it('Runs a queued parallel task', function() {
            let testBool1 = false;
            let testBool2 = false;
            let testBool3 = false;

            let a1 = new OneOffAction(() => { testBool1 = true; });
            let rootTask = new Task(a1);

            let a2 = new OneOffAction(() => { testBool2 = true; });
            rootTask.thenAlso(new Task(a2));

            let a3 = new OneOffAction(() => { testBool3 = true; });
            rootTask.thenAlso(new Task(a3));

            assert.equal(testBool1, false);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
        });

        it('Runs a nested task', function() {
            let testBool1 = false;
            let testBool2 = false;
            let testBool3 = false;
            let testBool4 = false;


            let rootTask = new Task(new OneOffAction(() => {
                testBool1 = true;
            }));

            let subTask = new Task(new OneOffAction(() => {
                testBool2 = true;
            }));

            subTask.then(new Task(new OneOffAction(() => {
                testBool3 = true;
            })));

            rootTask.then(subTask);

            rootTask.then(new Task(new OneOffAction(() => {
                testBool4 = true;
            })));

            assert.equal(testBool1, false);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, false);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
            assert.equal(testBool4, true);
        });

        it('Runs queued nested tasks', function() {
            let testBool1 = false;
            let testBool2 = false;
            let testBool3 = false;
            let testBool4 = false;

            let a1 = new OneOffAction(() => { testBool1 = true; });
            let rootTask = new Task(a1);

            let a2 = new OneOffAction(() => { testBool2 = true; });
            let subTask = new Task(a2);

            let a3 = new OneOffAction(() => { testBool3 = true; });
            subTask.then(new Task(a3));
            rootTask.then(subTask);

            let a4 = new OneOffAction(() => { testBool4 = true; });
            rootTask.then(new Task(a4));

            assert.equal(testBool1, false);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, false);
            assert.equal(testBool3, false);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, false);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
            assert.equal(testBool4, false);

            rootTask.update(1);

            assert.equal(testBool1, true);
            assert.equal(testBool2, true);
            assert.equal(testBool3, true);
            assert.equal(testBool4, true);
        });
    });
});
