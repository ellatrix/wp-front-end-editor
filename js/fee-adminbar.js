(function ($, settings) {
  var typeRegExp = /[?&]post_type=([^&]+)(?:$|&)/
  var idRegExp = /[?&]post=([0-9]+)(?:$|&)/

  $(function () {
    $('a[href^="' + settings.adminURL + 'post-new.php"]').on('click', function (event) {
      var type = $(this).attr('href').match(typeRegExp)

      type = type ? type[1] : 'post'

      if (settings.postTypes[ type ]) {
        event.preventDefault()
        $.post(settings.api.root + 'wp/v2/' + settings.postTypes[ type ], {
          _wpnonce: settings.api.nonce,
          title: 'Auto Draft'
        }).done(function (data) {
          if (data.link) {
            window.location.href = data.link
          }
        })
      }
    })

    $('a[href^="' + settings.adminURL + 'post.php"]').on('click', function (event) {
      var href = $(this).attr('href')
      var id = href.match(idRegExp)
      var type = href.match(typeRegExp)

      if (id && type && settings.postTypes[ type[1] ] && href !== settings.editURL) {
        event.preventDefault()
        window.location.href = settings.homeURL + '?p=' + id[1] + '&edit=post'
      }
    })
  })
})(window.jQuery, window.fee_adminbar)
