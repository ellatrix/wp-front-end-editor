window.fee = window.fee || {}
window.fee.SelectControl = (function (tinymce) {
  return tinymce.ui.Widget.extend({
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

      tinymce.each(self.settings.options, function (v, k) {
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
      var editor = self.settings.editor

      $select.on('change', function () {
        self.text(options[ this.value ].icon)
        editor.formatter.apply(this.value)
      })

      editor.on('nodechange', function (event) {
        var formatter = editor.formatter

        tinymce.each(event.parents, function (node) {
          tinymce.each(options, function (value, key) {
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
})(window.tinymce)
