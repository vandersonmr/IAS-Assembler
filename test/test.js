
function AssemblerTester(as) {
  function assertAssemblerResult(test) {
    if (as.assemble(test.code) == test.result)
      console.log(test.name + " OK\n")
    else
      console.log(test.name + " FAILED \nCode: \n\t" + test.code + "\n" + 
                                        "Expected: \n\t" + test.result   + "\n\n" + 
                                        "Get: \n\t" + as.assemble(test.code) + "\n\n")
  }

  var tests = []

  this.addTest = function(asmCode, expectedResult, name) {
    tests.push({code : asmCode, result : expectedResult, name : name})
  }

  this.runAllTests = function() {
    tests.forEach(assertAssemblerResult) 
  }
}

var tester = new AssemblerTester(new AS());

tester.addTest(
`
.set INICIO 0x000 # teste
.org INICIO
laco: 
  LOAD M(x1)
laco2:
ADD M(x2) # adasd daas dfa labelerrado:
JUMP M(cont)
.align 1
cont:
RSH
STOR M(av) # .direrrada
JUMP+ M(laco2)
.align 1
x1: .word 0000000000
x2: .word 0000000002 # 908
av: .word 0000000000 # _aaa
vm: .word x1
`, 

`
000 01 004 05 005
001 0D 002 00 000
002 15 000 21 006
003 0F 000 00 000
004 00 000 00 000
005 00 000 00 002
006 00 000 00 000
007 00 000 00 008`, 

"test1")

tester.runAllTests()

