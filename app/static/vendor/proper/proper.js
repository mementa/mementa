//     (c) 2011 Michael Aufreiter
//     Proper is freely distributable under the MIT license.
//     For all details and documentation:
//     http://github.com/michael/proper

// Goals:
//
// * Annotations (strong, em, code, link) are exclusive. No text can be both
//   emphasized and strong.
// * The output is semantic, valid HTML.
// * Cross-browser compatibility: Support the most recent versions of Chrome,
//   Safari, Firefox and Internet Explorer. Proper should behave the same on
//   all these platforms (if possible).
//
// Proper uses contenteditable to support these features. Unfortunately, every
// browser handles contenteditable differently, which is why many
// browser-specific workarounds are required.

(function(){
  
  // _.Events (borrowed from Backbone.js)
  // ------------------------------------
  
  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may `bind` or `unbind` a callback function to an event;
  // `trigger`-ing an event fires all callbacks in succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.bind('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  
  _.Events = window.Backbone ? Backbone.Events : {

    // Bind an event, specified by a string name, `ev`, to a `callback` function.
    // Passing `"all"` will bind the callback to all events fired.
    bind : function(ev, callback) {
      var calls = this._callbacks || (this._callbacks = {});
      var list  = this._callbacks[ev] || (this._callbacks[ev] = []);
      list.push(callback);
      return this;
    },

    // Remove one or many callbacks. If `callback` is null, removes all
    // callbacks for the event. If `ev` is null, removes all bound callbacks
    // for all events.
    unbind : function(ev, callback) {
      var calls;
      if (!ev) {
        this._callbacks = {};
      } else if (calls = this._callbacks) {
        if (!callback) {
          calls[ev] = [];
        } else {
          var list = calls[ev];
          if (!list) return this;
          for (var i = 0, l = list.length; i < l; i++) {
            if (callback === list[i]) {
              list.splice(i, 1);
              break;
            }
          }
        }
      }
      return this;
    },

    // Trigger an event, firing all bound callbacks. Callbacks are passed the
    // same arguments as `trigger` is, apart from the event name.
    // Listening for `"all"` passes the true event name as the first argument.
    trigger : function(ev) {
      var list, calls, i, l;
      if (!(calls = this._callbacks)) return this;
      if (list = calls[ev]) {
        for (i = 0, l = list.length; i < l; i++) {
          list[i].apply(this, Array.prototype.slice.call(arguments, 1));
        }
      }
      if (list = calls['all']) {
        for (i = 0, l = list.length; i < l; i++) {
          list[i].apply(this, arguments);
        }
      }
      return this;
    }
  };
  
  _.stripTags = function(input, allowed) {
  // Strips HTML and PHP tags from a string
  //
  // version: 1009.2513
  // discuss at: http://phpjs.org/functions/strip_tags
     allowed = (((allowed || "") + "")
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g) || [])
        .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
     var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
         commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
     return input.replace(commentsAndPhpTags, '').replace(tags, function($0, $1){
        return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
     });
  };

  // Initial Setup
  // -------------

  controlsTpl = ' \
    <div class="proper-commands"> \
      <a href="#" title="Emphasis (CTRL+SHIFT+E)" class="command em" command="em"><div>Emphasis</div></a> \
      <a href="#" title="Strong (CTRL+SHIFT+S)" class="command strong" command="strong"><div>Strong</div></a> \
      <a href="#" title="Inline Code (CTRL+SHIFT+C)" class="command code" command="code"><div>Code</div></a> \
      <a title="Link (CTRL+SHIFT+L)" href="#" class="command link" command="link"><div>Link</div></a>\
      <a href="#" title="Bullet List (CTRL+SHIFT+B)" class="command ul" command="ul"><div>Bullets List</div></a>\
      <a href="#" title="Numbered List (CTRL+SHIFT+N)" class="command ol" command="ol"><div>Numbered List</div></a>\
      <a href="#" title="Indent (TAB)" class="command indent" command="indent"><div>Indent</div></a>\
      <a href="#" title="Outdent (SHIFT+TAB)" class="command outdent" command="outdent"><div>Outdent</div></a>\
      <br class="clear"/>\
    </div>';
  
  // Proper
  // ------
  
  this.Proper = function(activeElement) {
    var //activeElement = null, // element that's being edited
        $controls,
        self = {},
        that = this,
        pendingChange = false,
        options = {},
        defaultOptions = { // default options
          multiline: true,
          markup: true,
          placeholder: 'Enter Text',
          codeFontFamily: 'Monaco, Consolas, "Lucida Console", monospace'
        };
    
    // Setup temporary hidden DOM Node, for sanitization
    var properContent = $('<div></div>')
      .hide()
      .appendTo(document.body);
    // TODO: michael, explain why these css properties are needed -- timjb
    var rawContent = $('<div  contenteditable="true"></div>')
      .css({
        position: 'fixed',
        top: '20px',
        left: '20px',
        opacity: '0'
      })
      .appendTo(document.body);
    
    // Commands
    // --------
    
    function exec(cmd) {
      var command = commands[cmd];
      if (command.exec) {
        command.exec();
      } else {
        if (command.isActive()) {
          command.toggleOff();
        } else {
          command.toggleOn();
        }
      }
    }

    function removeFormat() {
      document.execCommand('removeFormat', false, true);
      _.each(['em', 'strong', 'code'], function (cmd) {
        var command = commands[cmd];
        if (command.isActive()) {
          command.toggleOff();
        }
      });
    }

    // Give code elements (= monospace font) the class `proper-code`.
    function addCodeClasses() {
      $(activeElement).find('font').addClass('proper-code');
    }

    var nbsp = $('<span>&nbsp;</span>').text();

    var commands = self.commands = {
      em: {
        isActive: function() {
          return document.queryCommandState('italic', false, true);
        },
        toggleOn: function() {
          removeFormat();
          document.execCommand('italic', false, true);
        },
        toggleOff: function() {
          document.execCommand('italic', false, true);
        }
      },

      strong: {
        isActive: function() {
          return document.queryCommandState('bold', false, true);
        },
        toggleOn: function() {
          removeFormat();
          document.execCommand('bold', false, true);
        },
        toggleOff: function () {
          document.execCommand('bold', false, true);
        }
      },

      code: {
        isActive: function() {
          return cmpFontFamily(document.queryCommandValue('fontName'), options.codeFontFamily);
        },
        toggleOn: function() {
          removeFormat();
          document.execCommand('fontName', false, options.codeFontFamily);
          addCodeClasses();
        },
        toggleOff: function () {
          var sel;
          if ($.browser.webkit && (sel = saveSelection()).collapsed) {
            // Workaround for Webkit. Without this, the user wouldn't be
            // able to disable <code> when there's no selection.
            var container = sel.endContainer
            ,   offset = sel.endOffset;
            container.data = container.data.slice(0, offset)
                           + nbsp
                           + container.data.slice(offset);
            var newSel = document.createRange();
            newSel.setStart(container, offset);
            newSel.setEnd(container, offset+1);
            restoreSelection(newSel);
            document.execCommand('removeFormat', false, true);
          } else {
            document.execCommand('removeFormat', false, true);
          }
        }
      },

      link: {
        exec: function() {
          removeFormat();
          document.execCommand('createLink', false, window.prompt('URL:', 'http://'));
        }
      },

      ul: {
        isActive: function() {
          return document.queryCommandState('insertUnorderedList', false, true);
        },
        exec: function() {
          document.execCommand('insertUnorderedList', false, true);
        }
      },

      ol: {
        isActive: function() {
          return document.queryCommandState('insertOrderedList', false, true);
        },
        exec: function() {
          document.execCommand('insertOrderedList', false, true);
        }
      },

      indent: {
        exec: function() {
          if (document.queryCommandState('insertOrderedList', false, true) ||
              document.queryCommandState('insertUnorderedList', false, true)) {
            document.execCommand('indent', false, true);
          }
        }
      },

      outdent: {
        exec: function() {
          if (document.queryCommandState('insertOrderedList', false, true) ||
              document.queryCommandState('insertUnorderedList', false, true)) {
            document.execCommand('outdent', false, true);
          }
        }
      }
    };
    
    // TODO: enable proper sanitizing that allows markup to be pasted too
    function sanitize() {      
      properContent.html(rawContent.text());
    }
    
    // Returns true if a and b is the same font family. This is used to check
    // if the current font family (`document.queryCommandValue('fontName')`)
    // is the font family that's used to style code.
    function cmpFontFamily(a, b) {
      function normalizeFontFamily(s) {
        return (''+s).replace(/\s*,\s*/g, ',').replace(/'/g, '"');
      }
      
      a = normalizeFontFamily(a);
      b = normalizeFontFamily(b);
      // Internet Explorer's `document.queryCommandValue('fontName')` returns
      // only the applied font family (e.g. `Consolas`), not the full font
      // stack (e.g. `Monaco, Consolas, "Lucida Console", monospace`).
      if ($.browser.msie) {
        if (a.split(',').length === 1) {
          return b.split(',').indexOf(a) > -1;
        } else if (b.split(',').length === 1) {
          return a.split(',').indexOf(b) > -1;
        } else {
          return a === b;
        }
      } else {
        return a === b;
      }
    }
    
    
    function escape(text) {
      return text.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;');
    }
    
    // Recursively walks the dom and returns the semantified contents. Replaces
    // presentational elements (e.g. `<b>`) with their semantic counterparts
    // (e.g. `<strong>`).
    function semantifyContents(node) {
      function replace(presentational, semantic) {
        node.find(presentational).each(function () {
          $(this).replaceWith($(document.createElement(semantic)).html($(this).html()));
        });
      }
      replace('i', 'em');
      replace('b', 'strong');
      replace('.proper-code', 'code');
      replace('div', 'p');
      //replace('span', 'span');
      
      node.find('span').each(function () {
        if (this.firstChild) {
          $(this.firstChild).unwrap();
        }
      });
      
      node.find('p, ul, ol').each(function () {
        while ($(this).parent().is('p')) {
          $(this).unwrap();
        }
      });
      
      // Fix nested lists
      node.find('ul > ul, ul > ol, ol > ul, ol > ol').each(function () {
        if ($(this).prev()) {
          $(this).prev().append(this);
        } else {
          $(this).wrap($('<li />'));
        }
      });
      
      (function () {
        var currentP = [];
        function wrapInP() {
          if (currentP.length) {
            var p = $('<p />').insertBefore(currentP[0]);
            for (var i = 0, l = currentP.length; i < l; i++) {
              $(currentP[i]).remove().appendTo(p);
            }
            currentP = [];
          }
        }
        // _.clone is necessary because it turns the `childNodes` live
        // dom collection into a static array.
        var children = _.clone(node.get(0).childNodes);
        for (var i = 0, l = children.length; i < l; i++) {
          var child = children[i];
          if (!$(child).is('p, ul, ol') &&
              !(child.nodeType === Node.TEXT_NODE && (/^\s*$/).exec(child.data))) {
            currentP.push(child);
          } else {
            wrapInP();
          }
        }
        wrapInP();
      })();
      
      // Remove unnecessary br's
      node.find('br').each(function () {
        if (this.parentNode.lastChild === this) {
          $(this).remove();
        }
      });
      
      // Remove all spans
      node.find('span').each(function () {
        $(this).children().first().unwrap();
      });
      
      node.children().each(function () {
        if (!$(this).is('p,ul,ol')) {
          $(this).wrap($('<p />'));
        }
      });
    }
    
    // Replaces semantic elements with their presentational counterparts
    // (e.g. <em> with <i>). Tries to preserve the user's selection and cursor
    // position.
    function desemantifyContents(node) {
      var sel = saveSelection()
      ,   startContainer = sel.startContainer
      ,   startOffset    = sel.startOffset
      ,   endContainer   = sel.endContainer
      ,   endOffset      = sel.endOffset;
      
      function replace(semantic, presentational) {
        node.find(semantic).each(function () {
          var presentationalEl = $(presentational).get(0);
          
          var child;
          while (child = this.firstChild) {
            presentationalEl.appendChild(child);
          }
          
          $(this).replaceWith(presentationalEl);
        });
      }
      replace('em', '<i />');
      replace('strong', '<b />');
      replace('code', '<font class="proper-code" face="'+escape(options.codeFontFamily)+'" />');
      
      function isInDom(node) {
        if (node === document.body) return true;
        if (node.parentNode) return isInDom(node.parentNode);
        return false;
      }
      
      if (isInDom(startContainer)) {
        sel.setStart(startContainer, startOffset);
      }
      if (isInDom(endContainer)) {
        sel.setEnd(endContainer, endOffset);
      }
      
      restoreSelection(sel);
    }
    
    // Update the control buttons' state.
    function updateCommandState() {
      if (!options.markup) return;
      
      $controls.find('.command').removeClass('selected');
      _.each(commands, function(command, name) {
        if (command.isActive && command.isActive()) {
          $controls.find('.command.'+name).addClass('selected');
        }
      });
    }
    
    // If the activeElement has no content, display the placeholder and give
    // the element the class `empty`.
    function maybeInsertPlaceholder() {
      if ($(activeElement).text().trim().length === 0) {
        $(activeElement).addClass('empty');
        if (options.markup) {
          $(activeElement).html('<p>&laquo; '+options.placeholder+' &raquo;</p>');
        } else {
          $(activeElement).html('&laquo; '+options.placeholder+' &raquo;');
        }
      }
    }
    
    // If the activeElement has the class `empty`, remove the placeholder and
    // the class.
    function maybeRemovePlaceholder() {
      if ($(activeElement).hasClass('empty')) {
        $(activeElement).removeClass('empty');
        selectAll();
        document.execCommand('delete', false, "");
      }
    }
    
    // Returns the current selection as a dom range.
    function saveSelection() {
      if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt && sel.rangeCount) {
          return sel.getRangeAt(0);
        }
      } else if (document.selection && document.selection.createRange) { // IE
        return document.selection.createRange();
      }
      return null;
    }

    // Selects the given dom range.
    function restoreSelection(range) {
      if (range) {
        if (window.getSelection) {
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } else if (document.selection && range.select) { // IE
          range.select();
        }
      }
    }
    
    // Selects the whole editing area.
    function selectAll() {
      var range = document.createRange();
      range.selectNodeContents($(activeElement)[0]);
      restoreSelection(range);
    }
    
    function bindEvents(el) {
      $(el)
        .unbind('paste')
        .unbind('keydown')
        .unbind('keyup')
        .unbind('focus')
        .unbind('blur');
      
      $(el).bind('paste', function() {
        var selection = saveSelection();
        rawContent.focus();
        
        // Immediately sanitize pasted content
        setTimeout(function() {
          sanitize();
          restoreSelection(selection);
          $(el).focus();
          
          // Avoid nested paragraph correction resulting from paste
          var content = properContent.html().trim();

          // For some reason last </p> gets injected anyway
          document.execCommand('insertHTML', false, content);
          rawContent.html('');
        }, 1);
      });
      
      function isTag(node, tag) {
        if (!node || node === activeElement) return false;
        if (node.tagName && node.tagName.toLowerCase() === tag) return true;
        return isTag(node.parentNode, tag);
      }
      
      // Prevent multiline
      $(el).bind('keydown', function(e) {
        if (!options.multiline && e.keyCode === 13) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        setTimeout(function () {
          if ($(activeElement).html().trim() === '') {
            document.execCommand('insertParagraph', false, true);
          }
        }, 10);
        // By default, Firefox doesn't create paragraphs. Fix this.
        if ($.browser.mozilla) {
          var selectionStart = saveSelection().startContainer;
          if (options.multiline && !isTag(selectionStart, 'p') && !isTag(selectionStart, 'ul')) {
            document.execCommand('insertParagraph', false, true);
          }
          if (e.keyCode === 13 && !e.shiftKey) {
            window.setTimeout(function () {
              if (!isTag(selectionStart, 'ul')) {
                document.execCommand('insertParagraph', false, true);
              }
            }, 10);
          }
        }
      });
      
      $(el)
        .bind('focus', maybeRemovePlaceholder)
        .bind('blur', maybeInsertPlaceholder)
        .bind('click', updateCommandState);
      
      $(el).bind('keyup', function(e) {        
        updateCommandState();
        addCodeClasses();
        // Trigger change events, but consolidate them to 200ms time slices
        setTimeout(function() {
          // Skip if there's already a change pending
          if (!pendingChange) {
            pendingChange = true;
            setTimeout(function() {
              pendingChange = false;
              self.trigger('changed');
            }, 200);
          }
        }, 10);
        return true;
      });
    }
    
    // Instance methods
    // -----------

    self.deactivate = function() {
      $(activeElement)
        .attr('contenteditable', 'false')
        .unbind('paste')
        .unbind('keydown');
      $('.proper-commands').remove();
      self.unbind('changed');
    };
    
    // Activate editor for a given element
    self.activate = function( opts) {
      options = {};
      _.extend(options, defaultOptions, opts);
      
      // Deactivate previously active element
      //self.deactivate();
      
      // Make editable
        var el = activeElement; 
      $(el).attr('contenteditable', true);

      bindEvents(el);
      
      // Setup controls
      if (options.markup) {
        $controls = $(controlsTpl); 
        $controls.appendTo($(options.controlsTarget));
      }
      
      // Keyboard bindings
      if (options.markup) {
        function execLater(cmd) {
          return function(e) {
            e.preventDefault();
            exec(cmd);
          };
        }
        $(activeElement)
          .keydown('ctrl+shift+e', execLater('em'))
          .keydown('ctrl+shift+s', execLater('strong'))
          .keydown('ctrl+shift+c', execLater('code'))
          .keydown('ctrl+shift+l', execLater('link'))
          .keydown('ctrl+shift+b', execLater('ul'))
          .keydown('ctrl+shift+n', execLater('ol'))
          .keydown('tab',          execLater('indent'))
          .keydown('shift+tab',    execLater('outdent'));
      }
      
      $(activeElement).focus();
      updateCommandState();
      desemantifyContents($(activeElement));
      
      // Use <b>, <i> and <font face="monospace"> instead of style attributes.
      // This is convenient because these inline element can easily be replaced
      // by their more semantic counterparts (<strong>, <em> and <code>);
      document.execCommand('styleWithCSS', false, false);
      
      $('.proper-commands a.command', options.controlsTarget).click(function(e) {
        e.preventDefault();
        $(activeElement).focus();
        exec($(e.currentTarget).attr('command'));
        updateCommandState();
        setTimeout(function() { self.trigger('changed'); }, 10);
      });
    };
    
    // Get current content
    self.content = function() {
      if ($(activeElement).hasClass('empty')) return '';
      
      if (options.markup) {
        if (!activeElement) return '';
        var clone = $(activeElement).clone();
        semantifyContents(clone);
        return clone.html();
      } else {
        if (options.multiline) {
          return _.stripTags($(activeElement).html().replace(/<div>/g, '\n')
                                             .replace(/<\/div>/g, '')).trim();
        } else {
          return _.stripTags($(activeElement).html()).trim();
        }
      }
    };
    
    // Expose public API
    // -----------------
    
    _.extend(self, _.Events);
    return self;
  };
})();
