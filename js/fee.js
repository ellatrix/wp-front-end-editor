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
    // Overwrite `sync` to send event before syncing.
    sync: function () {
      this.trigger('beforesync')
      return BaseModel.prototype.sync.apply(this, arguments)
    },
    autosave: function () {
      if (this.get('status') === 'draft') {
        this.save()
      } else {
        this.trigger('beforesync')
        new AutosaveModel(_.clone(this.attributes)).save()
      }
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

  // Set heartbeat to run every minute.
  heartbeat.interval(60)

  var $document = $(document)
  var $body = $(document.body)
  var $content = $('.fee-content')
  var $titles = findTitles()
  var $title = findTitle($titles, $content)
  var documentTitle = document.title.replace($title.text(), '<!--replace-->')

  $(function () {
    var $links = $('a[href="' + data.editURL + '"]')
    var $hasPostThumbnail = $('.has-post-thumbnail')
    var $thumbnail = $('.fee-thumbnail')
    var $thumbnailWrap = $('.fee-thumbnail-wrap')
    var $thumbnailEdit = $('.fee-edit-thumbnail').add('.fee-insert-thumbnail')
    var $thumbnailRemove = $('.fee-remove-thumbnail')
    var editors = []

    function on () {
      if (!hidden) {
        return
      }

      $body.removeClass('fee-off').addClass('fee-on')
      $hasPostThumbnail.addClass('has-post-thumbnail')

      tinymce.init(_.extend(data.tinymce, {
        setup: function (editor) {
          // Used by the media library,
          window.wpActiveEditor = editor.id

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

          post.on('beforesync', function () {
            post.set('content', {
              raw: editor.getContent()
            })

            editor.undoManager.add()
            editor.isNotDirty = true
          })
        }
      }))

      tinymce.init({
        selector: '.fee-title',
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

          post.on('beforesync', function () {
            post.set('title', {
              raw: editor.getContent()
            })

            editor.undoManager.add()
            editor.isNotDirty = true
          })
        }
      })

      hidden = false
    }

    function off () {
      if (hidden || post.get('status') === 'auto-draft') {
        return
      }

      $body.removeClass('fee-on').addClass('fee-off')
      if (!$thumbnail.find('img').length) {
        $hasPostThumbnail.removeClass('has-post-thumbnail')
      }

      _.each(editors, function (editor) {
        editor.remove()
      })

      document.title = documentTitle.replace('<!--replace-->', post.get('title').rendered)
      $titles.add($title).html(post.get('title').rendered)

      $content.html(post.get('content').rendered)

      hidden = true
    }

    function isDirty () {
      var dirty

      _.each(editors, function (editor) {
        dirty = dirty || editor.isDirty()
      })

      return dirty
    }

    if (data.post.status === 'auto-draft') {
      on()
    } else if (!$thumbnail.find('img').length) {
      $hasPostThumbnail.removeClass('has-post-thumbnail')
    }

    $document.on('keydown.fee', function (event) {
      if (event.keyCode === 83 && tinymce.util.VK.metaKeyPressed(event)) {
        event.preventDefault()
        post.save()
      }
    })

    $document.on('heartbeat-send.fee-refresh-nonces', function () {
      if (!hidden && isDirty()) {
        post.autosave()
      }
    })

    $document.on('heartbeat-tick.fee-refresh-nonces', function (event, data) {
      if (data.fee_nonces) {
        window.wpApiSettings.nonce = data.fee_nonces.api
        window.heartbeatSettings.nonce = data.fee_nonces.heartbeat
      }
    })

    $links.on('click.fee-link', function (event) {
      event.preventDefault()

      if (hidden) {
        on()
      } else {
        off()
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
          size: $thumbnail.data('size')
        }).done(function (html) {
          $thumbnailWrap.html(html)
          $thumbnail.removeClass('fee-thumbnail-active')

          if (html === '') {
            $thumbnail.addClass('fee-empty')
          } else {
            $thumbnail.removeClass('fee-empty')
          }
        })
      }
    })

    $thumbnailEdit.on('click.fee-edit-thumbnail', function () {
      media.featuredImage.frame().open()
    })

    $thumbnailRemove.on('click.fee-remove-thumbnail', function () {
      media.featuredImage.set(-1)
    })

    $thumbnail.on('click.fee-thumbnail-active', function () {
      if (hidden || $thumbnail.hasClass('fee-empty')) {
        return
      }

      $thumbnail.addClass('fee-thumbnail-active')

      $document.on('click.fee-thumbnail-active', function (event) {
        if ($thumbnail.get(0) === event.target || $thumbnail.has(event.target).length) {
          return
        }

        $thumbnail.removeClass('fee-thumbnail-active')

        $document.off('click.fee-thumbnail-active')
      })
    })
  })

  function findTitles () {
    var $br = $('br.fee-title')
    var $titles = $br.parent()

    $br.remove()

    return $titles
  }

  function findTitle ($all, $content) {
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

    return $(title).addClass('fee-title')
  }

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
