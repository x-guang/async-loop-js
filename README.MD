# Description
To compose asynchronous for/while/forOf loop cushily with Promises, decoupled from ES2015+ env and verbose babel compiling.

This package furnishes capacity of switching asynchronous loop to flatting promises chain, with averting memory leak.

# Tutorial
## Installation
```sh
npm i async-loop-js
```
## Import
```javascript
var AsyncLoop = require("async-loop-js")
```
Or use import (with a module bundler or loader):
```javascript
import AsyncLoop from "async-loop-js"
```
In browser (exports as AsyncLoop):
```html
<script src="https://cdn.jsdelivr.net/npm/async-loop-js/index.js"></script>
```

# Example
## Serial asynchronous code
A fragment of async code in ES2017:
```javascript
async function main() {
  for (var i = 0; i < 3; i++) {
    var result = await operationAsync()
    if (result) return true; //never throw an error if returns
  }
  throw new Error("Failed operation")
}
```
That could be rewrited to the following, even without babel compiler in ES6 environment where arrow functions and Promise are supported.
With slight modification, it could also run in ES5 importing polyfill (Promise).
```javascript
function main() {
  var i
  var asyncLoop = new AsyncLoop();
  asyncLoop.initLoop(() => i = 1)
    .condition(() => i < 3)
    .updation(() => i++)
    .thenLoop(() => operationAsync())
    .thenLoop(result => {
      if (result) return asyncLoop.end(true) //never throw an error if ends
    })
    .then(() => {
      throw new Error("Failed operation")
    })
  return asyncLoop.run()
}
```
## Catch errors while looping
A fragment of async code in ES2017:
```javascript
async function main() {
  for (var i = 0; i < 3; i++) {
    try {
      var result = await operationAsync()
      doSth(result);
    } catch (e) {
      console.warn("Error in the loop:", e)
    }
  }
}
```
Using AsyncLoop:
```javascript
function main() {
  var i = 0
  var asyncLoop = new AsyncLoop();
  asyncLoop.condition(() => i < 3)
    .updation(() => i++)
    .thenLoop(() => operationAsync())
    .thenLoop(result => doSth(result))
    .catchLoop(e => console.warn("Error in the loop:", e))
  return asyncLoop.run()
}
```
## For of loop
A fragment of asynchronous forOf(ES2015) usage:
```javascript
for (let n of [1, 2, 4, 8]) {
  console.info(n)
  await operationAsync(n)
}
```
Using AsyncLoop:
```javascript
var asyncLoop = new AsyncLoop();
asyncLoop.forOf([1, 2, 4, 8])
  .thenLoop(n => {
    console.info(n)
    return operationAsync(n)
  })
asyncLoop.run()
```


# Options
## loopBlocks: Array | Function
Accept a function, which returns a promise or the other value, or an array of functions, as the parameter.

When using options instead of programmatic interface:
```javascript
var i = 0
var loopOpts = {
  loopConditions: () => i++ < 5,
  loopBlocks: [() => console.log(i), () => sleepAsync(100)],
}
var asyncLoop = new AsyncLoop(loopOpts)
asyncLoop.run()
```

## loopInits: Array | Function
## loopConditions: Array | Function
## loopUpdations: Array | Function
## loopCatchs: Array | Function
## afterLoop: Array | Function
Same rule as the loopBlocks option.
## iterable: Iterable
Set iterable object to ergodic in the loop, accepted while params loopConditions is undefined.

E.g. Array, String, Set, Map, arguments of function, NodeList and TypedArray.

# Api
*P.S: Both the func param and the errHandler param accept a function that return a regular value or a promise, namely a synchronous or asynchronous function.*

## Define methods:
## #initLoop(func): instance
Add initialization function in the for loop, optional for while/forOf loop.
## #condition(func): instance
Add test condition function in for/while loop, supporting async function, optional.
## #updation(func): instance
Add updation function in for loop, increasing/decreasing the loop variable, optional.
## #thenLoop(func, errHandler?): instance
Add a body function as the loop block to expected executive stack, similar to `promise.then()`, supporting async function that returns a promise.
It's typical to call many times to add multiple loop blocks, and those blocks wound be executed in sequence then repeat.

Moreover, the errHandler param accepts a async/sync function in accord with the body function.
## #catchLoop(errHandler): instance
Add a error handler for loop blocks defined ahead, similar to promise.catch.

For example: `asyncLoop.thenLoop(func).catchLoop(handler)` is equivalent to `asyncLoop.thenLoop(func, handler)`
## #finallyLoop(func): instance
Add callback always called whenever the previous loop blocks are executed, whether or not any error happened.
## #then(func, errHandler?): instance
Executed after the loop, only if there is neither .end() called nor any uncaught error.
## #catch(errHandler): instance
Catch an error in almost overall steps previously defined.
## #finally(func): instance
Add callback, always called after the loop and the defined steps, whether or not any error happened.
## #forOf(iterable, override): instance
Set iterable object to ergodic in the loop.

Native iterable object includes Array, String, Set, Map, arguments of function, NodeList and TypedArray.

_Note: it wouldn't override or break the iterable in the current loop despite the override parameter._

## Execution and logic controls:
## #run(): Promise
Start the asynchronous loop steps, and return a promise resolving the returned value.

Note that `.run()` can be called more than once, but multiple calls will invoke functions of loopInits once.
## #ensureRun(instant: bool): Promise|void
Ensure the loop executed unceasingly and resume the loop flow, when the main step is ending or terminated.

If given truthy value as the parameter instant, novel loop steps would follow the previous as soon as possible, which might break those steps executed after the previous loop.
_It returns undefined only if there's no remaining loop task._

## #isRunning(): bool
Return whether the main step is running.

## #toContinue(): void
Equivalent to the continue statement in the loop.
## #toBreak(): void
Equivalent to the break statement in the loop.
## #end(value?): value
To terminate the execution inside and outside the loop, and to return the input value.
But it's not exactly equivalent to the return statement, because at present the input value doesn't bind itself to the eventually returned value.
```javascript
var asyncLoop = new AsyncLoop();
asyncLoop.thenLoop(() => {
  //Usage 1
  asyncLoop.end()
  return "everything"

  //Usage 2
  return asyncLoop.end("everything")
}).run()
```

## Others:
## #clone(): instance
_Experimental_
Return a new instance that copies most of options.

# Extends
## Parallel/Concurrent tasks
```javascript
const tasks = [3e3, 3e3, 2e3, 4e3, 3e3, 4e3].map((timeout, i) => () => execTask(timeout, i + 1))

const parallelNum = 3
var currNum = 0, unlock
var asyncConcurrency = new AsyncLoop();
asyncConcurrency.forOf(tasks)
  .thenLoop(task => {
    task().finally(() => {
      currNum--
      unlock && unlock() //unlock
    })
    if (++currNum >= parallelNum) return new Promise(res => unlock = res) //suspended
  }).run()

//...
asyncConcurrency.forOf([() => execTask(1e3, 7)]) //new task
asyncConcurrency.ensureRun() //resume the loop when it ended.

function execTask(timeout, n) {
  console.log("Starting task " + n + ".")
  return new Promise(res => setTimeout(res, timeout)).then(() => console.info("Task " + n + " finished."))
}
```

