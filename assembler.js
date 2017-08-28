var config = {
  content: [{
    type: 'row',
    content: [
        {
        type:'component',
        componentName: 'fileManager',
        title: "File Manager",
        componentState: { text: 'File Manager' },
        width: 0.1 * window.innerWidth,
        isClosable: false
        },
      {
        type: 'stack',
        content: [
            {
            type:'component',
            componentName: 'textEditor',
            componentState: { key: localStorage.lastOpenedItem },
            width: 0.9 * window.innerWidth
            },
        ],
        width: 0.9 * window.innerWidth
      }
    ]
  }]
};

var myLayout, fileManagerContainer;
var themeTable = {"light" : ["lightgray", "#D1D1D1", "#EEE", "black", "#444", "chrome"],
                  "dark"  : ["#222",      "#1a1a1a", "#111", "white", "gray", "clouds_midnight"],
                  "soda"  : ["#1e231e",    "#181915", "#111", "white", "gray", "mono_industrial"],
                  "translucent" : ["#5c95e9", "#205188", "#011e3a", "white", "lightgray", "cobalt"]}

var addMenuItem = function(title, text ) {
    var element = $( '<li>' + text.slice(4) + '</li>' );
    fileManagerContainer.append( element );

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

    myLayout.createDragSource( element, newItemConfig );
};

var populateFiles = function () {
  if(!document.getElementById('fileListDiv')){
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
  // setTimeout(updateStorage, 1000);
}

window.onload = function () {

  if(!localStorage.selectedTheme){
    localStorage.selectedTheme = "dark";
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
    newFile.click(function () {
      $.alertable.prompt('File Name').then(function(data) {
        if(data.value == ""){
          $.alertable.alert("A file name must be provided.");
          return;
        }
        var newFileName = "CODE" + data.value;
        localStorage[newFileName] = "";
        populateFiles();
      });
    })
  });

  myLayout.registerComponent( 'textEditor', function( container, state ){
    this.container = container;
    var editor = ace.edit(container.getElement()[0]);
    editor.setTheme("ace/theme/" + themeTable[localStorage.selectedTheme][5]);
    container.getElement()[0].style.fontSize='16px';
    //editor.getSession().setMode("ace/mode/javascript");
    editor.$blockScrolling = Infinity;
    container.editor = editor;
    // resize

    container.on("resize", function () {
      editor.resize();
    }, this);

    // local storage
    if(state.key){
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
            state.key = "CODE" + data.value;
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
    });

  });

  myLayout.eventHub.on( 'updateFiles', function( ){
    if(document.getElementById('fileListDiv')){
      populateFiles();
    }
  });

  myLayout.on( 'stackCreated', function( stack ){


    var runIcon = $("<div class=\"run\"><i class=\"fa fa-play\"> Run Code</i></div>");

    stack.header.controlsContainer.prepend( runIcon );

    stack.on( 'activeContentItemChanged', function( contentItem ){
      var editor = contentItem.container.editor;
      if(!editor){
        runIcon.hide();
      }else{
        editor.focus();
        runIcon.show();
      }
    });

    // from the dropdown
    runIcon.click(function(){
      var container = stack.getActiveContentItem().container
      var editor = container.editor;
      if(editor){
        try{
          var as = new AS();
          var binary = as.assemble(editor.getValue());
        }
        catch(err){
          $.alertable.alert("Error:\n" + err);
          return;
        }
        var newItemConfig = {
             title: "Simulator (" + container.title + ")",
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
