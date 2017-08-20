// Copyright (c) 2016 Giuliano Sider

var IAS = (function () { // this module encapsulates the IAS machine and the associated RAM
/* the module provides the following services via its API:

	reset()
	zeroAllRegisters()
	zeroAllRAM()
	fetch()
	execute()
	getRAM(address, attribute)
	setRAM(address, attribute, value)
	getCPU(register, attribute)
	setCPU(register, attribute, value)
	dumpRAM()
	dumpCPU()
	loadRAM(memory_map)
	testCases(memMap, testObject, maxtimepertest)


valid memory/register attributes for getRAM, setRAM, getCPU, setCPU orders. case insensitive.
	leftopcode: // number stored in the left opcode field
	leftopcodehex: // string of hex digits in left opcode field
	leftopcodetext: // text of instruction stored in left opcode field
	leftaddr: // number stored in the left address field
	leftaddrhex: // string of hex digits in the left adddress field
	leftinstruction: // number stored in left instruction field
	leftinstructionhex: // string of hex digits stored in left instruction field
	leftinstructiontext: // text of the instruction stored in left instruction field
	rightopcode: // SAME AS ABOVE, BUT ON THE RIGHT SIDE
	rightopcodehex:
	rightopcodetext:
	rightaddr:
	rightaddrhex:
	rightinstruction:
	rightinstructionhex:
	rightinstructiontext:
	wordvalue: // (2's complement) number stored in the entire word
	wordvaluehex: // string of hex digits of number stored in the entire word

*/

	// default initialization code
	// constants
	var RAM_SIZE = 1024; // words in memory
	var POW_OF_2 = []; // unfortunately we can't rely on bitwise ops (they convert to 32 bit integer)
	for (i = 0, p = 1; i <= 40; i++, p *= 2) {
		POW_OF_2[i] = p;
	}

	// registers and memory
	var reg = {};
	reg.ctrl = "left_fetch";
	reg.ir = 0; // 8 bit
	reg.pc = reg.mar = 0; // 12 bit
	reg.ibr = 0; // 20 bit
	reg.mbr = reg.ac = reg.mq = 0; // 40 bit

	var ram = [];
	for (i = 0; i < RAM_SIZE; i++) {
		ram[i] = 0; //Math.floor(Math.random() * POW_OF_2[40]); // crazy RAM initialization
	}

	var identityfunction = function (x) {return x};

	// return value's "bits" from lsb to lsb+numbits-1 (convention: lsb 0)
	// bits requested should be in range 0-39
	var selectBits = function (value, lsb, numbits) { 
		return Math.floor(value / POW_OF_2[lsb]) % POW_OF_2[numbits];
	};

	// left pads a string (str) with amt padchars
	var leftPadWithChar = function (str, padchars, amt) {
		var result = "";
		for (var i = 0; i < amt; i++) {
			result += padchars;
		}
		return result + str;
	}

	var leftJustifyString = function (str, minwidth, padchar) {
		if (str.length < minwidth) {
			str = leftPadWithChar(str, padchar || " ", minwidth - str.length);
		}
		return str;
	}

	var eliminateWhitespace = function (str) {
		var whitespace = /[\s]/g; // g flag for global replacement of whitespace chars
		return str.replace(whitespace, ""); // whitespace -> (empty string)
	}
	//var whitespaces = "[\\s]+"; // we want to replace a sequence of whitespaces with a single space
	//var possibleWhitespaces = "[\\s]*"

	// validation functions that throw exceptions:
	// makes sure that we are fetching an instruction from a valid address
	var validateInstructionFetch = function () {
		if (typeof ram[reg.pc] !== "number") { // if it's not a valid (initialized) position in RAM
			throw {
				name: "invalidFetchAddr", // used for proper program termination (i.e. jump to 0x400)
				message: "Attempt to fetch an instruction at an invalid address:\n" +
					     "0x" + reg.pc.toString(16).toUpperCase()
			};
		}
		validateDataRange(reg.pc);
	};

	// make sure we are accessing a valid address in RAM
	var validateDataAccess = function (addr) {
		if (typeof ram[addr] !== "number") { // if it's not a valid (initialized) position in RAM
			throw {
				name: "invalidAccess",
				message: "Attempt to access data at an invalid address:\n" +
					     "0x" + addr.toString(16).toUpperCase()
			};
		}
		validateDataRange(addr);
	};

	// make sure memory value is an integer in the appropriate range
	var validateDataRange = function (addr) { // defensive debugging
		if (ram[addr] < 0 || ram[addr] >= POW_OF_2[40] || ram[addr] !== Math.floor(ram[addr])) {
			throw {
				name: "invalidData",
				message: "Attempt to access invalid data\n" +
				         ram[addr] + "\nat address\n" +
				         "0x" + addr.toString(16).toUpperCase()
			};
		}
	}

	// make sure num is an integer in the appropriate range
	var validateNumRange = function (num, range) { // defensive debugging
		if (num < 0 || num >= range || num !== Math.floor(num)) {
			throw {
				name: "invalidNumber",
				message: "Attempt to use a number that's not an integer out of bounds:\n" +
				         num + "\nnot in range [0, " + range + ")"
			};
		}
	}

	// "CTRL" register is just the fetch/execute cycle state of the CPU
	var validCtrlStates = {
		"left_fetch": true, // fetch a left instruction from RAM
		"right_fetch": true, // fetch a right instruction from IBR
		"right_fetch_RAM": true, // fetch a right instruction from RAM (after a jump to the right)
		"left_execute": true, // execute a left instruction that's been fetched
		"right_execute": true // execute a right instruction that's been fetched
	};


	var blankinstruction = "NO INSTRUCTION    "; // 18 chars wide
	// all known IAS instructions:
	var instructions = []
	instructions[1] = {
		name: "LOAD M(X)",
		execute: function () {
			validateDataAccess(reg.mar);
			reg.mbr = ram[reg.mar];
			reg.ac = reg.mbr;
		}
	};
	instructions[2] = {
		name: "LOAD -M(X)",
		execute: function () {
			validateDataAccess(reg.mar);
			reg.mbr = ram[reg.mar];
			reg.ac = (POW_OF_2[40] - reg.mbr) % POW_OF_2[40];
		}
	};
	instructions[3] = {
		name: "LOAD |M(X)|",
		execute: function () {
			validateDataAccess(reg.mar);
			reg.ac = reg.mbr = ram[reg.mar];
			if (reg.mbr >= POW_OF_2[39]) { // if the number is negative
				reg.ac = POW_OF_2[40] - reg.ac; // then negate it
			}
		}
	};
	instructions[5] = {
		name: "ADD M(X)",
		execute: function () {
			validateDataAccess(reg.mar);
			reg.mbr = ram[reg.mar]
			reg.ac = (reg.ac + reg.mbr) % POW_OF_2[40];
		}
	};
	instructions[6] = {
		name: "SUB M(X)",
		execute: function () {
			validateDataAccess(reg.mar);
			reg.mbr = ram[reg.mar]
			reg.ac = (reg.ac + POW_OF_2[40] - reg.mbr) % POW_OF_2[40];
		}
	};
	instructions[7] = {
		name: "ADD |M(X)|",
		execute: function () {
			validateDataAccess(reg.mar);
			var tmp;
			tmp = reg.mbr = ram[reg.mar];
			if (reg.mbr >= POW_OF_2[39]) { // if the number is negative
				tmp = POW_OF_2[40] - reg.mbr; // then negate it
			}
			reg.ac = (reg.ac + tmp) % POW_OF_2[40];
		}
	};
	instructions[8] = {
		name: "SUB |M(X)|",
		execute: function () {
			validateDataAccess(reg.mar);
			var tmp;
			tmp = reg.mbr = ram[reg.mar];
			if (reg.mbr < POW_OF_2[39]) { // if the number is positive
				tmp = POW_OF_2[40] - reg.mbr; // then negate it
			}
			reg.ac = (reg.ac + tmp) % POW_OF_2[40];
		}
	};
	instructions[9] = {
		name: "LOAD MQ,M(X)",
		execute: function () {
			validateDataAccess(reg.mar);
			reg.mbr = ram[reg.mar];
			reg.mq = reg.mbr;
		}
	};
	instructions[10] = {
		name: "LOAD MQ",
		execute: function () {
			reg.ac = reg.mq;
		}
	};
	instructions[11] = { // signed multiplication: AC:MQ (in 2's complement) <- MQ * MEM[X] (also in 2's complement)
		name: "MUL M(X)",
		execute: function () {
			// reduce to unsigned multiplication with two 20 bit chunks. can you come up with a more elegant way?
			validateDataAccess(reg.mar);
			var tmp;
			tmp = reg.mbr = ram[reg.mar];
			if (tmp === 0 || reg.mq === 0) { // we treat this case separately to avoid problems with 2's complement later on
				reg.ac = reg.mq = 0;
				return;
			}
			var sign = 1;
			if (reg.mq >= POW_OF_2[39]) { // if MQ is negative
				sign *= -1;
				reg.mq = POW_OF_2[40] - reg.mq; // negate it
			}
			if (tmp >= POW_OF_2[39]) { // if memory operand is negative
				sign *= -1;
				tmp = POW_OF_2[40] - tmp; // negate it
			}

			var uppermq = selectBits(reg.mq, 20, 20);
			var lowermq = selectBits(reg.mq, 0, 20);
			var uppermem = selectBits(tmp, 20, 20);
			var lowermem = selectBits(tmp, 0, 20);

			reg.ac = uppermq * uppermem; // AC takes the upper 40 bits
			reg.mq = lowermq * lowermem; // MQ takes the lower 40 bits
			tmp = uppermq * lowermem;
			var tmp2 = uppermem * lowermq;
			reg.ac += selectBits(tmp, 20, 20) + selectBits(tmp2, 20, 20); // upper half of cross terms goes into  most significant register
			reg.mq += POW_OF_2[20] * (selectBits(tmp,  0, 20) + selectBits(tmp2,  0, 20)); // lower half of cross terms goes into least significant register
			// can we really get a carry in the lower register? i'm putting this just in case:
			if (reg.mq >= POW_OF_2[40]) { // if we get a carry in MQ
				//console.log("we got a carry of 0x" + Math.floor(reg.mq / POW_OF_2[40]).toString(16).toUpperCase() + " during a MUL M(X) op"); // debug
				reg.ac += Math.floor(reg.mq / POW_OF_2[40]); // bits that carried go to the upper register
				reg.mq = reg.mq % POW_OF_2[40];
			}
			if (sign === -1) { // if the result is negative, we'll akwardly obtain the 2's complement of AC:MQ. spec isn't clear. 2's complement doesn't make much sense for multi-word arith
				if (reg.mq !== 0) { // if the lower register won't carry ("borrow")
					reg.mq--;
				} else { // we have a carry ("borrow")
					reg.ac--;
					reg.mq = POW_OF_2[40] - 1;
				}
				reg.ac = POW_OF_2[40] - 1 - reg.ac; // one's complement the registers
				reg.mq = POW_OF_2[40] - 1 - reg.mq;
			}
		}
	};
	instructions[12] = { // signed divide: MQ <- AC / MEM[X], AC <- AC % MEM[X]
		name: "DIV M(X)", // quotient rounds towards zero, remainder assumes the sign of the dividend
		execute: function () {
			// reduces to an unsigned division
			validateDataAccess(reg.mar);
			var tmp;
			tmp = reg.mbr = ram[reg.mar];
			if (tmp === 0) { // division by zero
				throw {
					name: "arithmeticException",
					message: "Attempt to divide by zero from value at address 0x" +
					         reg.mar.toString(16).toUpperCase()
				};
			}
			var sign = 1;
			if (reg.ac >= POW_OF_2[39]) { // if MQ is negative
				sign *= -1;
				reg.ac = POW_OF_2[40] - reg.ac; // negate it
			}
			if (tmp >= POW_OF_2[39]) { // if memory operand is negative
				sign *= -1;
				tmp = POW_OF_2[40] - tmp; // negate it
			}
			reg.mq = Math.floor(reg.ac / tmp); // MQ takes the quotient
			if (sign === -1) {
				reg.mq = POW_OF_2[40] - reg.mq; // quotient is negative
			}
			if (reg.ac >= POW_OF_2[39]) { // if the dividend is negative
				reg.ac = reg.ac % tmp;
				reg.ac = POW_OF_2[40] - reg.ac; // negate the remainder
			} else {
				reg.ac = reg.ac % tmp;
			}
		}
	};
	instructions[13] = {
		name: "JUMP M(X,0:19)", // bit convention: MSB 0
		execute: function () {
			reg.pc = reg.mar;
			reg.ctrl = "left_fetch";
		}
	};
	instructions[14] = {
		name: "JUMP M(X,20:39)",
		execute: function () {
			reg.pc = reg.mar;
			reg.ctrl = "right_fetch_RAM";
		}
	};
	instructions[15] = {
		name: "JUMP+ M(X,0:19)",
		execute: function () {
			if (reg.ac < POW_OF_2[39]) { // if AC is non negative, we jump
				reg.pc = reg.mar;
				reg.ctrl = "left_fetch";
			}
			else {
				if (reg.ctrl === "left_execute") {
					reg.ctrl = "right_fetch";
				}
				else { // we executed an instruction at the right
					reg.ctrl = "left_fetch";
			    }
			}
		}
	};
	instructions[16] = {
		name: "JUMP+ M(X,20:39)",
		execute: function () {
			if (reg.ac < POW_OF_2[39]) { // if AC is non negative, we jump
				reg.pc = reg.mar;
				reg.ctrl = "right_fetch_RAM";
			}
			else {
		    	if (reg.ctrl === "left_execute") {
					reg.ctrl = "right_fetch";
				} 
				else { // we executed an instruction at the right
					reg.ctrl = "left_fetch";
			    }
			}
		}
	};
	instructions[18] = {
		name: "STOR M(X,8:19)",
		execute: function () {
			// replace address field of left instruction in memory by the 12 least significant bits of AC
			validateDataAccess(reg.mar);
			reg.mbr = POW_OF_2[20] * selectBits(reg.ac, 0, 12); // tranfer the 12 lower bits of AC to MBR for mem write. everything else is zero
			var addr_field = POW_OF_2[20] * selectBits(ram[reg.mar], 20, 12);
			ram[reg.mar] += reg.mbr - addr_field; // replaces the original address field in memory with the one in MBR
		}
	};
	instructions[19] = {
		name: "STOR M(X,28:39)",
		execute: function () {
			// replace address field of right instruction in memory by the 12 least significant bits of AC
			validateDataAccess(reg.mar);
			reg.mbr = selectBits(reg.ac, 0, 12); // tranfer the right address field of AC to MBR for mem write. everything else is zero
			var addr_field = selectBits(ram[reg.mar], 0, 12);
			ram[reg.mar] += reg.mbr - addr_field; // replaces the original address field in memory with the one in MBR
		}
	};
	instructions[20] = {
		name: "LSH",
		execute: function () {
			reg.ac = (reg.ac * 2) % POW_OF_2[40];
		}
	};
	instructions[21] = {
		name: "RSH",
		execute: function () {
			reg.ac = Math.floor(reg.ac / 2);
		}
	};
	instructions[33] = {
		name: "STOR M(X)",
		execute: function () {
			validateDataAccess(reg.mar);
			ram[reg.mar] = reg.mbr = reg.ac;
		}
	};

	var mapInstructionNameToOpcode = {}; // EX: "ADDM(X)" -> 5. yes, we do strip the whitespace, which makes the parsing done by instructionStringToBinary easier
	for (var i in instructions) {
		if (instructions.hasOwnProperty(i)) { // for each instruction
			mapInstructionNameToOpcode[eliminateWhitespace(instructions[i].name)] = i; // map the instruction name to the number
		}
	}

	// keep an array of patterns that match each IAS instruction
	var regexpSpecialChars = /[\\\/\[\](){}?+*|.\^$]/g; // we want to escape these special characters in the instruction
	var addrPattern = "(?:0x|0X)?([0-9A-Fa-f]+)"; // captures hexadecimal address
	var instructionPatterns = [];
	for (var i in instructions) {
		if (instructions.hasOwnProperty(i)) { // for each instruction
			// escape each regexp special character in the instruction (like '|')
			var patt = instructions[i].name.replace(regexpSpecialChars, "\\$&"); // '$&' stands for matched text
			patt = eliminateWhitespace(patt); // we match instructions stripped of all whitespace (since it doesn't matter anyway)
			patt = patt.replace("X", addrPattern); // X is the placeholder for address
			instructionPatterns[i] = new RegExp(patt);
		}
	}

		// takes an IAS instruction in text and transforms it to binary form
	var instructionStringToBinary = function(val) {
		var instructiontext = val;
		// we can accept instructions like "JUMPM(0,0:19)". i don't think anyone will call the parsing police on us
		val = eliminateWhitespace(val); 
		// which instruction does this val match?
		var i, opcode, addr, foundInstruction = false;
		for (i in instructionPatterns) {
			if (instructionPatterns.hasOwnProperty(i)) { // for each instruction
				var m = instructionPatterns[i].exec(val);
				if (m !== null) { // if we have a match for instruction i
					addr = m[1]; // we captured the instruction address in the regexp
					foundInstruction = true;
					break;
				}
			}
		}
		if (foundInstruction === false) { // if there is match for the given string
			throw {
				name: "invalidInstructionString",
				message: instructiontext + "\nis not a valid IAS instruction"
			};
		}
		if (addr === undefined) { // if no address was given (since it wasn't required)
			addr = 0; // just keep it zeroed as default
		} else {
			addr = parseInt(addr, 16);
		}
		if (addr >= RAM_SIZE) {
			throw {
				name: "invalidInstructionAddress",
				message: instructiontext + " is an instruction with an invalid address"
			};
		}
		opcode = instructions[i];

		return opcode * POW_OF_2[12] + addr;
	};

	// valid attributes to use for IAS/memory queries (getRAM, getCPU) 
	// and insertions (setRAM, setCPU)
	// "val" refers to (javascript format) number, hex string, or instruction string which is user input.
	// "field" refers to left opcode, left address, etc... and it's part of a register or memory word,
	// which are themselves javascript numbers between 0 and 2^40 - 1.
	// the 'validate' property is a function that returns true if the value is valid for insertion into the field.
	var validAttributes = {
		leftopcode: {
			lsb:32, numbits:8,
			convertValToField: identityfunction, convertFieldToVal: identityfunction,
			validObj: {ram:true,ir:true,ibr:true,mbr:true,ac:true,mq:true},
			validate: function(val) {return instructions[val] !== undefined ? true : false}
		},
		leftopcodehex: {
			lsb:32, numbits:8, 
			convertValToField: function(val) {return parseInt(val, 16)},
			validObj: {ram:true,ir:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 2 - s.length); // 2 hex digits in opcode field
			},
			validate: function(val) {return instructions[val] !== undefined ? true : false}
		},
		leftopcodetext: {
			lsb:32, numbits:8,
			convertValToField: function(val) {
				return mapInstructionNameToOpcode[eliminateWhitespace(val)]
			},
			validObj: {ram:true,ir:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				if (instructions[field] === undefined) {
					return blankinstruction;
				}
				else {
					return instructions[field].name
				}
			},
			validate: function(val) {return instructions[val] !== undefined ? true : false}
		},
		rightopcode: {
			lsb:12, numbits:8,
			validObj: {ram:true,ir:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: identityfunction, convertFieldToVal: identityfunction,
			validate: function(val) {return instructions[val] !== undefined ? true : false}
		},
		rightopcodehex: {
			lsb:12, numbits:8, 
			convertValToField: function(val) {return parseInt(val, 16)},
			validObj: {ram:true,ir:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 2 - s.length); // 2 hex digits in opcode field
			},
			validate: function(val) {return instructions[val] !== undefined ? true : false}
		},
		rightopcodetext: {
			lsb:12, numbits:8,
			convertValToField: function(val) {
				return mapInstructionNameToOpcode[eliminateWhitespace(val)]
			},
			validObj: {ram:true,ir:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
			    if (instructions[field] === undefined) {
					return blankinstruction;
			    }
			    else {
					return instructions[field].name;
			    }
			},
			validate: function(val) {return instructions[val] !== undefined ? true : false}
		},

		leftaddr: {
			lsb:20, numbits:12,
			validObj: {ram:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: identityfunction, convertFieldToVal: identityfunction,
			validate: function(val) {
				return (val < POW_OF_2[12] && val >= 0 && val === Math.floor(val)) ? true : false
			}
		},
		leftaddrhex: {lsb:20, numbits:12, 
			convertValToField: function(val) {return parseInt(val, 16)},
			validObj: {ram:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 3 - s.length); // 3 hex digits in address field
			},
			validate: function(val) {
				return (val < POW_OF_2[12] && val >= 0 && val === Math.floor(val)) ? true : false
			}
		},
		rightaddr: {
			lsb:0, numbits:12,
			validObj: {ram:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: identityfunction, convertFieldToVal: identityfunction,
			validate: function(val) {
				return (val < POW_OF_2[12] && val >= 0 && val === Math.floor(val)) ? true : false
			}
		},
		rightaddrhex: {
			lsb:0, numbits:12, 
			convertValToField: function(val) {return parseInt(val, 16)},
			validObj: {ram:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 3 - s.length); // 3 hex digits in address field
			},
			validate: function(val) {
				return (val < POW_OF_2[12] && val >= 0 && val === Math.floor(val)) ? true : false
			}
		},

		leftinstruction: {
			lsb:20, numbits:20,
			validObj: {ram:true,ir:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: identityfunction, convertFieldToVal: identityfunction
		},
		leftinstructionhex: {
			lsb:20, numbits:20, 
			convertValToField: function(val) {return parseInt(val, 16)},
			validObj: {ram:true,ir:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 5 - s.length); // 5 hex digits in instruction field
			},
		},
		leftinstructiontext: {
			lsb:20, numbits:20,
			validObj: {ram:true,ir:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: instructionStringToBinary,
			convertFieldToVal: function(field) { // obtain the instruction text with the address (if applicable) plugged in
				var opcode = selectBits(field, 12, 8);
				if (instructions[opcode] === undefined) {
					return blankinstruction;
				}
				else {
					return instructions[opcode].name.replace("X", "0x" + selectBits(field, 0, 12).toString(16).toUpperCase())
				}
			}
		},
		rightinstruction: {
			lsb:0, numbits:20,
			validObj: {ram:true,ir:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: identityfunction, convertFieldToVal: identityfunction
		},
		rightinstructionhex: {
			lsb:0, numbits:20, 
			convertValToField: function(val) {return parseInt(val, 16)},
			validObj: {ram:true,ir:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 5 - s.length); // 5 hex digits in instruction field
			},
		},
		rightinstructiontext: {
			lsb:0, numbits:20,
			validObj: {ram:true,ir:true,mar:true,pc:true,ibr:true,mbr:true,ac:true,mq:true},
			convertValToField: instructionStringToBinary,
			convertFieldToVal: function(field) { // obtain the instruction text with the address (if applicable) plugged in
				var opcode = selectBits(field, 12, 8);
				if (instructions[opcode] === undefined) {
					return blankinstruction;
				}
				else {
					return instructions[opcode].name.replace("X", "0x" + selectBits(field, 0, 12).toString(16).toUpperCase())
				}
			}
		},

		wordvalue: {
			lsb:0, numbits:40,
			validObj: {mbr:true,ac:true,mq:true},
			convertValToField: function(val) {
				if (val < 0) { // javascript number could be negative
					val = -val;
					val = POW_OF_2[40] - val; // javascript number -> 2's complement
				}
				return val;
			},
			convertFieldToVal: function(field) {
				if (field >= POW_OF_2[39]) { // if the number is negative
					field = POW_OF_2[40] - field; // then 2's complement it
					field = -field;
				}
				return field;
			},
			validate: function(val) {
				return (val < POW_OF_2[40] && val >= 0 && val === Math.floor(val)) ? true : false
			}
		},
		wordvaluehex: {
			lsb:0, numbits:40,
			validObj: {mbr:true,ac:true,mq:true},
			convertValToField: function(val) {return parseInt(val, 16)},
			convertFieldToVal: function(field) {
				var s = field.toString(16).toUpperCase();
				return leftPadWithChar(s, "0", 10 - s.length); // 10 hex digits in a word
			},
			validate: function(val) {
				return (val < POW_OF_2[40] && val >= 0 && val === Math.floor(val)) ? true : false
			}
		}

	};

	/*
	// returns an object with all possible attributes of a 40 bit word. NOT ACTUALLY USED
	var getWordAttributes = function (word) {

		var blankinstruction = "                    "; // 20 spaces
		var attributes = {};

		attributes.leftopcode = selectBits(word, 32, 8);
		attributes.leftopcodehex = attributes.leftopcode.toString(16).toUpperCase();
		attributes.leftopcodetext = instructions[attributes.leftopcode] !== undefined ? instructions[attributes.leftopcode].name : blankinstruction;

		attributes.rightopcode = selectBits(word, 12, 8);
		attributes.rightopcodehex = attributes.rightopcode.toString(16).toUpperCase();
		attributes.rightopcodetext = instructions[attributes.rightopcode] !== undefined ? instructions[attributes.rightopcode].name : blankinstruction;

		attributes.leftaddr = selectBits(word, 20, 12);
		attributes.leftaddrhex = attributes.leftaddr.toString(16).toUpperCase();

		attributes.rightaddr = selectBits(word, 0, 12);
		attributes.rightaddrhex = attributes.rightaddr.toString(16).toUpperCase();

		attributes.leftinstruction = selectBits(word, 20, 20);
		attributes.leftinstructionhex = attributes.leftinstruction.toString(16).toUpperCase();
		attributes.leftinstructiontext = instructions[attributes.leftopcode] !== undefined ? instructions[attributes.leftopcode].name.replace('X', "0x" + attributes.leftaddrhex) : blankinstruction;

		attributes.rightinstruction = selectBits(word, 0, 20);
		attributes.rightinstructionhex = attributes.rightinstruction.toString(16).toUpperCase();
		attributes.rightinstructiontext = instructions[attributes.rightopcode] !== undefined ? instructions[attributes.rightopcode].name.replace('X', "0x" + attributes.rightaddrhex) : blankinstruction;

		attributes.wordvalue = word >= POW_OF_2[39] ? POW_OF_2[40] - word : word; // if word is negative, get the 2's complement
		attributes.wordvaluehex = word.toString(16).toUpperCase();

		return attributes;
	};
	*/

	// IAS public methods:

	// this is the CPU state you are guaranteed at startup
	var reset = function () {
		reg.ctrl = "left_fetch";
		reg.pc = 0;
	};

	// completely reset all the registers
	var zeroAllRegisters = function () {
		reg.pc = reg.mar = reg.ir = reg.ibr = reg.mbr = reg.ac = reg.mq = 0;
		reg.ctrl = "left_fetch";
	};

	var zeroAllRAM = function () {
		for (var i = 0; i < RAM_SIZE; i++) {
			ram[i] = 0;
		}
	};

	// fetches an instruction (pointed to by PC or in IBR)
	var fetch = function () {
		
		if (reg.ctrl === "left_fetch") {
			validateInstructionFetch();
			reg.mar = reg.pc;
			reg.mbr = ram[reg.mar];
			reg.ir = selectBits(reg.mbr, 32, 8);
			reg.mar = selectBits(reg.mbr, 20, 12);
			reg.ibr = selectBits(reg.mbr, 0, 20);
			reg.ctrl = "left_execute";
		} else if (reg.ctrl === "right_fetch") {
			reg.ir = selectBits(reg.ibr, 12, 8);
			reg.mar = selectBits(reg.ibr, 0, 12);
			reg.pc++;
			reg.ctrl = "right_execute";
		} else if (reg.ctrl === "right_fetch_RAM") { // after a jump to the right
			validateInstructionFetch();
			reg.mar = reg.pc;
			reg.mbr = ram[reg.mar];
			reg.ir = selectBits(reg.mbr, 12, 8);
			reg.mar = selectBits(reg.mbr, 0, 12);
			reg.pc++;
			reg.ctrl = "right_execute";
		} else {
			throw {
				name: "invalidFetchDuringExecute",
				message: "Invalid attempt to fetch an instruction during an execute cycle. reg.ctrl = "+ reg.ctrl
			};
		}

	};

	// executes an instruction (that's already been fetched)
	var execute = function () {

		if (reg.ctrl.indexOf("execute") === -1) { // if not an execute cycle
			throw {
				name: "invalidExecutionDuringFetch",
				message: "invalid attempt to execute an instruction during a fetch cycle"
			};
		}
		
		if (instructions[reg.ir] !== undefined) { // if the instruction exists
			instructions[reg.ir].execute();

			// now make sure we will execute the correct fetch cycle:
			if (instructions[reg.ir].name.indexOf("JUMP") === -1) { // if it's not a jump instruction
				if (reg.ctrl === "left_execute") {
					reg.ctrl = "right_fetch";
				} else { // we executed an instruction at the right
					reg.ctrl = "left_fetch";
				}
			}
			// else if it is a jump instruction, then we take care of it at the specific instruction's code
			
		} else { // non existent opcode
			throw {
				name: "invalidInstruction",
				message: "Attempt to execute an instruction with invalid opcode\n" +
					     reg.ir + " at address \n0x" + 
					     (reg.ctrl === "left_execute" ? reg.pc : reg.pc-1).toString(16).toUpperCase()
			}; // note: IAS handout says we should increment PC only in the right fetch cycle - hence the check above
		}

	};

	// query an attribute (prop) of a word in memory. see list of attributes above
	var getRAM = function (addr, prop) {

		validateDataAccess(addr);
		var attr = prop.toLowerCase();
		var attrInfo = validAttributes[attr];
		if (attrInfo === undefined) { // if prop is not a valid property for a 40 bit word
			throw {
				name: "invalidMemoryAttribute",
				message: "The specified attribute " + prop + " is not valid for a 40 bit word in RAM"
			};
		}
		return attrInfo.convertFieldToVal(selectBits(ram[addr], attrInfo.lsb, attrInfo.numbits));
	};

	// query an attribute (prop) of a CPU register. see list of allowed attributes above
	var getCPU = function (register, prop) {
		register = register.toLowerCase();
		if (register === "ctrl") { // CTRL is just the fetch/execute cycle state
			return reg.ctrl;
		}
		prop = prop.toLowerCase();
		if (register === "ir" || register === "ibr" || register === "pc" || register === "mar") {
			prop = prop.replace("left", "right"); // user can use 'left' in this case, even though there is only one side
		}
	    //console.log("prop = "+prop);
		var attrInfo = validAttributes[prop];
		if (reg[register] === undefined) { // if there is no such register
			throw {
				name: "invalidRegister",
				message: "Specified register " + register + " is not part of the IAS architecture"
			};
		}
		if (attrInfo === undefined || attrInfo.validObj[register] === undefined) { // if prop is not a valid property for the selected register
			throw {
				name: "invalidCPURegisterAttribute",
				message: "The specified attribute " + prop + " is not valid for the register " + register
			};
		}
		var word = reg[register];
		var lsb = register === "ir" ? 0 : attrInfo.lsb; // IR's opcode field actually starts at bit 0
   	    //console.log("Word ("+word+") lsb("+lsb+") numbits("+attrInfo.numbits);
		return attrInfo.convertFieldToVal(selectBits(word, lsb, attrInfo.numbits)); // return the desired property
	};

	// assign value to an attribute (prop) of a word in memory
	var setRAM = function (addr, prop, value) {

		validateDataAccess(addr);
		prop = prop.toLowerCase();
		var attr = prop.toLowerCase();
		var attrInfo = validAttributes[attr];
		if (attrInfo === undefined) { // if prop is not a valid property for a 40 bit word
			throw {
				name: "invalidMemoryAttribute",
				message: "The specified attribute " + prop + " is not valid for a 40 bit word in RAM"
			};
		}
		
		var word = attrInfo.convertValToField(value);
		if (attrInfo.validate(word) === false) { // invalid input
			throw {
				name: "invalidAttributeValue",
				message: "The value\n" + value + "\nis not valid for attribute\n" + attr
			};
		}
		var field = selectBits(ram[addr], attrInfo.lsb, attrInfo.numbits); // we want to replace this field
		ram[addr] += POW_OF_2[attrInfo.lsb]*(word - field); // write the replaced value to memory

	};

	// assign a value to an attribute (prop) of a CPU register. see the list above for valid attributes
	var setCPU = function (register, prop, value) {
		register = register.toLowerCase();
		if (register === "ctrl") { // CTRL is just the fetch/execute cycle state
			if (validCtrlStates[value] !== undefined) { // if value is a valid string
				reg.ctrl = value;
				return;
			} else {
				throw {
					name: "invalidCPUState",
					message: "an invalid CPU state string, " + value + ", was specified"
				};
			}
		}
		prop = prop.toLowerCase();

		if (register === "ir" || register === "ibr" || register === "pc" || register === "mar") {
			prop = prop.replace("left", "right"); // user can use 'left' in this case, even though there is only one side
		}

		var attrInfo = validAttributes[prop];
		if (reg[register] === undefined) { // if there is no such register
			throw {
				name: "invalidRegister",
				message: "Specified register " + register + " is not part of the IAS architecture"
			};
		}
		if (attrInfo === undefined || attrInfo.validObj[register] === undefined) { // if prop is not a valid property for the selected register
			throw {
				name: "invalidCPURegisterAttribute",
				message: "The specified attribute " + prop + " is not valid for the register " + register
			};
		}

		var word = attrInfo.convertValToField(value);
		if (attrInfo.validate(word) === false) { // invalid input
			throw {
				name: "invalidCPUAttributeValue",
				message: "The value\n" + value + "\nis not valid for attribute\n" + attr + "\nof register " + register
			};
		}
		var lsb = register === "ir" ? 0 : attrInfo.lsb; // IR's opcode field actually starts a bit 0.
		var field = selectBits(reg[register], lsb, attrInfo.numbits); // we want to replace this field
		reg[register] += POW_OF_2[lsb]*(word - field); // write the replaced value to the register

	};


	// dumps CPU information
	var dumpCPU = function () {
		reg.ir = reg.ir * POW_OF_2[12]; // put IR's "opcode field" in place so we can read it
		var auxfieldwidth = 18;
		var ir_rightopcodehex = leftJustifyString(getCPU("IR", "rightopcodehex"), 2, "0");
		var ir_rightopcodetext = leftJustifyString(getCPU("IR", "rightopcodetext"), auxfieldwidth, " ");
		var mar_rightaddrhex = leftJustifyString(getCPU("MAR", "rightaddrhex"), 3, "0");
		var mar_rightaddr = leftJustifyString(getCPU("MAR", "rightaddr"), auxfieldwidth, " ");
		var pc_rightaddrhex = leftJustifyString(getCPU("PC", "rightaddrhex"), 3, "0");
		var pc_rightaddr = leftJustifyString(getCPU("PC", "rightaddr"), auxfieldwidth, " ");
		var ibr_rightopcodehex = leftJustifyString(getCPU("IBR", "rightopcodehex"), 2, "0");
		var ibr_rightaddrhex = leftJustifyString(getCPU("IBR", "rightaddrhex"), 3, "0");
		var ibr_rightinstructiontext = leftJustifyString(getCPU("IBR", "rightinstructiontext"), 22, " ");

		var mbr_leftopcodehex = leftJustifyString(getCPU("MBR", "leftopcodehex"), 2, "0");
		var mbr_leftaddrhex = leftJustifyString(getCPU("MBR", "leftaddrhex"), 3, "0");
		var mbr_rightopcodehex = leftJustifyString(getCPU("MBR", "rightopcodehex"), 2, "0");
		var mbr_rightaddrhex = leftJustifyString(getCPU("MBR", "rightaddrhex"), 3, "0");
		var mbr_wordvalue = leftJustifyString(getCPU("MBR", "wordvalue"), auxfieldwidth, " ");
		var ac_leftopcodehex = leftJustifyString(getCPU("AC", "leftopcodehex"), 2, "0");
		var ac_leftaddrhex = leftJustifyString(getCPU("AC", "leftaddrhex"), 3, "0");
		var ac_rightopcodehex = leftJustifyString(getCPU("AC", "rightopcodehex"), 2, "0");
		var ac_rightaddrhex = leftJustifyString(getCPU("AC", "rightaddrhex"), 3, "0");
		var ac_wordvalue = leftJustifyString(getCPU("AC", "wordvalue"), auxfieldwidth, " ");
		var mq_leftopcodehex = leftJustifyString(getCPU("MQ", "leftopcodehex"), 2, "0");
		var mq_leftaddrhex = leftJustifyString(getCPU("MQ", "leftaddrhex"), 3, "0");
		var mq_rightopcodehex = leftJustifyString(getCPU("MQ", "rightopcodehex"), 2, "0");
		var mq_rightaddrhex = leftJustifyString(getCPU("MQ", "rightaddrhex"), 3, "0");
		var mq_wordvalue = leftJustifyString(getCPU("MQ", "wordvalue"), auxfieldwidth, " ");

		var returnstring = "IAS:\n" +
		                   "CTRL: " + reg.ctrl + "\n" +
		                   "IR  : " + "          \t      " + "0x" + ir_rightopcodehex + "\t\t" + ir_rightopcodetext + "\n" +
		                   "MAR : " + "          \t     "  + "0x" + mar_rightaddrhex  + "\t\t" + mar_rightaddr      + "\n" +
		                   "PC  : " + "          \t     "  + "0x" + pc_rightaddrhex  + "\t\t"  + pc_rightaddr       + "\n" +
		                   "IBR : " + "          \t" + "0x" + ibr_rightopcodehex + " 0x" + ibr_rightaddrhex + "\t\t" + ibr_rightinstructiontext + "\n" +
		                   "MBR : " + "0x" + mbr_leftopcodehex + " 0x" + mbr_leftaddrhex + "\t0x" + mbr_rightopcodehex + " 0x" + mbr_rightaddrhex + "\t\t" + mbr_wordvalue + "\n" + 
		                   "AC  : " + "0x" + ac_leftopcodehex  + " 0x" + ac_leftaddrhex  + "\t0x" + ac_rightopcodehex  + " 0x" + ac_rightaddrhex  + "\t\t" + ac_wordvalue  + "\n" + 
		                   "MQ  : " + "0x" + mq_leftopcodehex  + " 0x" + mq_leftaddrhex  + "\t0x" + mq_rightopcodehex  + " 0x" + mq_rightaddrhex  + "\t\t" + mq_wordvalue  + "\n";

		reg.ir = Math.floor(reg.ir / POW_OF_2[12]); // undo IR shift done above
		return returnstring;	   
	};

	// returns a memory map (i.e. 000 ab cd ef 01 02 \n 001 cc dd ee ff aa \n ...etc...)
	var dumpRAM = function () {
		var map = ""; // is there a more efficient way to do it JS than by string concatenation?
		var ADDRDIGITS = 3; // our address field is 3 digits wide
	
		for (var i = 0; i < RAM_SIZE; i++) {
			var addr = i.toString(16);
			var line = leftPadWithChar(addr, "0", (ADDRDIGITS - addr.length)); // left pad the address field with zeroes
			line += "\t\t";
			var word = ram[i];
			var f1 = getRAM(i, "leftopcodehex"); // grab left opcode field
			var f2 = getRAM(i, "leftaddrhex"); // grab left address field
			var f3 = getRAM(i, "rightopcodehex"); // grab right opcode field
			var f4 = getRAM(i, "rightaddrhex"); // grab right address field

			line += leftPadWithChar(f1, "0", 2-f1.length) + " "; // opcode field: 2 digits wide
			line += leftPadWithChar(f2, "0", 3-f2.length) + "\t"; // address field: 3 digits wide
			line += leftPadWithChar(f3, "0", 2-f3.length) + " ";
			line += leftPadWithChar(f4, "0", 3-f4.length) + "\n";

			map += line.toUpperCase();
		}
		return map;
	};


	// uses a memory map to insert values into RAM
	// (i.e. 000 ab cd ef 01 02\n 001 cc dd ee ff aa\n ...etc...)
	var loadRAM = function (map) {
		var lines = map.split("\n"); // process each line corresponding to a word in memory
		
		// represents a line with data/instructions: a hex address followed by hex numbers. 
		// whitespace only mandatory for separating the address and the memory value. comments optional. numbers optional.
		var linepattern = /^\s*(?:([0-9a-f]+)\s+([0-9a-f][0-9a-f\s]*))?\s*$/i; 
		
		var whitespace = /\s/g; // represents a single whitespace
		var whitespaceonly = /^\s*$/; // represents a whitespace only string (possibly empty)
		for (var i = 0; i < lines.length; i++) {
			lines[i] = lines[i].replace(/#.*/g, "");
			var m = lines[i].match(linepattern); // capture 1: line addr. capture 2: number (with possible whitespace interspersed)
			if (m === null) { // if the line does match our pattern
				throw {
					name: "invalidMap",
					message: "Line " + (i+1) + " of the memory map is not in the valid format:\n" +
					         "<address> <number> [#comment]" + "\n" +
					         ", where <number> may have any amount of whitespaces, and comments are optional"
				};
			}
			if (!m[1]) { // if we didn't capture a numerical memory map entry
				continue; // nothing to be parsed on this line
			}
			var addr = parseInt(m[1], 16); // capture group 1 is the line address
			var number = parseInt(m[2].replace(whitespace, ""), 16); // eliminate whitespace
			validateDataAccess(addr); // make sure address and number matched are in valid range
			validateNumRange(number, POW_OF_2[40]);
			ram[addr] = number;
		}
	};


	// runs the tests given by testObject on the program given by testObject
	/* sample test object:
		[
			{
				"input": ["105  00 000 00 3e8",
						  "106 01 123 45 678"],
				"output": [{"where": "reg", "position": "ac", "value": 31}]
			},
			{
				"input": ["105  00 40506070"],
				"output": [{"where": "reg", "position": "ac", "value": 32848}]
			},
			{
				"input": ["105  00 000 00 010"],
				"output": [{"where": "reg", "position": "ac", "value": 16}]
			},
			{
				"input": ["105  00 00 1fA098"],
				"output": [{"where": "reg", "position": "ac", "value": 1440},
				           {"where": "ram", "position": 0x212, "value": -3}]
			},
			{
				"input": ["105  00 000 00 01b"],
				"output": [{"where": "ram", "position": 0x3f8, "value": 5}]
			}
		]
	*/ // it'a an array of tests. each test has an "input" attribute, which is an array of strings,
	   // each of which represents a memory map line to load onto IAS. the other attribute is "output",
	   // an array of objects with 'where' (ram or reg), 'position' (register name or memory address),
	   // and 'value' (correct value for the test)
	   // maxcycles is an optional argument specifying the timeout interval for each test, in IAS execution cycles. if not specified, there is no limit
	var testCases = function (memMap, testObject, maxcycles) {
		var outputreport = "# tests executed by IAS on " + (new Date()).toString() + "\n\n"; // do each test in turn
		
		testObject = testObject.replace(/\/\/.*$/gm, "\n"); // strip out '//' comments. don't use it inside of a string!
		
		try {
			var i = 0;
			testObject = JSON.parse(testObject);
			var correcttests = 0;
			for (i = 0; i < testObject.length; i++) { // for each test
				var testresults = "Beginning test " + (i+1) + "\n";
				/*var testmap = memMap;
				for (var j = 0; j < testObject[i].input.length; j++) { // for each input line
					testmap += "\n" + testObject[i].input[j];
				}*/
				IAS.zeroAllRAM();
				IAS.reset();
				IAS.loadRAM(memMap);
				for (var j = 0; j < testObject[i].input.length; j++) { // for each input to the test
					var processinput = testObject[i].input[j], outputvalue;
					if (processinput.where.toLowerCase().indexOf("reg") !== -1) { // if it has a 'reg' in the specification (fault tolerant)
						IAS.setCPU(processinput.position, "wordvalue", parseInt(processinput.value));
					} else { // must be RAM
						IAS.setRAM(parseInt(processinput.position), "wordvalue", parseInt(processinput.value));
					}
				}
				try { // now run the program until an exception fires (for example, invalid instruction or address: jmp m(0xFFFFF) # halts machine)
					var cyclesleft = maxcycles;
					while (1) { // execute until timeout the program throws the CPU into an invalid state
						IAS.fetch();
						IAS.execute();
						if (maxcycles && (--cyclesleft) === 0) {
							throw {name: "timeout", message: "time is up for this test"};
						}
					}
				} catch (ex) { // program is done
					if (ex.name === "timeout") {
						testresults += "\nIAS execution halted after a specified timeout of " + maxcycles + " IAS instruction cycles\n";
					}
					else { // program halted via CPU exception
						testresults += "\nIAS execution terminated after firing the following exception:\n"
							+ "name: " + ex.name + "\nmessage: " + ex.message + "\n";
					}
					testresults += "\n" + IAS.dumpCPU() + "\n\n";
					var correct = 0; // how many correct values in this test
					for (j = 0; j < testObject[i].output.length; j++) { // for each output value to check in this test
						var checkoutput = testObject[i].output[j], outputvalue;
						if (checkoutput.where.toLowerCase().indexOf("reg") !== -1) { // if it has a 'reg' in the specification (fault tolerant)
							outputvalue = IAS.getCPU(checkoutput.position, "wordvalue");
						} else { // must be RAM
							outputvalue = IAS.getRAM(parseInt(checkoutput.position), "wordvalue");
						}
						if (parseInt(checkoutput.value) == outputvalue) { // if the test passes
							correct++;
						}
						testresults += "\tTest " + (i+1) + ", Value " + (j+1) + 
							           ":\tExpected: " + checkoutput.value + "\tActual: " + outputvalue + "\n\n\n";
					}
					testresults += "A total of " + correct + " out of " + testObject[i].output.length +
					               " values matched for test " + (i+1);
					if (correct === testObject[i].output.length) { // if all the values match
						if (ex.name === "invalidFetchAddr") { // the CPU tried to fetch an instruction from an invalid memory address. used for proper program termination
							correcttests++;
							testresults += "\nTEST PASSED";
						} else { 
							testresults += "\nTEST FAILED: INCORRECT TERMINATION" +
							               "\nProgram should finish by jumping to an out of bounds address";
						}
					} else {
						testresults += "\nTEST FAILED";
					}
					testresults += "\n--- -- --- -- ---" + "\n\n\n";
					outputreport += testresults;
				}
			}
			outputreport += "\nSUMMARY ---> " + correcttests + " out of " + testObject.length + " tests passed";
			if (correcttests === testObject.length) { // if all the tests passed
				outputreport += "\nCONGRATULATIONS! ALL TESTS PASSED";
			} else {
				outputreport += "\nNOT ALL TESTS PASSED. PLEASE TRY AGAIN NEXT TIME";
			}
		} catch (e) {
			throw {
				name: "misspecifiedTest",
				message: "failure to load test " + (i+1) + "with the following exception:\n" +
				"name: " + e.name + "\n" + "message: " + e.message
			};
		}

		return outputreport;
	}
	// return the public methods:
	return {
		reset: reset, zeroAllRegisters: zeroAllRegisters, zeroAllRAM: zeroAllRAM,
		fetch: fetch, execute: execute, getRAM: getRAM, setRAM: setRAM,
		getCPU: getCPU, setCPU: setCPU, dumpRAM: dumpRAM, dumpCPU: dumpCPU,
		loadRAM: loadRAM, testCases: testCases
	};
// and that's all folks

}) (); // initialize IAS, define methods and data structures, and return the public methods