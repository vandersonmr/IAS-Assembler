/* Loads the memory map into the IAS memory */
var loadMem = function(txt)
{
  // NOTE: loadRAM already does all the text processing, removing comments, whitespace, etc.
  // only requirement is that 
  // 1. there be (non line break) whitespace between the word address and the word content(s), and
  // 2. there be zero or 1 word per line. 
  // Formatting of the word content itself is free. The word content is read as a single (hexadecimal) number, independent of spaces
  // Word address is also read as hex number (but no spaces allowed in the middle). range checking is performed for both
  try {
    IAS.loadRAM(txt);
  } catch (exception) {
    alert("Error loading IAS memory:" + "\n" +
          "exception name: " + exception.name + "\n" +
          "exception message: " + exception.message);
  }
  update_UI_mem_boxes();
};

/* Load from text input */
var loadMapInput = function()
{
  var txt = document.getElementById("memoryMapEntry").value;
  loadMem(txt);
}

/* Load from file loader */
var loadMapFile = function()
{
  var reader = new FileReader();
  var file = document.getElementById("fileload").files[0];
  var txt = "";
  
  reader.onload = function(fileLoadedEvent) {
    var textFromFileLoaded = fileLoadedEvent.target.result;
    txt = textFromFileLoaded;
	loadMem(txt);
  };
  
  reader.readAsText(file, "ISO-8859-1"); // "latin 1"? maybe UTF-8 is preferable?
}

/* Load IAS memory contents into UI memory boxes */
var update_UI_mem_boxes = function()
{
  document.getElementById("mainMemory1").value = IAS.dumpRAM();
  document.getElementById("mainMemory2").value = IAS.dumpRAM();
  document.getElementById("mainMemory3").value = IAS.dumpRAM();
};

