(function ($, settings) {
  $(function () {
    $.each(settings.postTypes, function (k, v) {
      $('a[href="' + settings.postNew + '?post_type=' + k + '"]')
        .add(k === 'post' ? 'a[href="' + settings.postNew + '"]' : null)
        .on('click', function (event) {
          event.preventDefault()

          $.post(settings.api.root + 'wp/v2/' + v, {
            _wpnonce: settings.api.nonce,
            title: 'Auto Draft'
          }).done(function (data) {
            if (data.link) {
              window.location.href = data.link
            }
          })
        })
    })
  })
})(window.jQuery, window.fee_adminbar)
