var config = {
  content: [{
    type: 'row',
    content: [
        {
        type:'component',
        componentName: 'fileManager',
        title: "File Manager",
        componentState: { text: 'File Manager' },
        width: 0.2 * window.innerWidth,
        isClosable: false
        },
      {
        type: 'stack',
        content: [
            {
            type:'component',
            componentName: 'textEditor',
            componentState: { key: localStorage.lastOpenedItem },
            width: 0.8 * window.innerWidth
            },
        ],
        width: 0.8 * window.innerWidth
      }
    ]
  }]
};

var myLayout, fileManagerContainer;
var themeTable = {"light" : ["lightgray", "#D1D1D1", "#EEE", "black", "#444", "chrome"],
                  "dark"  : ["#222",      "#1a1a1a", "#111", "white", "gray", "clouds_midnight"],
                  "soda"  : ["#1e231e",    "#181915", "#111", "white", "gray", "mono_industrial"],
                  "translucent" : ["#5c95e9", "#205188", "#011e3a", "white", "lightgray", "cobalt"]}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

var addMenuItem = function(title, text, open) {
  var downloadButton = $('<div class="menuItemIcon"><i class="fa fa-download" aria-hidden="true"></i></div>')
  var deleteButton = $('<div class="menuItemIcon"><i class="fa fa-trash" aria-hidden="true"></i></div>')
  var element = $( '<li>' + text.slice(4) + '</li>' );

  fileManagerContainer.append( element );
  element.append(deleteButton);
  element.append(downloadButton);
  downloadButton.click(function (e) {
    if (!e) var e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    download(title, localStorage[text]);
  })
  deleteButton.click(function (e) {
    if (!e) var e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();
    $.alertable.confirm('Are you sure you want to delete '+ title + "?").then(function() {
      if(localStorage.lastOpenedItem == text){
        localStorage.lastOpenedItem = "untitled";
      }
      var editors = myLayout.root.getComponentsByName("textEditor");
      for (var ed in editors) {
        if(editors[ed].container.getState().key == text){
          editors[ed].container.close();
        }
      }
      localStorage.removeItem(text);
    });
  })


  var newItemConfig = {
      title: title,
      type: 'component',
      componentName: 'textEditor',
      componentState: { key: text },
      width: 0.7 * window.innerWidth
  };


  element.click(function(){
    var activeEditor = myLayout.root.getComponentsByName("textEditor")[0];
    if(activeEditor){
      activeEditor.container.parent.parent.addChild( newItemConfig );
    }else {
      myLayout.root.contentItems[ 0 ].addChild( newItemConfig );
    }
  });

  if(open){
    element.click();
  }
  myLayout.createDragSource( element, newItemConfig );
};

var populateFiles = function () {
  if(!document.getElementById('fileListDiv')){ // multi window support
    myLayout.eventHub.emit( 'updateFiles', {} );
    return;
  }
  document.getElementById('fileListDiv').innerHTML = "";
  for (var key in localStorage) {
    if (key.slice(0,4) == "CODE") {
      addMenuItem(key.slice(4), key);
    }
  }
}


var updateStorage = function () {
  populateFiles();
  setTimeout(updateStorage, 1000);
}