/* Update the IAS dataflow diagram */
var update_UI_IAS_dataflow = function(phase)
{
    console.log("Phase => "+phase);
  switch (phase){
    case "ftch_mem":
      update_UI_IAS_dataflow("reset");
      document.getElementById("pc_box").style.fill = "#ff5050";
      document.getElementById("pc_mar").style.stroke = "#ff5050";
      document.getElementById("mar_box").style.fill = "#ff5050";
      document.getElementById("main_box").style.fill = "#ff5050";
      document.getElementById("mar_main").style.stroke = "#ff5050";
      document.getElementById("main_mbr").style.stroke = "#ff5050";
      document.getElementById("mbr_box").style.fill = "#ff5050";
      document.getElementById("ir_box").style.fill = "#ff5050";
      document.getElementById("ibr_box").style.fill = "#ff5050";
      document.getElementById("mbr_ir").style.stroke = "#ff5050";
      document.getElementById("mbr_ibr").style.stroke = "#ff5050";
      
      document.getElementById("ar_pc_mar").style.opacity = "100";
      document.getElementById("ar_mbr_mar").style.opacity = "100";
      document.getElementById("ar_mar_main").style.opacity = "100";
      document.getElementById("ar_main_mbr").style.opacity = "100";
      document.getElementById("ar_mbr_ir").style.opacity = "100";
      document.getElementById("ar_mbr_ibr").style.opacity = "100";
      document.getElementById("ar_mbr_reg").style.opacity = "100";
      break;
    
    case "ftch_ibr":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ibr_box").style.fill = "#ff5050";
      document.getElementById("ir_box").style.fill = "#ff5050";
      document.getElementById("ibr_ir").style.stroke = "#ff5050";
      document.getElementById("pc_box").style.fill = "#ff5050";
      document.getElementById("mar_box").style.fill = "#ff5050";
      document.getElementById("ibr_mar").style.stroke = "#ff5050";
      
      document.getElementById("ar_ibr_ir").style.opacity = "100";
      document.getElementById("plus_one").style.opacity = "100";
      document.getElementById("plus_pc").style.opacity = "100";
      document.getElementById("ar_ibr_mar").style.opacity = "100";
      break;
      
    case "reset":
      document.getElementById("pc_box").style.fill = "#ffffff";
      document.getElementById("pc_mar").style.stroke = "#000000";
      document.getElementById("mar_box").style.fill = "#ffffff";
      document.getElementById("main_box").style.fill = "#ffffff";
      document.getElementById("mar_main").style.stroke = "#000000";
      document.getElementById("main_mbr").style.stroke = "#000000";
      document.getElementById("mbr_box").style.fill = "#ffffff";
      document.getElementById("ir_box").style.fill = "#ffffff";
      document.getElementById("ibr_box").style.fill = "#ffffff";
      document.getElementById("mbr_ir").style.stroke = "#000000";
      document.getElementById("mbr_ibr").style.stroke = "#000000";
      document.getElementById("control_box").style.fill = "#ffffff";
      document.getElementById("ibr_mar").style.stroke = "#000000";
      document.getElementById("ibr_box").style.fill = "#ffffff";
      document.getElementById("ir_box").style.fill = "#ffffff";
      document.getElementById("ibr_ir").style.stroke = "#000000";
      document.getElementById("ir_control").style.stroke ="#000000";
      document.getElementById("ac_box").style.fill = "#ffffff";
      document.getElementById("ula_box").style.fill = "#ffffff";
      document.getElementById("ac_ula").style.stroke = "#000000";
      document.getElementById("ula_ac").style.stroke = "#000000";
      document.getElementById("mq_box").style.fill = "#ffffff";
      document.getElementById("mq_ac").style.stroke = "#000000";
      document.getElementById("ula_mq").style.stroke = "#000000";
      document.getElementById("mq_ula").style.stroke = "#000000";
      document.getElementById("mbr_main").style.stroke = "#000000";
      document.getElementById("mbr_ula").style.stroke = "#000000";
      document.getElementById("ula_mbr").style.stroke = "#000000";
      document.getElementById("mar_pc").style.stroke = "#000000";
      
      document.getElementById("ar_pc_mar").style.opacity = "0";
      document.getElementById("ar_mar_main").style.opacity = "0";
      document.getElementById("ar_main_mbr").style.opacity = "0";
      document.getElementById("ar_mbr_ir").style.opacity = "0";
      document.getElementById("ar_mbr_ibr").style.opacity = "0";
      document.getElementById("ar_ir_control").style.opacity = "0";
      document.getElementById("ar_ibr_ir").style.opacity = "0";
      document.getElementById("ar_ac_ula").style.opacity = "0";
      document.getElementById("ar_ula_ac").style.opacity = "0";
      document.getElementById("ar_ula_mq").style.opacity = "0";
      document.getElementById("ar_mq_ula").style.opacity = "0";
      document.getElementById("ar_mbr_main").style.opacity = "0";
      document.getElementById("ar_mar_pc").style.opacity = "0";
      document.getElementById("ar_mbr_reg").style.opacity = "0";
      document.getElementById("ar_mbr_ula").style.opacity = "0";
      document.getElementById("ar_ula_mbr").style.opacity = "0";
      document.getElementById("plus_one").style.opacity = "0";
      document.getElementById("plus_pc").style.opacity = "0";
      document.getElementById("control_ula").style.opacity = "0";
      document.getElementById("ar_ibr_mar").style.opacity = "0";
      document.getElementById("ar_mq_ac").style.opacity = "0";
      document.getElementById("ar_mbr_mar").style.opacity = "0";
      break;
    
    case "exec_addsub":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#0066ff";
      document.getElementById("ula_box").style.fill = "#0066ff";
      document.getElementById("ac_ula").style.stroke = "#0066ff";
      document.getElementById("ula_ac").style.stroke = "#0066ff";
      document.getElementById("mbr_box").style.fill = "#0066ff";
      document.getElementById("main_box").style.fill = "#0066ff";
      document.getElementById("main_mbr").style.stroke = "#0066ff";
      document.getElementById("mbr_ula").style.stroke = "#0066ff";
      document.getElementById("mar_box").style.fill = "#0066ff";
      document.getElementById("mar_main").style.stroke = "#0066ff";
      
      document.getElementById("ar_mbr_ula").style.opacity = "100";
      document.getElementById("ar_main_mbr").style.opacity = "100";
      document.getElementById("ar_ac_ula").style.opacity = "100";
      document.getElementById("ar_ula_ac").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";
      document.getElementById("ar_mar_main").style.opacity = "100";
      break;
    
    case "exec_loadmq":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#0066ff";
      document.getElementById("mq_box").style.fill = "#0066ff";
      document.getElementById("mq_ac").style.stroke = "#0066ff";
      
      document.getElementById("ar_mq_ac").style.opacity = "100";
      break;
    
    case "exec_muldiv":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#0066ff";
      document.getElementById("mq_box").style.fill = "#0066ff";
      document.getElementById("mq_ac").style.stroke = "#0066ff";
      document.getElementById("ula_mq").style.stroke = "#0066ff";
      document.getElementById("mq_ula").style.stroke = "#0066ff";
      document.getElementById("ula_box").style.fill = "#0066ff";
      document.getElementById("ula_ac").style.stroke = "#0066ff";  
      document.getElementById("mbr_box").style.fill = "#0066ff";
      document.getElementById("main_box").style.fill = "#0066ff";
      document.getElementById("mar_box").style.fill = "#0066ff";
      document.getElementById("mar_main").style.stroke = "#0066ff";
      document.getElementById("main_mbr").style.stroke = "#0066ff";
      document.getElementById("mbr_ula").style.stroke = "#0066ff";
      
      document.getElementById("ar_mbr_ula").style.opacity = "100";
      document.getElementById("ar_main_mbr").style.opacity = "100";
      document.getElementById("ar_ula_mq").style.opacity = "100";
      document.getElementById("ar_mq_ula").style.opacity = "100";
      document.getElementById("ar_ula_ac").style.opacity = "100";
      document.getElementById("ar_mar_main").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";
      break;
    
    case "exec_ld":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#0066ff";
      document.getElementById("ula_box").style.fill = "#0066ff";
      document.getElementById("ula_ac").style.stroke = "#0066ff";
      document.getElementById("mbr_box").style.fill = "#0066ff";
      document.getElementById("main_box").style.fill = "#0066ff";
      document.getElementById("main_mbr").style.stroke = "#0066ff";
      document.getElementById("mbr_ula").style.stroke = "#0066ff";
      document.getElementById("mar_box").style.fill = "#0066ff";
      document.getElementById("mar_main").style.stroke = "#0066ff";
      
      document.getElementById("ar_ula_ac").style.opacity = "100";
      document.getElementById("ar_main_mbr").style.opacity = "100";
      document.getElementById("ar_mbr_ula").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";
      document.getElementById("ar_mar_main").style.opacity = "100";
      break;
      
    case "exec_str":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#0066ff";
      document.getElementById("ula_box").style.fill = "#0066ff";
      document.getElementById("ac_ula").style.stroke = "#0066ff";
      document.getElementById("mbr_box").style.fill = "#0066ff";
      document.getElementById("main_box").style.fill = "#0066ff";
      document.getElementById("mbr_main").style.stroke = "#0066ff";
      document.getElementById("ula_mbr").style.stroke = "#0066ff";
      document.getElementById("mar_box").style.fill = "#0066ff";
      document.getElementById("mar_main").style.stroke = "#0066ff";
      
      document.getElementById("ar_ac_ula").style.opacity = "100";
      document.getElementById("ar_mbr_main").style.opacity = "100";
      document.getElementById("ar_ula_mbr").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";
      document.getElementById("ar_mar_main").style.opacity = "100";
      break;
      
    case "exec_jump":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#ff5050";
      document.getElementById("ula_box").style.fill = "#ff5050";
      document.getElementById("ac_ula").style.stroke = "#ff5050";
      document.getElementById("mar_box").style.fill = "#ff5050";
      document.getElementById("pc_box").style.fill = "#ff5050";
      document.getElementById("mar_pc").style.stroke = "#ff5050";
      
      document.getElementById("ar_ac_ula").style.opacity = "100";
      document.getElementById("ar_mar_pc").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";
      break;
    
    case "exec_shift":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("ac_box").style.fill = "#0066ff";
      document.getElementById("ula_box").style.fill = "#0066ff";
      document.getElementById("ac_ula").style.stroke = "#0066ff";
      
      document.getElementById("ar_ac_ula").style.opacity = "100";
      document.getElementById("ar_ula_ac").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";      
      break;
      
    case "exec_loadmqm":
      update_UI_IAS_dataflow("reset");
      document.getElementById("ir_box").style.fill = "#0066ff";
      document.getElementById("ir_control").style.stroke = "#0066ff";
      document.getElementById("ar_ir_control").style.opacity = "100";
      document.getElementById("control_box").style.fill = "#0066ff";
      document.getElementById("mq_box").style.fill = "#0066ff";
      document.getElementById("ula_box").style.fill = "#0066ff";
      document.getElementById("ula_mq").style.stroke = "#0066ff";
      document.getElementById("mbr_box").style.fill = "#0066ff";
      document.getElementById("main_box").style.fill = "#0066ff";
      document.getElementById("main_mbr").style.stroke = "#0066ff";
      document.getElementById("mbr_ula").style.stroke = "#0066ff";
      document.getElementById("mar_box").style.fill = "#0066ff";
      document.getElementById("mar_main").style.stroke = "#0066ff";
      
      document.getElementById("ar_ula_mq").style.opacity = "100";
      document.getElementById("ar_main_mbr").style.opacity = "100";
      document.getElementById("ar_mbr_ula").style.opacity = "100";
      document.getElementById("control_ula").style.opacity = "100";
      document.getElementById("ar_mar_main").style.opacity = "100";
      break;
  }
};

