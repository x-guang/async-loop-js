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
Or use import:
```javascript
import AsyncLoop from "async-loop-js"
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
## Define methods:
## #initLoop(func): instance
Add initialization function in the for loop, optional for while/forOf loop.
## #condition(func): instance
Add test condition function in for/while loop, supporting async function, optional.
## #updation(func): instance
Add updation function in for loop, increasing/decreasing the loop variable, optional.
## #thenLoop(func, errHandler?): instance
Add a body function as the loop block to expected executive stack, similar to promise.then, supporting async function that returns a promise.
It's typical to call many times to add multiple loop blocks, and those blocks wound be executed in sequence then repeat.
Moreover, the errHandler param accepts a async/sync function in accord with the body function.
## #catchLoop(errHandler): instance
Add a error handler for loop blocks defined ahead, similar to promise.catch.

For example: `asyncLoop.thenLoop(func).catchLoop(handler)` is equivalent to `asyncLoop.thenLoop(func, handler)`
## #finallyLoop(func): instance
Add callback always called after the loop body, whether or not any error happens.
## #then(func, errHandler?): instance
Executed after the loop, only if there is neither .end() called nor any uncaught error.
## #catch(errHandler): instance
Catch an error in almost overall steps previously defined.
## #forOf(iterable): instance
Set iterable object to ergodic in the loop.
Native iterable object includes Array, String, Set, Map, arguments of function, NodeList and TypedArray.

## Execution and logic controls:
## #run(): Promise
Start the asynchronous loop steps, and return a promise.
## #toContinue(): void
Equivalent to the continue statement in the loop.
## #toBreak(): void
Equivalent to the break statement in the loop.
## #end(value): value
Equivalent to the return statement, to terminate the execution and to return a value, inside and outside the loop.

## Others:
## #clone(): instance