window.onload = function () {

  if(!localStorage.selectedTheme){
    localStorage.selectedTheme = "light";
  }

  myLayout = new window.GoldenLayout( config, $('#content'));

  myLayout.registerComponent( 'simulator', function( container, state ){
    this.container = container;
    var sim = $( '<iframe class="simFrame" src="simulator/index.html"></iframe>');
    container.getElement().append(sim);
    sim.load(function () {
      sim.contents().find('#memoryMapEntry').val(state.text)
    })
  });

  // file manager

  myLayout.registerComponent( 'fileManager', function( container, state ){
    this.container = container;
    fileManagerContainer = $( '<div id="fileListDiv"> </div>' );
    var titleFiles = $('<h2> Your Files </h2>');
    var newFile = $('<i class="menuIcon fa fa-plus-square-o" aria-hidden="true"></i>');
    container.getElement().append(titleFiles);
    titleFiles.append(newFile)
    container.getElement().append(fileManagerContainer);
    Ps.initialize(fileManagerContainer[0]);
    populateFiles();
    newFile.click(function () { // create new file button
      $.alertable.prompt('File Name').then(function(data) {
        if(data.value == ""){
          $.alertable.alert("A file name must be provided.");
          return;
        }
        var newFileName = "CODE" + data.value;
        if(newFileName in localStorage){
          $.alertable.alert("File already exists.");
          return;
        }
        localStorage[newFileName] = "";
        addMenuItem(data.value, newFileName, true);
        populateFiles();
      });
    })
  });

  myLayout.registerComponent( 'textEditor', function( container, state ){
    this.container = container;
    var editor = ace.edit(container.getElement()[0]);
    editor.setTheme("ace/theme/" + themeTable[localStorage.selectedTheme][5]);
    container.getElement()[0].style.fontSize='16px';
    editor.setOptions({enableBasicAutocompletion: true,
                       enableSnippets: true,
                       enableLiveAutocompletion: true});
    editor.completers.push({
    getCompletions: function(editor, session, pos, prefix, callback) {
      callback(null, [
        {value: "LOAD MQ", score: 1000, meta: "Instruction"},
        {value: "LOAD MQ, M(", score: 1000, meta: "Instruction"},
        {value: "STOR M(", score: 1000, meta: "Instruction"},
        {value: "LOAD M(", score: 1000, meta: "Instruction"},
        {value: "LOAD -M(", score: 1000, meta: "Instruction"},
        {value: "LOAD |M(", score: 1000, meta: "Instruction"},
        {value: "JUMP M(", score: 1000, meta: "Instruction"},
        {value: "JUMP+ M(", score: 1000, meta: "Instruction"},
        {value: "ADD M(", score: 1000, meta: "Instruction"},
        {value: "ADD |M(", score: 1000, meta: "Instruction"},
        {value: "SUB M(", score: 1000, meta: "Instruction"},
        {value: "SUB |M(", score: 1000, meta: "Instruction"},
        {value: "MUL M(", score: 1000, meta: "Instruction"},
        {value: "DIV M(", score: 1000, meta: "Instruction"},
        {value: "LSH", score: 1000, meta: "Instruction"},
        {value: "RSH", score: 1000, meta: "Instruction"},
        {value: "STA M(", score: 1000, meta: "Instruction"}
      ]);
    }
    })
    //editor.getSession().setMode("ace/mode/javascript");
    editor.$blockScrolling = Infinity;
    container.editor = editor;
    // resize

    container.on("resize", function () {
      editor.resize();
    }, this);

    // local storage
    if(state.key && state.key != "untitled"){
      editor.setValue(localStorage[state.key]);
      container.setTitle( state.key.slice(4) )
      editor.selection.clearSelection();
    } else {
      state.key = "untitled";
      if(!("untitled" in localStorage)){
        localStorage["untitled"] = "";
      }
      editor.setValue(localStorage[state.key]);
      editor.selection.clearSelection();
      container.setTitle( state.key)
    }

    container.on("destroy", function () {
      if(state.key == "untitled" && localStorage["untitled"] != ""){
        $.alertable.prompt('Save your file!', {
        cancelButton : '<button class="alertable-cancel" type="button">Destroy</button>'
        }).then(function(data) {
          if(data.value == ""){
            $.alertable.alert("A file name must be provided.");
            addMenuItem("untitled", "untitled", true);
            return;
          }
          newFileName = "CODE" + data.value;
          if(newFileName in localStorage){
            $.alertable.alert("File already exists.");
            addMenuItem("untitled", "untitled", true);
            return;
          }
          state.key = newFileName;
          localStorage[state.key] = editor.getValue();
          localStorage["untitled"] = "";
          container.setTitle( state.key.slice(4) );
          populateFiles();
        }, function() {

      });
    }
    }, this);

    // key bindings

    editor.commands.addCommand({
      name: 'save',
      bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
      exec: function(editor) {
        if(state.key == "untitled"){
          $.alertable.prompt('File Name').then(function(data) {
            if(data.value == ""){
              $.alertable.alert("A file name must be provided.");
              return;
            }
            newFileName = "CODE" + data.value;
            if(newFileName in localStorage){
              $.alertable.alert("File already exists.");
              return;
            }
            state.key = newFileName;
            localStorage[state.key] = editor.getValue();
            localStorage["untitled"] = "";
            container.setTitle( state.key.slice(4) );
            populateFiles();
          });
        }else{
          localStorage[state.key] = editor.getValue();
        }
      },
      readOnly: true // false if this command should not apply in readOnly mode
    });

    editor.on("focus", function(e) {
      var cursorPos = editor.selection.getCursor();
      editor.setValue(localStorage[state.key]);
      editor.selection.moveCursorToPosition(cursorPos);
      editor.selection.clearSelection();
    });

    editor.getSession().on('change', function(e) {
      localStorage[state.key] = editor.getValue();
      localStorage.lastOpenedItem = state.key;
      // if (e.lines.length < 2){
      //   return;
      // }

    });
    function updateEditor() {
      if(!editor){
        return;
      }
      editor.getSession().clearAnnotations();
      try{
        var as = new AS();
        var binary = as.assemble(editor.getValue());
      }
      catch(err){
        var splitedErr = err.split("|");
        err = splitedErr.slice(2).toString()
        editor.getSession().setAnnotations([{
          row: parseInt(splitedErr[0]),
          column: parseInt(splitedErr[1]),
          text: err, // Or the Json reply from the parser
          type: "error" // also warning and information
        }]);
      }
      setTimeout(updateEditor, 1000);
    }
    setTimeout(updateEditor, 1000);

  });

  myLayout.eventHub.on( 'updateFiles', function( ){
    if(document.getElementById('fileListDiv')){
      populateFiles();
    }
  });

  myLayout.on( 'stackCreated', function( stack ){


    var runIcon = $("<div class=\"run\"><i class=\"fa fa-play\"> Load IAS Sim</i></div>");

    stack.header.controlsContainer.prepend( runIcon );

    stack.on( 'activeContentItemChanged', function( contentItem ){
      var container = contentItem.container;
      var editor = contentItem.container.editor;
      if(!editor){
        runIcon.hide();
      }else{
        if(container.getState().key){
          localStorage.lastOpenedItem = container.getState().key;
        }
        editor.focus();
        runIcon.show();
      }
    });

    // run code
    runIcon.click(function(){
      var container = stack.getActiveContentItem().container
      var editor = container.editor;
      var state = container.getState();
      if(editor){
        if(state.key == "untitled"){
          $.alertable.prompt('Save your file before continuing! \nFile Name:').then(function(data) {
            if(data.value == ""){
              $.alertable.alert("A file name must be provided.");
              return;
            }
            newFileName = "CODE" + data.value;
            if(newFileName in localStorage){
              $.alertable.alert("File already exists.");
              return;
            }
            state.key = newFileName;
            localStorage[state.key] = editor.getValue();
            localStorage["untitled"] = "";
            container.setTitle( state.key.slice(4) );
            populateFiles();
            runIcon.click();
          });
          return;
        }
        editor.getSession().clearAnnotations();
        try{
          var as = new AS();
          var binary = as.assemble(editor.getValue());
        }
        catch(err){
          var splitedErr = err.split("|");
          err = splitedErr.slice(2).toString()
          editor.getSession().setAnnotations([{
            row: parseInt(splitedErr[0]),
            column: parseInt(splitedErr[1]),
            text: err, // Or the Json reply from the parser
            type: "error" // also warning and information
          }]);
          $.alertable.alert("Error:\n" + err);
          return;
        }
        var newItemConfig = {
             title: "Simulator (" + container.getState().key.slice(4) + ")",
             type: 'component',
             componentName: 'simulator',
             componentState: { text: binary },
             width: 0.2 * window.innerWidth
         };

        var activeEditor = myLayout.root.getComponentsByName("simulator")[0];
        if(activeEditor){
         activeEditor.container.parent.parent.addChild( newItemConfig );
        }else {
         myLayout.root.contentItems[ 0 ].addChild( newItemConfig );
        }
      }
    });
  });

  myLayout.init();
  updateStorage();
  //setTimeout(updateStorage, 100);
  changeTheme(localStorage.selectedTheme);
}

window.onresize = function () {
  myLayout.updateSize();
}



function changeTheme(theme) {
  $("#gl_theme").attr("href", "https://cdnjs.cloudflare.com/ajax/libs/golden-layout/1.5.9/css/goldenlayout-" + theme + "-theme.css")
  document.documentElement.style.setProperty('--bg-color', themeTable[theme][0]);
  document.documentElement.style.setProperty('--hi-bg-color', themeTable[theme][1]);
  document.documentElement.style.setProperty('--menu-bg-color', themeTable[theme][2]);
  document.documentElement.style.setProperty('--hi-text-color', themeTable[theme][3]);
  document.documentElement.style.setProperty('--mid-text-color', themeTable[theme][4]);
  localStorage.selectedTheme = theme;
  var editors = myLayout.root.getComponentsByName("textEditor");
  for (var ed in editors) {
    if(editors[ed].container.editor.setTheme("ace/theme/" + themeTable[theme][5]));
  }
}
