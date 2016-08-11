(function (tinymce, _) {
  tinymce.ThemeManager.add('fee', function (editor) {
    this.renderUI = function () {
      var settings = editor.settings
      var each = tinymce.each
      var DOM = tinymce.DOM

      editor.on('preinit', function () {
        if (editor.wp && editor.wp._createToolbar) {
          var toolbar = editor.wp._createToolbar(settings.toolbar)

          toolbar.$el.addClass('fee-no-print')

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
        text: 'Saved',
        onclick: function () {
          window.fee.post.save()
        },
        onPostRender: function () {
          var button = this

          window.fee.post.on('request', function (model, xhr) {
            button.$el.find('.mce-txt').text('Saving...')
            button.active( true )
            button.disabled( true )

            xhr.done(function () {
              button.$el.find('.mce-txt').text('Saved')
            }).fail(function () {
              button.$el.find('.mce-txt').text('Error')
            }).always(function () {
              button.active( false )
              button.disabled( true )
            })
          })
        }
      })

      editor.addButton('publish', {
        text: 'Publish',
        classes: 'widget btn primary',
        onclick: function () {
          window.fee.post.save({status: 'publish'}).done(function () {
            document.location.reload(true)
          })
        }
      })

      tinymce.ui.FEESelect = tinymce.ui.Widget.extend({
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
          var toolbar = editor.wp._createToolbar([ 'insert', 'convert', 'save', 'publish' ]).show()

          toolbar.$el.addClass('fee-no-print fee-main-toolbar')

          toolbar._visible = true

          toolbar.reposition = function () {
            var element = editor.getBody()
            var toolbar = this.getEl()
            var elementRect = element.getBoundingClientRect()
            var toolbarRect = toolbar.getBoundingClientRect()

            DOM.setStyles(toolbar, {
              'position': 'fixed',
              'left': elementRect.left + (elementRect.width / 2) - (toolbarRect.width / 2),
              'bottom': 0
            })
          }

          toolbar.show = function () {
            if (!this._visible) {
              this.$el.removeClass('fee-hide')
              this._visible = true
            }
          }

          toolbar.hide = function () {
            if (this._visible) {
              this.$el.addClass('fee-hide')
              this._visible = false
            }
          }

          editor.on('keydown', function (event) {
            if (!tinymce.util.VK.modifierPressed(event) && window.pageYOffset > 0) {
              toolbar.hide()
            }
          })

          DOM.bind(editor.getWin(), 'scroll', function () {
            toolbar.show()
          })

          toolbar.reposition()
        }
      })

      editor.addButton('add_featured_image', {
        icon: 'dashicon dashicons-edit',
        onclick: function () {
          window.wp.media.featuredImage.frame().open()
        }
      })

      editor.addButton('remove_featured_image', {
        icon: 'dashicon dashicons-no',
        onclick: function () {
          window.wp.media.featuredImage.remove()
        }
      })

      editor.on('preinit', function () {
        if (editor.wp && editor.wp._createToolbar) {
          var element = tinymce.$('.fee-thumbnail')[0]

          if (!element) return

          var toolbar = editor.wp._createToolbar([ 'add_featured_image', 'remove_featured_image' ])

          toolbar.$el.addClass('fee-no-print mce-arrow-down')

          toolbar.reposition = function () {
            var toolbar = this.getEl()
            var elementRect = element.getBoundingClientRect()
            var toolbarRect = toolbar.getBoundingClientRect()

            DOM.setStyles(toolbar, {
              'position': 'absolute',
              'left': elementRect.left + (elementRect.width / 2) - (toolbarRect.width / 2),
              'top': elementRect.top + window.pageYOffset - toolbarRect.height - 8
            })
          }

          toolbar.reposition()

          DOM.bind(window, 'click', function (event) {
            if (event.target === element) {
              toolbar.show()
            } else {
              toolbar.hide()
            }
          })
        }
      })

      editor.addButton('insert_media', {
        icon: 'dashicon dashicons-admin-media',
        onclick: function () {
          window.wp.media.editor.open(editor.id)
        }
      })

      editor.on('focus', function () {
        if (editor.wp && editor.wp._createToolbar) {
          var toolbar = editor.wp._createToolbar(['insert_media'])
          var element

          toolbar.$el.addClass('fee-no-print mce-arrow-left-side')

          editor.on('wptoolbar', function (event) {
            element = event.element

            if (editor.dom.isEmpty(event.element) && (event.element.nodeName === 'P' || (
              event.element.nodeName === 'BR' && event.element.parentNode.nodeName === 'P'
            ))) {
              event.toolbar = toolbar
            }
          })

          toolbar.reposition = function () {
            if (!element) return

            var toolbar = this.getEl()
            var toolbarRect = toolbar.getBoundingClientRect()
            var elementRect = element.getBoundingClientRect()

            DOM.setStyles(toolbar, {
              'position': 'absolute',
              'left': elementRect.left + 8 + 'px',
              'top': elementRect.top + window.pageYOffset + elementRect.height / 2 - toolbarRect.height / 2 + 'px'
            })

            this.show()
          }

          editor.on('keyup', _.throttle(function (event) {
            if (editor.dom.isEmpty(editor.selection.getNode())) {
              editor.nodeChanged()
            } else {
              toolbar.hide()
            }
          }, 500))

          editor.on('blur', function () {
            toolbar.hide()
          })
        }
      })

      return {}
    }
  })
})(window.tinymce, window._)
