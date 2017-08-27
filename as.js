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

            if (splitedText.length > 3 || (splitedText[0].slice(1) == "word" && splitedText.length > 2))
              throw "Too many arguments: '" + this.text + "' (line:" + (1 + this.line) + ", column:" + this.column + ")";

            return {type: "directive", content: splitedText[0].slice(1),
                    args: splitedText.slice(1)};
        },

        "([a-zA-Z\+]+ +[^#\n]*|[a-zA-Z]+)": function() { // instructions
            var splitedText = this.text.split(" ").filter(function (e) {
              return e != "";
            });
            if(splitedText.length > 1){
              // extract argment
              var instArg = "";
              var optArgStr  = undefined;
              if(this.text.includes("(")){
                var startIndex = this.text.indexOf("(") + 1;
                var commaIndex = this.text.indexOf(",", startIndex);
                var endIndex = this.text.indexOf(")", startIndex);
                if(commaIndex != -1){
                  optArgStr = this.text.slice(commaIndex + 1, endIndex).trim();
                  if(optArgStr == "8:19")        { optArgStr = 0; }
                  else if (optArgStr == "0:19" ) { optArgStr = 0; }
                  else if (optArgStr == "28:39") { optArgStr = 1; }
                  else if (optArgStr == "20:39") { optArgStr = 1; }
                  else {
                    throw "Invalid argument: " + optArgStr;
                  }
                  endIndex = commaIndex;
                }
                instArg = this.text.slice(startIndex, endIndex).trim();
              }

              var instMod = "";
              if(splitedText[1][0] != "M"){       // pipe and minus
                instMod = splitedText[1][0];
              }else if(splitedText[1][1] == "Q"){ // LOAD MQ
                instMod = splitedText[1][1];
                if(instArg != "") instMod += "X"; // LOAD MQ MX
              }
              return {type:"inst", content: splitedText[0] + instMod,
                      arg: instArg, optArg: optArgStr};
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
  var inst =  { 'LOAD'    : function (a, d) { return  "01"           + a; },
                'LOADQ'   : function (a, d) { return  "0A 000"          ; },
                'LOADQX'  : function (a, d) { return  "09"           + a; },
                'LOAD|'   : function (a, d) { return  "03"           + a; },
                'LOAD-'   : function (a, d) { return  "02"           + a; },
                'STOR'    : function (a, d) { return  "21"           + a; },
                'STORA'   : function (a, d) { return ["12", "13"][d] + a; },
                'ADD'     : function (a, d) { return  "05"           + a; },
                'ADD|'    : function (a, d) { return  "07"           + a; },
                'SUB'     : function (a, d) { return  "06"           + a; },
                'SUB|'    : function (a, d) { return  "08"           + a; },
                'MUL'     : function (a, d) { return  "0B"           + a; },
                'DIV'     : function (a, d) { return  "0C"           + a; },
                'RSH'     : function (a, d) { return  "15 000"          ; },
                'LSH'     : function (a, d) { return  "14 000"          ; },
                'JUMP'    : function (a, d) { return ["0D", "0E"][d] + a; },
                'JUMP+'   : function (a, d) { return ["0F", "10"][d] + a; }
              }

  this.assemble = function (code) {
    parsedTree = []
    setTable   = []
    labelTable = []
    code       = code.replace("\t", " ");

    function insertInTree(el) {
      if (el) {
        if (el.type == "inst" && !(el.content.toUpperCase() in inst))
          throw "Invalid instruction " + el.content;
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
      debugMsg(parsedTree[el])
      parsedTree[el].addr = addr;
      if (parsedTree[el].type == "inst"){
        addr++;
      } else if (parsedTree[el].type == "directive") {
        if (parsedTree[el].content == "set"){
          setTable[parsedTree[el].args[0]] = parseInt(parsedTree[el].args[1]);
          parsedTree[el] = undefined;
        } else {
          parsedTree[el].args[0] = checkTable(setTable, parsedTree[el].args[0]);
          parsedTree[el].args[1] = checkTable(setTable, parsedTree[el].args[1]);
          if (parsedTree[el].content == "org") {
            addr  = 2 * parsedTree[el].args[0];
            parsedTree[el] = undefined;
          } else if (parsedTree[el].content == "skip") {
            addr += 2 * parsedTree[el].args[0];
            parsedTree[el] = undefined;
          } else if (parsedTree[el].content == "wfill") {
            addr += 2 * parsedTree[el].args[0];
          } else if (parsedTree[el].content == "word") {
            if (addr % 2 != 0){
              throw "Word " + parsedTree[el].args[0] + " is not aligned"
            }
            parsedTree[el].args[1] = parsedTree[el].args[0];
            parsedTree[el].args[0] = 1;
            addr += 2;
          } else if (parsedTree[el].content == "align") {
            addr  = (addr + (2 * parsedTree[el].args[0]) - 1);
            addr -= (addr % (2 * parsedTree[el].args[0]));
            parsedTree[el] = undefined;
          } else {
            throw "Invalid directive " + parsedTree[el].content;
          }
        }
      } else if (parsedTree[el].type == "label") {
        labelTable[parsedTree[el].content] = addr;
        parsedTree[el] = undefined;
      }
    }
  }

  function generareBinary() {
    var resultString = ""
    var right = 1;
    debugMsg(parsedTree);
    for (var el in parsedTree) {
      if(parsedTree[el] == undefined){
        continue; // deleted elements (labels, orgs, set...)
      }

      debugMsg(parsedTree[el])
      if(parsedTree[el].addr % 2 == 0){ // address printing
        if(!right) resultString += " 00 000"
        resultString += "\n"
        resultString += pad(Math.floor(parsedTree[el].addr / 2));
        right = 0;
      } else {
        right = 1;
      }

      resultString += " ";

      if (parsedTree[el].type == "inst") {
        if (isNumber(parsedTree[el].arg))
          parsedTree[el].arg = parsedTree[el].arg * 2;
        else
          parsedTree[el].arg = checkTable(labelTable, parsedTree[el].arg);

        var target = " " + pad(Math.floor(parsedTree[el].arg / 2));
        var d = parsedTree[el].arg % 2;
        if(parsedTree[el].optArg){
          d = parsedTree[el].optArg;
        }
        resultString += inst[parsedTree[el].content.toUpperCase()](target, d);
      } else {
        if (isNumber(parsedTree[el].args[1]))
          parsedTree[el].args[1] *= 2

        parsedTree[el].args[1] = checkTable(labelTable, parsedTree[el].args[1])/2;

        for (var i = 0; i < parsedTree[el].args[0]; i++) {
          if (i > 0)
            resultString += "\n"+pad(Math.floor(parsedTree[el].addr / 2)+i) + " ";
          resultString += pad(parsedTree[el].args[1], 10);
        }

        right = 1;
      }
    }

    if (!right) resultString += " 00 000"

    return (resultString + "\n").toUpperCase();
  }

  function isNumber(name) {
    var target = parseInt(name);
    if (isNaN(target))
      return false
    return true
  }

  function checkTable(table, name) {
    var target = parseInt(name);
    if (isNaN(target)) {
      if (table[name] != undefined)
        return table[name];
      return name; // label or undefined
    }
    return target;
  }

  function pad(number, n) {
    if(n == undefined) n = 3;
    var strNum = number.toString(16).padStart(n, "0");
    if (strNum.length == 10)
      return strNum.slice(0, 2) + " " + strNum.slice(2, 5) + " " +
             strNum.slice(5, 7) + " " + strNum.slice(7, 10);
    return strNum;
  }


  function debugMsg(msg) {
    //console.log(msg)
  }
}
