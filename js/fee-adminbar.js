(function ($, data) {
  $(function () {
    $.each(data.supportedPostTypes, function (i, value) {
      $('a[href="' + data.postNew + '?post_type=' + value + '"]')
        .add(value === 'post' ? 'a[href="' + data.postNew + '"]' : null)
        .attr('href', '#')
        .on('click', function (event) {
          event.preventDefault()

          window.wp.ajax.post('fee_new', {
            post_type: value,
            nonce: data.nonce
          }).done(function (url) {
            if (url) {
              window.location.href = url
            }
          })
        })
    })
  })
})(window.jQuery, window.fee_adminbar)
