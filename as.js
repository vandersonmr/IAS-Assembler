var lexer = new jslex( {
    "start": {
        "#.*\n": function() {
            return undefined;
        },
        "[a-zA-Z_][0-9a-zA-Z_]*:": function() { // labels
            return {type:"label", content: this.text.slice(0,-1)};
        },
        "\\.[a-zA-Z]+ [^#\n]*": function() { // directives
            var splitedText = this.text.replace(",", " ").split(" ").filter(function (e) {
              return e != "";
            });
            return {type: "directive", content: splitedText[0].slice(1),
                    args: splitedText.slice(1)};
        },
        "([a-zA-Z\+]+ +[^#\n]*|[a-zA-Z]+)": function() { // instructions
            var splitedText = this.text.split(" ").filter(function (e) {
              return e != "";
            });
            if(splitedText.length > 1){
              return {type:"inst", content: splitedText[0],
                      arg: splitedText[1].slice(splitedText[1].indexOf("(") + 1,
                      splitedText[1].indexOf(")"))};
            }else{
              return {type:"inst", content: splitedText[0]};
            }
        },
        "[ \t\r\n]": undefined,
        ".": function() {
            throw "Invalid character '" + this.text + "' (line:" + (1 + this.line) + ", column:" + this.column + ")";
        }
    }
} );

function AS() {
  // parser
  var parsedTree = []
  var setTable = []
  var labelTable = []
  var inst = 	{ 'LD'      : function (a, d) { return  "01"           + a; },
                'LDmq'    : function (a, d) { return  "0A 000"          ; },
                'LDmq_mx' : function (a, d) { return  "09"           + a; },
                'LD|'     : function (a, d) { return  "03"           + a; },
                'LD-'     : function (a, d) { return  "02"           + a; },
                'ST'      : function (a, d) { return  "21"           + a; },
                'STaddr'  : function (a, d) { return ["12", "13"][d] + a; },
                'ADD'     : function (a, d) { return  "05"           + a; },
                'ADD|'    : function (a, d) { return  "07"           + a; },
                'SUB'     : function (a, d) { return  "06"           + a; },
                'SUB|'    : function (a, d) { return  "08"           + a; },
                'MUL'     : function (a, d) { return  "0B"           + a; },
                'DIV'     : function (a, d) { return  "0C"           + a; },
                'RSH'     : function (a, d) { return  "15 000"          ; },
                'LSH'     : function (a, d) { return  "14 000"          ; },
                'JMP'     : function (a, d) { return ["0D", "0E"][d] + a; },
                'JUMP+'   : function (a, d) { return ["10", "0F"][d] + a; }
              }


  this.as = function (code){
    code = code.replace("\t", " ");
    function insertInTree(el) {
      if(el){
        if(el.type == "inst" && !(el.content in inst)){
          throw "Invalid instruction " + el.content;
        }
        parsedTree.push(el);
      }
    }
    lexer.lex(code, insertInTree);
    processAddress();
    return generareBinary();
  }



  function processAddress() {
    var addr = 0;
    for (var el in parsedTree) {
      console.log(parsedTree[el])
      parsedTree[el].addr = addr;
      if(parsedTree[el].type == "inst"){
        addr++;
      }else if (parsedTree[el].type == "directive") {
        if(parsedTree[el].content == "set"){
          setTable[parsedTree[el].args[0]] = parseInt(parsedTree[el].args[1]);
          parsedTree[el] = undefined;
        } else {
          parsedTree[el].args[0] = checkTable(setTable, parsedTree[el].args[0]);
          parsedTree[el].args[1] = checkTable(setTable, parsedTree[el].args[1]);
          if(parsedTree[el].content == "org"){
            addr  = 2 * parsedTree[el].args[0];
            parsedTree[el] = undefined;
          }else if (parsedTree[el].content in ["wfill", "skip"]) {
            addr += 2 * parsedTree[el].args[0];
          }else if (parsedTree[el].content == "word") {
            if(addr % 2 != 0){
              throw "Word " + parsedTree[el].args[0] + " is not aligned"
            }
            parsedTree[el].args[1] = parsedTree[el].args[0];
            parsedTree[el].args[0] = 1;
            addr += 2;
          }else if (parsedTree[el].content == "align") {
            addr  = (addr + (2 * parsedTree[el].args[0]) - 1);
            addr -= (addr % (2 * parsedTree[el].args[0]));
            parsedTree[el] = undefined;
          }
          else{
            throw "Invalid directive " + el.content;
          }
        }
      }else if(parsedTree[el].type == "label"){
        labelTable[parsedTree[el].content] = addr;
        parsedTree[el] = undefined;
      }
    }
  }

  function generareBinary() {
    var resultString = ""
    var right = 1;
    console.log(parsedTree);
    for (var el in parsedTree) {
      if(parsedTree[el] == undefined){
        continue; // deleted elements (labels, orgs, set...)
      }

      console.log(parsedTree[el])
      if(parsedTree[el].addr % 2 == 0){ // address printing
        if(!right) resultString += " 00 000"
        resultString += "\n"
        resultString += pad(Math.floor(parsedTree[el].addr / 2));
        right = 0;
      }else {
        right = 1;
      }
      resultString += " ";
      if(parsedTree[el].type == "inst"){
        parsedTree[el].arg = checkTable(labelTable, parsedTree[el].arg);
        var target = " " + pad(Math.floor(parsedTree[el].arg / 2));
        var d = parsedTree[el].arg % 2;
        resultString += inst[parsedTree[el].content](target, d);
      }else{ // word or wfill
        parsedTree[el].args[1] = checkTable(labelTable, parsedTree[el].args[1]);
        for (var i = 0; i < parsedTree[el].args[0]; i++) {
          resultString += pad(parsedTree[el].args[1], 10);
        }
        right = 1;
      }
    }
    return resultString;
  }

  function checkTable(table, name) {
    var target = parseInt(name);
    if(isNaN(target)){
      if(table[name] != undefined){
        return table[name];
      }
      return name; // label or undefined
    }
    return target;
  }

  function pad(number, n) {
    if(n == undefined) n = 3;
    var strNum = number.toString(16).padStart(n, "0");
    if (strNum.length == 10) {
      return strNum.slice(0, 2) + " " + strNum.slice(2, 5 ) + " " +
             strNum.slice(5, 7) + " " + strNum.slice(7, 10);
    }
    return strNum;
  }
}

code =
".set INICIO 0x000 # teste\n\
.org INICIO\n\
laco:\n\
LD  \t(x1)\n\
laco2:\n\
ADD (x2) # adasd daas dfa labelerrado:\n\
JMP (cont)\n\
.align 1\n\
cont:\n\
RSH\n\
ST (av) # .direrrada\n\
JUMP+ (laco2)\n\
.align 1\n\
x1: .word 0000000000\n\
x2: .word 0000000002 # 908\n\
av: .word 0000000000 # _aaa\n\
vm: .word x1"

var a = new AS();
console.log(a.as(code))
