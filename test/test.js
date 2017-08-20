
function AssemblerTester(as) {
  function assertAssemblerResult(test) {
    if (as.assemble(test.code).replace(/ /g, "") == test.result.replace(/ /g, ""))
      console.log(test.name + " OK\n")
    else
      console.log(test.name + " FAILED \nCode: \n\t" + test.code + "\n" + 
                                        "Expected: \n\t" + test.result + "\n\n" + 
                                        "Get: \n\t" + as.assemble(test.code) + "\n\n")
  }

  var tests = []

  this.addTest = function(name, asmCode, expectedResult) {
    tests.push({code : asmCode, result : expectedResult, name : name})
  }

  this.runAllTests = function() {
    tests.forEach(assertAssemblerResult) 
  }
}

var tester = new AssemblerTester(new AS());


// ---------------------- BLACK-BOX TESTS --------------------------

tester.addTest("test1", 
`
LOAD MQ, M(0x102)
MUL  M(0x103)             
LOAD MQ
STOR M(0x102)
`, 

`
000 09 10 20 B1 03
001 0A 00 02 11 02
`)

tester.addTest("test2", 
`
.org 0x000
  LOAD MQ, M(0x102)            
  MUL  M(0x103)
  LOAD MQ
  JUMP M(0x020,0:19)
.org 0x020
  STOR M(0x102)
`, 

`
000 09 10 20 B1 03
001 0A 00 00 D0 20
020 21 10 20 00 00
`)

tester.addTest("test3", 
`
.org 0x000
  LOAD MQ, M(0x102)            
  MUL  M(0x103)
  LOAD MQ
  JUMP M(0x020,0:19)
.org 0x020
  STOR M(0x102)
`, 

`
000 09 10 20 B1 03
001 0A 00 00 D0 20
020 21 10 20 00 00
`)

tester.addTest("test4", 
`
.org 0x102 
.word 0xA 
.word 10
.org 0x000
  LOAD MQ, M(0x102)       
  MUL  M(0x103)    
  LOAD MQ
  JUMP M(0x000,0:19)
`, 

`
102 00 00 00 00 0A
103 00 00 00 00 0A
000 09 10 20 B1 03
001 0A 00 00 D0 00
`)

tester.addTest("test5", 
`
.org 0x000                       
laco:                            
  LOAD M(var_x)
  SUB  M(const1)                 
  JUMP M(laco)                   
.org 0x100
var_x: 
  .word 0000000009
const1: 
  .word 0x0000000001
`, 

`
000 01 10 00 61 01
001 0D 00 00 00 00
100 00 00 00 00 09
101 00 00 00 00 01
`)

tester.addTest("test6", 
`
.org 0x100                       
base:                            
  .word vetor                    
vetor:                           
  .word 0000000000
  .word 0000000001
  .word 0000000002
fim_vetor:
`, 

`
100   00 00 00 01 01
101   00 00 00 00 00
102   00 00 00 00 01
103   00 00 00 00 02
`)

tester.addTest("test7", 
`
.org 0x000                    
laco:                         
  JUMP M(laco)
.align 1
vetor:
.skip 0xA
x:
.skip 0x1
y:
.word 0x4 
`, 

`
000  0D 00 00 00 00
00C  00 00 00 00 04
`)

tester.addTest("test8", 
`
.set CODIGO  0x000              
.set DADOS   0x100              
.set TAMANHO 2                  
.org CODIGO                     
laco:                           
  JUMP M(laco)
.org DADOS
vetor:
  .wfill TAMANHO, 0x5
`, 

`
000 0D 00 00 00 00
100 00 00 00 00 05
101 00 00 00 00 05
`)

tester.addTest("test9", 
`
.org 0x000                      
laco:                           
  JUMP M(laco)                  
.org 0x100                      
vetor:                          
  .wfill 4, 0x5
`, 

`
000 0D 00 00 00 00
100 00 00 00 00 05
101 00 00 00 00 05
102 00 00 00 00 05
103 00 00 00 00 05
`)


tester.addTest("testFinal", 
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
007 00 000 00 004
`)


// -------------------------------------------------------------

tester.runAllTests()
