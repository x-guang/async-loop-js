var AsyncLoop = require("./AsyncLoop.js")
//var AsyncLoop = require("./index.js")

function test() {
  var asyncLoop = new AsyncLoop();
  asyncLoop.thenLoop(() => {
    console.log("thenLoop1")
    asyncLoop.toBreak()
  })
.catchLoop(e => {
    console.log("catchLoop2", e)
    asyncLoop.toBreak()
  })
  var p = asyncLoop.run()
    .then(v => console.info("returned value:", v))
  console.log(p)


}

test()