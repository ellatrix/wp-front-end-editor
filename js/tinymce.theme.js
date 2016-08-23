(function (
  tinymce,
  _,
  filePicker,
  insertBlob,
  SelectControl
) {
  tinymce.ThemeManager.add('fee', function (editor) {
    tinymce.ui.FEESelect = SelectControl

    this.renderUI = function () {
      var settings = editor.settings
      var DOM = tinymce.DOM

      editor.on('focus', function () {
        if (editor.wp && editor.wp._createToolbar) {
          var element
          var toolbarInline = editor.wp._createToolbar(settings.toolbars.inline)
          var toolbarBlock = editor.wp._createToolbar(settings.toolbars.block)
          var toolbarCaret = editor.wp._createToolbar(settings.toolbars.caret)
          var toolbarMedia = editor.wp._createToolbar(['media_new', 'media_images', 'media_audio', 'media_video', 'media_insert', 'media_select'])

          toolbarInline.$el.addClass('fee-no-print')
          toolbarBlock.$el.addClass('fee-no-print')
          toolbarCaret.$el.addClass('fee-no-print mce-arrow-left-side')
          toolbarMedia.$el.addClass('fee-no-print mce-arrow-left-side')

          toolbarMedia.blockHide = true

          toolbarCaret.reposition =
          toolbarMedia.reposition = function () {
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
            var block = editor.dom.getParent(range.startContainer, '*[data-mce-selected="block"]')

            if (block) {
              event.toolbar = toolbarBlock
              event.selection = block
              return
            }

            var media = editor.dom.getParent(range.startContainer, '*[data-mce-selected="media"]')

            if (media) {
              event.toolbar = toolbarMedia
              // event.selection = media
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
        editor: editor,
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
          var range = editor.selection.getRng()
          var $start = editor.$(editor.dom.getParent(range.startContainer, editor.dom.isBlock))

          $start.attr('data-mce-selected', 'media')
          editor.nodeChanged()

          editor.once('click keydown', function () {
            editor.$('*[data-mce-selected="media"]').removeAttr('data-mce-selected')
            editor.nodeChanged()
          })
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

      editor.addButton('media_new', {
        icon: 'dashicon dashicons-plus-alt',
        onclick: function () {
          filePicker().done(function (fileList) {
            _.each(fileList, function (file) {
              insertBlob(editor, file)
            })

            editor.editorUpload.uploadImages()
          })
        }
      })

      editor.addButton('media_images', {
        icon: 'dashicon dashicons-format-image',
        active: true,
        onclick: function () {}
      })

      editor.addButton('media_audio', {
        icon: 'dashicon dashicons-format-audio',
        onclick: function () {
          window.wp.media.editor.open(editor.id)
        }
      })

      editor.addButton('media_video', {
        icon: 'dashicon dashicons-video-alt2',
        onclick: function () {
          window.wp.media.editor.open(editor.id)
        }
      })

      var Collection = window.Backbone.Collection.extend({
        url: window.feeData.api.root + 'wp/v2/media?per_page=20&media_type=image&context=edit&_wpnonce=' + window.feeData.api.nonce
      })

      var collection = new Collection()

      tinymce.ui.FEEImageSelect = tinymce.ui.Control.extend({
        renderHtml: function () {
          return (
            '<div id="' + this._id + '" class="fee-image-select"></div>'
          )
        },
        load: function () {
          var self = this

          this.$el.on('click', function (event) {
            tinymce.$(event.target).toggleClass('fee-selected')
          })

          collection.fetch().done(function (data) {
            var string = ''

            _.each(data, function (image) {
              if (image.media_details.sizes.thumbnail) {
                string += '<img data-id="' + image.id + '" src="' + image.media_details.sizes.thumbnail.source_url + '">'
              }
            })

            self.$el.append(string)
          })
        }
      })

      editor.addButton('media_select', {
        type: 'FEEImageSelect',
        onPostRender: function () {
          this.load()
        }
      })

      editor.addButton('media_insert', {
        text: 'Insert',
        classes: 'widget btn primary',
        onclick: function () {
          tinymce.$('.fee-image-select img.fee-selected').each(function () {
            var image = collection.get(tinymce.$(this).attr('data-id'))
            editor.insertContent(editor.dom.createHTML('img', {src: image.get('source_url')}))
          })
        }
      })

      return {}
    }
  })
})(
  window.tinymce,
  window._,
  window.fee.filePicker,
  window.fee.insertBlob,
  window.fee.SelectControl
)
