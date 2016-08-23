window.fee = window.fee || {}
window.fee.filePicker = (function (Deferred) {
  return function () {
    return Deferred(function (deferred) {
      var input = document.createElement('input')

      input.type = 'file'
      input.multiple = true
      input.style.position = 'fixed'
      input.style.left = 0
      input.style.top = 0
      input.style.opacity = 0.001

      input.onchange = function (event) {
        deferred.resolve(event.target.files)
      }

      document.body.appendChild(input)

      input.click()
      input.parentNode.removeChild(input)
    })
  }
})(window.jQuery.Deferred)
