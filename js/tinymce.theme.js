window.tinymce.ThemeManager.add('fee', function (editor) {
  this.renderUI = function () {
    var settings = editor.settings
    var each = window.tinymce.each
    var DOM = window.tinymce.DOM

    settings.content_editable = true

    function isEmpty () {
      return editor.getContent({ format: 'raw' }).replace(/(?:<p[^>]*>)?(?:<br[^>]*>)?(?:<\/p>)?/, '') === ''
    }

    editor.on('focus', function () {
      DOM.addClass(document.body, 'fee-edit-focus')
    })

    editor.on('blur', function () {
      DOM.removeClass(document.body, 'fee-edit-focus')
    })

    if (settings.placeholder) {
      editor.on('init', function () {
        editor.getBody().setAttribute('data-placeholder', settings.placeholder)
      })

      editor.on('blur setcontent loadcontent', function () {
        if (isEmpty()) {
          editor.getBody().setAttribute('data-empty', '')
        } else {
          editor.getBody().removeAttribute('data-empty')
        }
      })
    }

    editor.on('preinit', function () {
      if (editor.wp && editor.wp._createToolbar) {
        var toolbar = editor.wp._createToolbar(settings.toolbar)

        editor.on('wptoolbar', function (event) {
          var element = event.element

          element.normalize()

          var range = editor.selection.getRng()
          var content = editor.selection.getContent()

          // No collapsed selection.
          if (range.collapsed) {
            return
          }

          // No non editable elements.
          if (
            element.getAttribute('contenteditable') === 'false' ||
            element.getAttribute('data-mce-bogus') === 'all'
          ) {
            return
          }

          // No images.
          if (element.nodeName === 'IMG') {
            return
          }

          // No horizontal rules.
          if (element.nodeName === 'HR') {
            return
          }

          // No links.
          if (element.nodeName === 'A') {
            return
          }

          // No empty selection.
          if (!content.replace(/<[^>]+>/g, '').replace(/(?:\s|&nbsp;)/g, '')) {
            return
          }

          // Selection needs to be contained in one element.
          if (range.startContainer === range.endContainer || (
            range.startContainer.nodeType === 3 &&
            range.startContainer.parentNode === range.endContainer
            ) || (
            range.endContainer.nodeType === 3 &&
            range.endContainer.parentNode === range.startContainer
            )) {
            event.toolbar = toolbar
            event.selection = range
          }
        })
      }
    })

    editor.addButton('convert', {
      type: 'FEESelect',
      icon: 'dashicon dashicons-editor-paragraph',
      options: {
        p: {
          text: 'Paragraph',
          icon: 'dashicon dashicons-editor-paragraph'
        },
        h2: {
          text: 'Heading 2'
        },
        h3: {
          text: 'Heading 3'
        },
        h4: {
          text: 'Heading 4'
        },
        h5: {
          text: 'Heading 5'
        },
        h6: {
          text: 'Heading 6'
        },
        pre: {
          text: 'Preformatted',
          icon: 'dashicon dashicons-editor-code'
        }
      }
    })

    editor.addButton('insert', {
      icon: 'dashicon dashicons-plus-alt',
      onclick: function () {
        window.wp.media.editor.open(editor.id)
      }
    })

    editor.addButton('save', {
      text: 'Save',
      onclick: function () {
        window.fee.post.save()

        editor.windowManager.open({
          padding: 20,
          minWidth: 300,
          minHeight: 100,
          layout: 'flex',
          items: {
            type: 'label',
            multiline: true,
            maxWidth: 500,
            maxHeight: 200,
            text: 'All your work is saved automatically! (NB: TODO) Would you like to publish?'
          },
          buttons: [
            { text: 'No', onclick: 'close' },
            {
              text: 'Publish',
              subtype: 'primary',
              onclick: function () {
                var win = this.parent().parent()

                window.fee.post.save({ status: 'publish' })
                win.close()
              }
            }
          ]
        })
      }
    })

    window.tinymce.ui.FEESelect = window.tinymce.ui.Widget.extend({
      Defaults: {
        classes: 'widget btn',
        role: 'button'
      },

      init: function (settings) {
        var self = this
        var size

        self._super(settings)
        settings = self.settings

        size = self.settings.size

        self.on('click mousedown', function (e) {
          // e.preventDefault()
        })

        self.on('touchstart', function (e) {
          self.fire('click', e)
        // e.preventDefault()
        })

        if (settings.subtype) {
          self.classes.add(settings.subtype)
        }

        if (size) {
          self.classes.add('btn-' + size)
        }

        if (settings.icon) {
          self.icon(settings.icon)
        }
      },

      icon: function (icon) {
        if (!arguments.length) {
          return this.state.get('icon')
        }

        this.state.set('icon', icon)

        return this
      },

      repaint: function () {
        var btnElm = this.getEl().firstChild
        var btnStyle

        if (btnElm) {
          btnStyle = btnElm.style
          btnStyle.width = btnStyle.height = '100%'
        }

        this._super()
      },

      renderHtml: function () {
        var self = this
        var id = self._id
        var prefix = self.classPrefix
        var icon = self.state.get('icon')
        var image
        var text = self.state.get('text')
        var textHtml = ''
        var optionsHTML = ''

        image = self.settings.image
        if (image) {
          icon = 'none'

          // Support for [high dpi, low dpi] image sources
          if (typeof image !== 'string') {
            image = window.getSelection ? image[0] : image[1]
          }

          image = ' style="background-image: url(\'' + image + '\')"'
        } else {
          image = ''
        }

        if (text) {
          self.classes.add('btn-has-text')
          textHtml = '<span class="' + prefix + 'txt">' + self.encode(text) + '</span>'
        }

        icon = self.settings.icon ? prefix + 'ico ' + prefix + 'i-' + icon : ''

        each(self.settings.options, function (v, k) {
          optionsHTML += '<option value="' + k + '">' + v.text + '</option>'
        })

        return (
          '<div id="' + id + '" class="' + self.classes + '" tabindex="-1" aria-labelledby="' + id + '">' +
          '<button role="presentation" type="button" tabindex="-1">' +
          (icon ? '<i class="' + icon + '"' + image + '></i>' : '') +
          textHtml +
          '</button>' +
          '<select>' + optionsHTML + '</select>' +
          '</div>'
        )
      },

      bindStates: function () {
        var self = this
        var $ = self.$
        var textCls = self.classPrefix + 'txt'
        var $select = $('select', self.getEl())
        var options = self.settings.options

        $select.on('change', function () {
          var icon = options[ this.value ].icon

          self.icon(icon || '')
          self.text(icon ? '' : this.value.toUpperCase())

          editor.formatter.apply(this.value)
        })

        editor.on('nodechange', function (event) {
          var formatter = editor.formatter

          each(event.parents, function (node) {
            each(options, function (value, key) {
              if (formatter.matchNode(node, key)) {
                $select[0].value = key

                var icon = value.icon

                self.icon(icon || '')
                self.text(icon ? '' : key.toUpperCase())
              }
            })
          })
        })

        function setButtonText (text) {
          var $span = $('span.' + textCls, self.getEl())

          if (text) {
            if (!$span[0]) {
              $('button:first', self.getEl()).append('<span class="' + textCls + '"></span>')
              $span = $('span.' + textCls, self.getEl())
            }

            $span.html(self.encode(text))
          } else {
            $span.remove()
          }

          self.classes.toggle('btn-has-text', !!text)
        }

        self.state.on('change:text', function (e) {
          setButtonText(e.value)
        })

        self.state.on('change:icon', function (e) {
          var icon = e.value
          var prefix = self.classPrefix

          self.settings.icon = icon
          icon = icon ? prefix + 'ico ' + prefix + 'i-' + self.settings.icon : ''

          var btnElm = self.getEl().firstChild
          var iconElm = btnElm.getElementsByTagName('i')[0]

          if (icon) {
            if (!iconElm || iconElm !== btnElm.firstChild) {
              iconElm = document.createElement('i')
              btnElm.insertBefore(iconElm, btnElm.firstChild)
            }

            iconElm.className = icon
          } else if (iconElm) {
            btnElm.removeChild(iconElm)
          }

          setButtonText(self.state.get('text'))
        })

        return self._super()
      }
    })

    editor.on('preinit', function () {
      if (editor.wp && editor.wp._createToolbar) {
        var toolbar = editor.wp._createToolbar([ 'insert', 'convert', 'save' ])

        toolbar.reposition = function () {
          var element = window.tinymce.$('.fee-post')[0]
          var toolbar = this.getEl()
          var elementRect = element.getBoundingClientRect()
          var toolbarRect = toolbar.getBoundingClientRect()

          DOM.setStyles(toolbar, {
            'position': 'fixed',
            'left': elementRect.left + (elementRect.width / 2) - (toolbarRect.width / 2),
            'top': 42
          })
        }

        editor.on('hide', function () {
          toolbar.hide()
        })

        editor.on('show', function () {
          toolbar.show()
        })

        toolbar.show()
      }
    })

    return {}
  }
})
