window.fee = window.fee || {}
window.fee.insertBlob = (function (blobToBase64) {
  return function (editor, blob) {
    var blobCache = editor.editorUpload.blobCache
    var blobInfo = blobCache.create(new Date().getTime(), blob, blobToBase64(blob))
    blobCache.add(blobInfo)
    editor.insertContent(editor.dom.createHTML('img', {src: blobInfo.blobUri()}))
    editor.nodeChanged()
  }
})(window.fee.blobToBase64)
