window.fee = (function (
  data,
  $,
  api,
  heartbeat,
  media,
  tinymce,
  _
) {
  var hidden = true

  var BaseModel = api.models[ data.post.type === 'page' ? 'Page' : 'Post' ]

  var AutosaveModel = BaseModel.extend({
    isNew: function () {
      return true
    },
    url: function () {
      return BaseModel.prototype.url.apply(this, arguments) + '/autosave'
    }
  })

  var Model = BaseModel.extend({
    save: function (attributes) {
      this.trigger('beforesave')

      var publish = attributes && attributes.status === 'publish'
      var xhr

      if (this.get('status') === 'auto-draft') {
        this.set('status', 'draft')
      }

      if (publish || _.some(this.attributes, function (v, k) {
        if (_.indexOf(['modified', 'modified_gmt', '_links'], k) !== -1) return
        if (v != null && v.raw != null) return !_.isEqual($.trim(v.raw), $.trim(this._fee_last_save[k].raw))
        return !_.isEqual(v, this._fee_last_save[k])
      }, this)) {
        // If it's not published, overwrite.
        // If the status changes to publish, overwrite.
        // Othewise create a copy.
        if (this.get('status') !== 'publish' || publish) {
          xhr = BaseModel.prototype.save.apply(this, arguments)
        } else {
          new AutosaveModel(_.clone(this.attributes)).save()
        }
      }

      this._fee_last_save = _.clone(this.attributes)

      return xhr || $.Deferred().resolve().promise()
    },
    toJSON: function () {
      var attributes = _.clone(this.attributes)

      // TODO: investigate why these can't be saved as they are.

      if (!attributes.slug) {
        delete attributes.slug
      }

      if (!attributes.date_gmt) {
        delete attributes.date_gmt
      }

      return attributes
    }
  })

  // Post model to manipulate.
  // Needs to represent the state on the server.
  var post = new Model()

  // Parse the data we got from the server and fill the model.
  post.set(post.parse(data.post))

  post.set('_fee_session', new Date().getTime())

  post._fee_last_save = _.clone(post.attributes)

  // Set heartbeat to run every minute.
  heartbeat.interval(60)

  var $document = $(document)
  var $body = $(document.body)
  var $content = $('.fee-content')
  var $titles = $findTitles()
  var $title = $findTitle($titles, $content)
  var documentTitle = document.title.replace($title.text(), '<!--replace-->')
  var $thumbnail = $('.fee-thumbnail')
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

    tinymce.init(_.extend(data.tinymce, {
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

        editor.on('setcontent', debouncedSave)

        post.on('beforesave', function () {
          post.set('content', {
            raw: editor.getContent(),
            rendered: post.get('content').rendered
          })

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
      placeholder: data.titlePlaceholder,
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

        editor.on('setcontent', debouncedSave)

        post.on('beforesave', function () {
          post.set('title', {
            raw: editor.getContent(),
            rendered: post.get('title').rendered
          })

          editor.undoManager.add()
          editor.isNotDirty = true
        })
      }
    })

    $thumbnail.on('click.fee-edit-thumbnail', function () {
      media.featuredImage.frame().open()
    })

    $document.on('keyup.fee-writing', debouncedSave)

    hidden = false
  }

  function off () {
    if (post.get('status') === 'auto-draft') {
      return
    }

    post.save().done(function () {
      document.location.reload(true)
    })
  }

  if (data.post.status === 'auto-draft') {
    on()
  }

  $document.on('heartbeat-tick.fee-refresh-nonces', function (event, data) {
    if (data.fee_nonces) {
      window.wpApiSettings.nonce = data.fee_nonces.api
      window.heartbeatSettings.nonce = data.fee_nonces.heartbeat
    }
  })

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

  // $thumbnailRemove.on('click.fee-remove-thumbnail', function () {
  //   media.featuredImage.set(-1)
  // })

  // Wait for admin bar to load.
  $(function () {
    $('a[href="' + data.editURL + '"]').on('click.fee-link', function (event) {
      event.preventDefault()
      hidden ? on() : off()
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
    var url = post.url() + autosave + '?_method=put&_wpnonce=' + window.wpApiSettings.nonce
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
  window.wp.api,
  window.wp.heartbeat,
  window.wp.media,
  window.tinymce,
  window._
)
