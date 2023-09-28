function AsyncLoop(opts) {
  opts = opts || {};
  this.opts = opts;
  const normalizeArr = (v) =>
    v == undefined ? [] : !Array.isArray(v) ? [v] : v;
  this.loopInits = normalizeArr(opts.loopInits || opts.loopInit).slice();
  this.loopBlocks = normalizeArr(opts.loopBlocks).slice();
  this.loopConditions = normalizeArr(opts.loopConditions || opts.loopCondition).slice();
  //if (this.loopConditions[0]) 
  //const _promiseCall=callChain=>callChain&&callChain.length?promiseCall(callChain): undefined
  const checkCondition = initVal => !this.loopConditions.length ? initVal : promiseCall(this.loopConditions, initVal).then(condition => !condition && (this.breaked = true)).then(() => initVal).catch(e => (this.abrupt = true, Promise.reject(e)))
  this.loopBlocks.unshift(checkCondition);
  var initVal, inited = false
  this.loopBlocks.unshift(() => inited ? initVal : this.loopInits.length ? (inited = true, initVal = promiseCall(this.loopInits)) : undefined);
  this.loopUpdations = normalizeArr(opts.loopUpdations || opts.loopUpdation).slice();
  this.loopCatchs = normalizeArr(opts.loopCatchs).slice();
  this.afterLoop = normalizeArr(opts.afterLoop).slice();

  opts.iterables = opts.iterables || []
  if (opts.iterable) this.forOf(opts.iterable)
  if (opts.iterables.length) opts.iterables.forEach(it => this.forOf(it))

  this.loopAsyncCb = this.loopAsync.bind(this);
  this.p = null;
  this.RESERVED_BLOCKS_NUM = 2
  this.data = {} //public
}

Object.assign(AsyncLoop.prototype, {
  loopAsync(val) {
    //scheduler
    //if (this.breaked) this.abrupt = true
    if (this.abrupt) return this.resolve(val), (this.p = null);
    //console.debug(this.abrupt, this.continued, this.breaked);
    //sleep(100);
    if (this.continued) {
      this.continued = false;
    }
    if (!this.breaked && this.loopBlocks.length > this.RESERVED_BLOCKS_NUM) {
      //var callChain=
      const isRedirected = () => this.abrupt || this.breaked || this.continued
      this.p = promiseCall(this.loopBlocks, undefined, isRedirected)
        .catch((e) => !isRedirected() && this.loopCatchs[0] ? promiseCall(this.loopCatchs, e, isRedirected) : undefined)
        .then(endValue => !this.abrupt && !this.breaked ? promiseCall(this.loopUpdations) : endValue)
        .then(this.loopAsyncCb);
      /*Promise.resolve()
        .then(loopAsync).catch(loopCatch)
          .then(loopPost)
          .then(loopAsync)*/
    } else if (!this.abrupt) {
      //afterLoop
      //console.debug("afterAsyncLoop");
      promiseCall(this.afterLoop, undefined, () => this.abrupt)
        .then(val => (this.abrupt = true, this.loopAsync(val)));
    }
  },

  end(v) {
    return this.abrupt = true, v
  },
  toContinue(v) {
    return this.continued = true
  },
  toBreak(v) {
    return this.breaked = true
  },

  run(force) { //ensure init once
    //this.resolve
    if (this.running && !force) return;
    this.running = true
    var mainP = new Promise((res, rej) => ((this.resolve = res), promiseCall([]).then(this.loopAsyncCb)));
    mainP = mainP.then(() => this.running = false)
    return this.mainP = mainP
  },
  ensureRun(instant) {
    const delayRun = (local) => {
      //if(!local) this.removeThen(delayRun)
      this._reset()
      this.run(true)
    }
    if (!this.running) return delayRun(true)
    if (!this.loopConsumed) return
    if (instant) this.end() //all loop ended
    return this.mainP.then(delayRun)
  },
  isRunning() {
    return !!this.running
  },
  _reset() { //status
    this.abrupt = this.continued = this.breaked = false;
    this.loopConsumed = false
  },

  initLoop(nextCb, errCb) {
    return this.loopInits.push(this.warpPromiseCb(nextCb, errCb)), this
  },
  condition(nextCb, errCb) {
    return this.loopConditions.push(this.warpPromiseCb(nextCb, errCb)), this
  },
  updation(nextCb, errCb) {
    return this.loopUpdations.push(this.warpPromiseCb(nextCb, errCb)), this
  },
  thenLoop(nextCb, errCb) {
    return this.loopBlocks.push(this.warpPromiseCb(nextCb, errCb)), this
  },
  catchLoop(errCb) {
    return this.thenLoop(undefined, errCb)
  },
  finallyLoop(finallyCb) {
    var cbs = this.warpFinallyCb(finallyCb)
    return this.thenLoop(cbs[0], cbs[1])
  },
  then(nextCb, errCb) {
    return this.afterLoop.push(this.warpPromiseCb(nextCb, errCb)), this
  },
  catch (errCb) {
    return this.then(undefined, errCb)
  },
  finally(finallyCb) {
    var cbs = this.warpFinallyCb(finallyCb)
    return this.then(cbs[0], cbs[1])
  },
  warpPromiseCb(nextCb, errCb) {
    return errCb ? [nextCb, errCb] : nextCb
  },
  warpFinallyCb(finallyCb) {
    const nextCb = v => Promise.resolve(finallyCb()).then(() => v)
    const errCb = e => Promise.resolve(finallyCb()).then(() => Promise.reject(e))
    return [nextCb, errCb]
  },
  forOf(iterable, override) {
    var iterables = this.opts.iterables
    if (override) iterables.length = 0, this.iterablePos = 0
    iterables.push(iterable)
    if (this.iterableInited) return this
    this.iterableInited = true

    var iterables, iterator, pointer
    this.iterablePos = 0
    const condition = () => {
      pointer = iterator.next()
      if (!pointer.done) return true

      while (this.iterablePos < iterables.length) {
        iterator = toIterator(iterables[this.iterablePos++])
        pointer = iterator.next()
        if (!pointer.done) return true
      }
      this.loopConsumed = true //update status
      return false
    }
    return this.initLoop(() => iterator = toIterator(iterables[this.iterablePos++]))
      .condition(condition)
      //.condition(() => (pointer = iterator.next(), !pointer.done))
      .thenLoop(() => pointer.value)
  },

  removeThen(nextCb, errCb) {
    for (let i = this.afterLoop.length; i > -1; i--) {
      var call = this.afterLoop[i]
      if (call === nextCb) {
        this.afterLoop.splice(i, 1)
        break
      }
      if (!Array.isArray(call)) continue
      let found
      if (call[0] === nextCb) call[0] = null, found = true
      if (call[1] === errCb) call[1] = null, found = true
      if (!found) continue
      if (!call[0] && !call[1]) this.afterLoop.splice(i, 1)
      break;
    }
  },

  clone() {
    return new AsyncLoop(this.opts);
  },
});

