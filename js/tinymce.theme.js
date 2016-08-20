(function (tinymce, _) {
  tinymce.ThemeManager.add('fee', function (editor) {
    this.renderUI = function () {
      var settings = editor.settings
      var each = tinymce.each
      var DOM = tinymce.DOM

      editor.on('focus', function () {
        if (editor.wp && editor.wp._createToolbar) {
          var element
          var toolbarInline = editor.wp._createToolbar(settings.toolbars.inline)
          var toolbarBlock = editor.wp._createToolbar(settings.toolbars.block)
          var toolbarCaret = editor.wp._createToolbar(settings.toolbars.caret)

          toolbarInline.$el.addClass('fee-no-print')
          toolbarBlock.$el.addClass('fee-no-print')
          toolbarCaret.$el.addClass('fee-no-print mce-arrow-left-side')

          toolbarCaret.reposition = function () {
            if (!element) return

            var toolbar = this.getEl()
            var toolbarRect = toolbar.getBoundingClientRect()
            var elementRect = element.getBoundingClientRect()

            DOM.setStyles(toolbar, {
              position: 'absolute',
              left: elementRect.left + 8 + 'px',
              top: elementRect.top + window.pageYOffset + elementRect.height / 2 - toolbarRect.height / 2 + 'px'
            })

            this.show()
          }

          editor.on('keyup', _.throttle(function (event) {
            if (editor.dom.isEmpty(editor.selection.getNode())) {
              editor.nodeChanged()
            } else {
              toolbarCaret.hide()
            }
          }, 500))

          editor.on('blur', function () {
            toolbarCaret.hide()
          })

          editor.on('wptoolbar', function (event) {
            element = event.element
            element.normalize()

            var range = editor.selection.getRng()
            var content = editor.selection.getContent()
            var parent = editor.dom.getParent(range.startContainer, '*[data-mce-selected="block"]')

            if (parent) {
              event.toolbar = toolbarBlock
              event.selection = parent
              return
            }

            // No collapsed selection.
            if (range.collapsed) {
              if (editor.dom.isEmpty(event.element) && (event.element.nodeName === 'P' || (
                event.element.nodeName === 'BR' && event.element.parentNode.nodeName === 'P'
              ))) {
                event.toolbar = toolbarCaret
              }

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

            event.toolbar = toolbarInline
            event.selection = range
          })
        }
      })

      editor.addButton('heading', {
        type: 'FEESelect',
        text: 'H',
        classes: 'widget btn i-heading',
        stateSelector: 'h2,h3,h4,h5,h6',
        options: {
          p: {
            text: settings.strings.paragraph,
            icon: 'H'
          },
          h2: {
            text: settings.strings.heading2,
            icon: 'H2'
          },
          h3: {
            text: settings.strings.heading3,
            icon: 'H3'
          },
          h4: {
            text: settings.strings.heading4,
            icon: 'H4'
          },
          h5: {
            text: settings.strings.heading5,
            icon: 'H5'
          },
          h6: {
            text: settings.strings.heading6,
            icon: 'H6'
          }
        }
      })

      editor.addButton('save', {
        text: settings.strings.saved,
        onclick: function () {
          window.fee.post.save()
        },
        onPostRender: function () {
          var button = this

          window.fee.post.on('request', function (model, xhr) {
            button.$el.find('.mce-txt').text(settings.strings.saving)
            button.active(true)
            button.disabled(true)

            xhr.done(function () {
              button.$el.find('.mce-txt').text(settings.strings.saved)
            }).fail(function () {
              button.$el.find('.mce-txt').text(settings.strings.error)
            }).always(function () {
              button.active(false)
              button.disabled(true)
            })
          })
        }
      })

      editor.addButton('publish', {
        text: settings.strings.publish,
        classes: 'widget btn primary',
        onclick: function () {
          window.fee.post.save({status: 'publish'}).done(function () {
            window.location.reload(true)
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
            self.text(options[ this.value ].icon)
            editor.formatter.apply(this.value)
          })

          editor.on('nodechange', function (event) {
            var formatter = editor.formatter

            each(event.parents, function (node) {
              each(options, function (value, key) {
                if (formatter.matchNode(node, key)) {
                  $select[0].value = key
                  self.text(value.icon)
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
          var toolbar = editor.wp._createToolbar(['save', 'publish']).show()

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

      editor.addButton('media', {
        icon: 'dashicon dashicons-admin-media',
        onclick: function () {
          window.wp.media.editor.open(editor.id)
        }
      })

      editor.addButton('select', {
        icon: 'dashicon dashicons-editor-textcolor',
        onclick: function () {
          var range = editor.selection.getRng()
          var $start = editor.$(editor.dom.getParent(range.startContainer, editor.dom.isBlock))
          var $end = editor.$(editor.dom.getParent(range.endContainer, editor.dom.isBlock))

          $start.add($start.nextUntil($end)).add($end).attr('data-mce-selected', 'block')
          editor.nodeChanged()

          editor.once('click keydown', function () {
            editor.$('*[data-mce-selected="block"]').removeAttr('data-mce-selected')
            editor.nodeChanged()
          })
        }
      })

      return {}
    }
  })
})(window.tinymce, window._)
