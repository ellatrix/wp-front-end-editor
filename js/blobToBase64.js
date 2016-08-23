window.fee = window.fee || {}
window.fee.blobToBase64 = (function (Deferred, FileReader) {
  return function (blob) {
    return Deferred(function (deferred) {
      var reader = new FileReader()

      reader.onloadend = function () {
        deferred.resolve(reader.result.split(',')[1])
      }

      reader.readAsDataURL(blob)
    })
  }
})(window.jQuery.Deferred, window.FileReader)