/* Update all elements of the user interface. */
var update_UI = function()
{
  /* Update registers. */
  document.getElementById("ir_out").value = IAS.getCPU("ir", "leftOpcodeHex").toUpperCase();
  document.getElementById("op_out").value = IAS.getCPU("ir", "leftOpcodeText").toUpperCase();

  document.getElementById("pc_out").value = IAS.getCPU("pc", "leftAddrHex").toUpperCase();
  document.getElementById("mar_out").value = IAS.getCPU("mar", "leftAddrHex").toUpperCase();
  document.getElementById("ibr_out").value = IAS.getCPU("ibr", "rightInstructionHex").toUpperCase();
  document.getElementById("mbr_out").value = IAS.getCPU("mbr", "wordValueHex").toUpperCase();
  document.getElementById("ac_out").value = IAS.getCPU("ac", "wordValueHex").toUpperCase();
  document.getElementById("mq_out").value = IAS.getCPU("mq", "wordValueHex").toUpperCase();
  
  /* Update cycle and dataflow diagram. */
  var dataflow_display = "";
  if(!ftc) {
    if(ftcstate == "left_fetch"){  
      document.getElementById("cycle_out").value = "FETCH LEFT";
      dataflow_display = "ftch_mem";
    } 
    else {
      document.getElementById("cycle_out").value = "FETCH RIGHT";
      dataflow_display = "ftch_ibr";
    }
  }
  else {
    document.getElementById("cycle_out").value = "EXECUTE";
    opcd = IAS.getCPU("ir", "leftOpcode");
    if(opcd == 10){
      dataflow_display = "exec_loadmq";
    } 
    else if(opcd == 9){
      dataflow_display = "exec_loadmqm";
    } 
    else if( opcd == 0x1 || opcd == 0x2 || opcd == 0x3){
      dataflow_display = "exec_ld";
    } 
    else if(opcd == 0x12 || opcd == 0x13 || opcd == 0x21) {
      dataflow_display = "exec_str";
    }
    else if(opcd == 5 || opcd == 6 || opcd == 7 || opcd == 8 ){
      dataflow_display = "exec_addsub";
    } 
    else if(opcd == 0x14 || opcd == 0x15){
      dataflow_display = "exec_shift";
    } 
    else if(opcd == 11 || opcd == 12){
      dataflow_display = "exec_muldiv";
    }  
    else if(opcd == 15 || opcd == 16 || opcd == 13 || opcd == 14){
      dataflow_display = "exec_jump";
    } 
  }
  update_UI_IAS_dataflow(dataflow_display);

  /* Update the memory boxes. */
  update_UI_mem_boxes();
};
