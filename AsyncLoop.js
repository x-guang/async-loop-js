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
  const checkCondition = () => !this.loopConditions.length ? undefined : promiseCall(this.loopConditions).then((condition) => !condition && (this.breaked = true)).catch(e => (this.abrupt = true, Promise.reject(e)))
  this.loopBlocks.unshift(checkCondition);
  var initVal, inited = false
  this.loopBlocks.unshift(() => inited ? initVal : this.loopInits.length ? (inited = true, initVal = promiseCall(this.loopInits)) : undefined);
  this.loopUpdations = normalizeArr(opts.loopUpdations || opts.loopUpdation).slice();
  this.loopCatchs = normalizeArr(opts.loopCatchs).slice();
  this.afterLoop = normalizeArr(opts.afterLoop).slice();
  if (opts.iterable) this.forOf(opts.iterable)
  this.loopAsyncCb = this.loopAsync.bind(this);
  this.abrupt = this.continued = this.breaked = false;
  this.p = null;
  this.data = {} //public
}

Object.assign(AsyncLoop.prototype, {
  loopAsync(val) {
    //scheduler
    //if (this.breaked) this.abrupt = true
    if (this.abrupt) return this.resolve(val), (this.p = null);
    //log(this.abrupt, this.continued, this.breaked);
    //sleep(100);
    if (this.continued) {
      this.continued = false;
    }
    if (!this.breaked) {
      //var callChain=
      const isRedirected = () => this.abrupt || this.breaked || this.continued
      this.p = promiseCall(this.loopBlocks, isRedirected)
        .catch((e) => !isRedirected() && this.loopCatchs[0] ? promiseCall([() => e].concat(this.loopCatchs), isRedirected) : undefined)
        .then(() => !this.abrupt && !this.breaked ? promiseCall(this.loopUpdations) : undefined)
        .then(this.loopAsyncCb);
      /*Promise.resolve()
        .then(loopAsync).catch(loopCatch)
          .then(loopPost)
          .then(loopAsync)*/
    } else if (!this.abrupt) {
      //afterLoop
      log("afterAsyncLoop");
      val = promiseCall(this.afterLoop, () => this.abrupt);
      this.abrupt = true;
      this.loopAsync(val);
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

  run() {
    //this.resolve
    return new Promise((res, rej) => ((this.resolve = res), promiseCall(this.loopInits).then(this.loopAsyncCb)));
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
  forOf(iterable) {
    this.opts.iterable = iterable
    var iterator, pointer
    iterator = toIterator(iterable)
    return this //.initLoop(()=>iterator = toIterator(iterable))
      .condition(() => (pointer = iterator.next(), !pointer.done))
      //.updation(() => pointer=iterator.next())
      .thenLoop(() => pointer.value)
  },

  clone() {
    return new AsyncLoop(this.opts);
  },
});

function promiseCall(callChain, shouldStop, getNextIndex) {
  var callStack = callChain || [];
  if (!Array.isArray(callStack)) callStack = [callStack];
  var callIndex = 0;
  var p; //=Promise.resolve()
  //log(callStack);
  //console.trace(callStack)

  function errBubble(e) {
    //console.error("errBubble",e)
    for (var currCall; currCall = callStack[callIndex]; callIndex++) {
      if (Array.isArray(currCall) && typeof currCall[1] === "function")
        return currCall[1](e)
    }
    throw e
  }

  function attachCb(val) {
    var nextIndex = getNextIndex && getNextIndexel();
    if (isNumeric(nextIndex)) { //&&nextIndex>-1
      var currCall = callStack[nextIndex]
      if (currCall) callIndex = nextIndex
    } else var currCall = callStack[callIndex++];
    //if (nextLabel || nextLabel === 0) var currCall = callStack.find(c => Array.isArray(c) && c[2] === nextLabel)
    if ((!currCall || Array.isArray(currCall) && !currCall[0]) && callIndex < callStack.length) return attachCb(val) //ignore null and catch handler, search forward
    if (!currCall || (shouldStop && shouldStop()))
      return (callStack = p = null), val;
    if (!Array.isArray(currCall)) currCall = [currCall];
    var p;
    //log(val, currCall+"");
    p = Promise.resolve(val).then(currCall[0], currCall[1]);
    p = p.then(attachCb, errBubble); //不再catch
    return p;
  }
  return Promise.resolve(attachCb()); //.then(()=>log("promiseCalled"))
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
  return (typeof obj === "number" && !isNaN(obj)) || (typeof obj === "number" && !!obj && !isNaN(+obj))
}

if (typeof module === "object") module.exports = AsyncLoop;