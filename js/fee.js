window.fee = (function (
  settings,
  $,
  media,
  tinymce,
  _,
  Backbone
) {
  var hidden = true

  var BaseModel = Backbone.Model.extend({
    urlRoot: settings.api.root + 'wp/v2/' + settings.api.endpoint,
    sync: function (method, model, options) {
      var beforeSend = options.beforeSend

      options.beforeSend = function (xhr) {
        xhr.setRequestHeader('X-WP-Nonce', settings.api.nonce)
        if (beforeSend) return beforeSend.apply(this, arguments)
      }

      return Backbone.sync(method, model, _.clone(options)).then(function (data, text, xhr) {
        var nonce = xhr.getResponseHeader('X-WP-Nonce')

        if (nonce) {
          settings.api.nonce = nonce
        }
      }, function (data) {
        if (data.responseText) {
          data = JSON.parse(data.responseText)

          // Nonce expired, so get a new one and try again.
          if (data.code === 'rest_cookie_expired_nonce') {
            return $.post(settings.ajaxURL, {action: 'fee_nonce'}).then(function (data) {
              settings.api.nonce = data
              return Backbone.sync(method, model, options)
            })
          }
        }
      })
    }
  })

  var AutosaveModel = BaseModel.extend({
    isNew: function () {
      return true
    },
    url: function () {
      return BaseModel.prototype.url.apply(this, arguments) + '/' + this.get('id') + '/autosave'
    }
  })

  var Model = BaseModel.extend({
    save: function (attributes) {
      this.trigger('beforesave')

      var publish = attributes && attributes.status === 'publish'
      var xhr

      attributes = _.pick(this.toJSON(), ['id', 'title', 'content', '_fee_session'])

      if (publish) {
        attributes.status = 'publish'
      }

      if (publish || _.some(attributes, function (v, k) {
        return !_.isEqual($.trim(v), $.trim(this._fee_last_save[k]))
      }, this)) {
        // If it's not published, overwrite.
        // If the status changes to publish, overwrite.
        // Othewise create a copy.
        if (this.get('status') !== 'publish' || publish) {
          xhr = BaseModel.prototype.save.call(this, attributes, {
            patch: true
          })
        } else {
          new AutosaveModel(attributes).save()
        }
      }

      this._fee_last_save = _.clone(this.attributes)

      return xhr || $.Deferred().resolve().promise()
    }
  })

  // Post model to manipulate.
  // Needs to represent the state on the server.
  var post = new Model()

  // Parse the data we got from the server and fill the model.
  post.set(post.parse(settings.post))

  post.set('_fee_session', new Date().getTime())

  post._fee_last_save = _.clone(post.attributes)

  var $document = $(document)
  var $body = $(document.body)
  var $content = $('.fee-content')
  var $titles = $findTitles()
  var $title = $findTitle($titles, $content)
  var documentTitle = document.title.replace($title.text(), '<!--replace-->')
  var $thumbnail = $('.fee-thumbnail')
  var $hasThumbnail = $('.has-post-thumbnail')
  var editors = []

  $body.addClass('fee fee-off')
  $content.removeClass('fee-content')

  var debouncedSave = _.debounce(function () {
    post.save()
  }, 1000)

  function on () {
    if (!hidden) {
      return
    }

    $body.removeClass('fee-off').addClass('fee-on')

    tinymce.init(_.extend(settings.tinymce, {
      target: $content.get(0),
      setup: function (editor) {
        editor.load = function (args) {
          var elm = this.getElement()
          var html

          args = args || {}
          args.load = true
          args.element = elm

          html = this.setContent(post.get('content').raw, args)

          if (!args.no_events) {
            this.fire('LoadContent', args)
          }

          args.element = elm = null

          return html
        }

        editors.push(editor)

        // Remove spaces from empty paragraphs.
        editor.on('BeforeSetContent', function (event) {
          if (event.content) {
            event.content = event.content.replace(/<p>(?:&nbsp;|\s)+<\/p>/gi, '<p><br></p>')
          }
        })

        editor.on('init', function () {
          editor.on('setcontent', debouncedSave)
        })

        post.on('beforesave', function () {
          post.set('content', editor.getContent())

          editor.undoManager.add()
          editor.isNotDirty = true
        })
      }
    }))

    tinymce.init({
      target: $title.get(0),
      theme: 'fee',
      paste_as_text: true,
      plugins: 'paste',
      inline: true,
      placeholder: settings.titlePlaceholder,
      entity_encoding: 'raw',
      setup: function (editor) {
        editors.push(editor)

        editor.on('keydown', function (event) {
          if (event.keyCode === 13) {
            event.preventDefault()
          }
        })

        editor.on('setcontent keyup', function () {
          var text = $title.text()

          $titles.text(text)
          document.title = documentTitle.replace('<!--replace-->', text)
        })

        editor.on('init', function () {
          editor.on('setcontent', debouncedSave)
        })

        post.on('beforesave', function () {
          post.set('title', editor.getContent())

          editor.undoManager.add()
          editor.isNotDirty = true
        })
      }
    })

    $document.on('keyup.fee-writing', debouncedSave)

    $hasThumbnail.addClass('has-post-thumbnail')
    $thumbnail.show().parent().show()

    hidden = false
  }

  function off () {
    if (post.get('status') === 'draft') {
      return
    }

    post.save().done(function () {
      document.location.reload(true)
    })
  }

  if (settings.post.status === 'draft') {
    if (settings.post.title.raw === 'Auto Draft' && !settings.post.content.raw) {
      $title.empty()
    }

    on()
  }

  if (settings.post.featured_media === 0) {
    $hasThumbnail.removeClass('has-post-thumbnail')
    $thumbnail.hide()

    if (!$thumbnail.siblings().get(0)) {
      $thumbnail.parent().hide()
    }
  }

  _.extend(media.featuredImage, {
    set: function (id) {
      var settings = media.view.settings

      settings.post.featuredImageId = id

      media.post('fee_thumbnail', {
        post_ID: settings.post.id,
        thumbnail_ID: settings.post.featuredImageId,
        _wpnonce: settings.post.nonce,
        size: $thumbnail.data('fee-size')
      }).done(function (html) {
        $thumbnail.html(html)
      })
    }
  })

  // Wait for admin bar to load.
  $(function () {
    $('a[href="' + settings.editURL + '"]').on('click.fee-link', function (event) {
      if (!tinymce.util.VK.modifierPressed(event)) {
        event.preventDefault()
        hidden ? on() : off()
      }
    })
  })

  function $findTitles () {
    var $br = $('br.fee-title')
    var $titles = $br.parent()

    $br.remove()

    return $titles
  }

  function $findTitle ($all, $content) {
    var title = false
    var $parents = $content.parents()
    var index

    $all.each(function () {
      var self = this
      var i = 0

      $(this).parents().each(function () {
        i++

        if ($.inArray(this, $parents) !== -1) {
          if (!index || i < index) {
            index = i
            title = self
          }

          return false
        }
      })
    })

    $titles = $all.not(title)

    return $(title)
  }

  // Save post data before unloading the page as a last resort.
  // This does not work in Opera.
  $(window).on('unload', function () {
    post.trigger('beforesave')

    var autosave = post.get('status') === 'publish' ? '/autosave' : ''
    var url = post.url() + autosave + '?_method=put&_wpnonce=' + settings.api.nonce
    var data = JSON.stringify(post.attributes)

    if (!navigator.sendBeacon || !navigator.sendBeacon(url, data)) {
      $.post({async: false, data: data, url: url})
    }
  })

  return {
    post: post
  }
})(
  window.feeData,
  window.jQuery,
  window.wp.media,
  window.tinymce,
  window._,
  window.Backbone
)