function promiseCall(callChain, initVal, shouldStop, getNextIndex, getStepLock) {
  var callStack = callChain || [];
  if (!Array.isArray(callStack)) callStack = [callStack];
  var callIndex = 0;
  //var p;
  //console.debug(callStack);

  function errBubble(e) {
    //console.error("errBubble",e)
    for (var currCall; currCall = callStack[callIndex]; callIndex++) {
      if (Array.isArray(currCall) && typeof currCall[1] === "function")
        return Promise.resolve(currCall[1](e)).then(attachCb, errBubble)
    }
    throw e
  }

  function attachCb(val) {
    var nextIndex = getNextIndex && getNextIndex(callIndex);
    if (isNumeric(nextIndex)) { //&&nextIndex>-1
      var currCall = callStack[nextIndex]
      if (currCall) callIndex = nextIndex
    } else var currCall = callStack[callIndex++];
    //if (nextLabel || nextLabel === 0) var currCall = callStack.find(c => Array.isArray(c) && c[2] === nextLabel)
    if ((!currCall || Array.isArray(currCall) && !currCall[0]) && callIndex < callStack.length) return attachCb(val) //ignore null and catch handler, search forward
    if (!currCall || (shouldStop && shouldStop()))
      return (callStack = p = null), val;
    if (!Array.isArray(currCall)) currCall = [currCall];
    var stepLock = getStepLock && getStepLock(currCall, callIndex)
    var p;
    //console.debug(val, currCall+"");
    p = Promise.resolve(val).then(currCall[0], currCall[1]);
    if (stepLock) p = Promise.race([p, stepLock])
    p = p.then(attachCb, errBubble); //不再catch
    return p;
  }
  return Promise.resolve(attachCb(initVal)); //.then(()=>console.debug("promiseCalled"))
}

function toIterator(iterable) {
  const hasOwn = Object.prototype.hasOwnProperty;
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";

  if (!iterable) return { next: () => ({ value: undefined, done: true }) }; // Return an iterator with no values.
  //if(typeof obj!=="string"&&!obj)return null
  var iteratorMethod = iterable[iteratorSymbol];
  if (iteratorMethod) return iteratorMethod.call(iterable);
  if (typeof iterable.next === "function") return iterable;

  if (!isNaN(iterable.length)) {
    var i = -1
    var next = function next() {
      while (++i < iterable.length)
        if (hasOwn.call(iterable, i)) {
          next.value = iterable[i];
          next.done = false;
          return next;
        }
      next.value = undefined;
      next.done = true;
      return next;
    };
    return next.next = next;
  }
}

function isNumeric(obj) {
  return (typeof obj === "number" && !isNaN(obj)) || (typeof obj === "string" && !!obj && !isNaN(+obj))
}

if (typeof module === "object") module.exports = AsyncLoop;