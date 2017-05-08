var values = require('./util/values')

var EXTENSION_NAME = 'OES_vertex_array_object'
var extension = null // shared

module.exports = function wrapVAOState (gl, stats, config) {
  // fetch shared extension once
  if (extension === null) {
    extension = gl.getExtension(EXTENSION_NAME)
  }

  var hasNativeSupport = typeof gl.createVertexArray === 'function'
  var hasExtensionSupport = Boolean(extension)
  var vaoCount = 0
  var vaoSet = {}
  var api = createVAOAPI(gl)

  // VAO factory
  return {
    extension: extension,
    create: createVAO,
    clear: clearVAOs,
    hasSupport: hasNativeSupport || hasExtensionSupport,
    hasNativeSupport: hasNativeSupport,
    hasExtensionSupport: hasExtensionSupport
  }

  //
  // Creates and returns a new `REGLVAO' instance after adding
  // it to the internal object set. If successful, the `stats.vaoCount'
  // is incremented. Upon destruction of this instance, the
  // `stats.vaoCount' is decremented. A `REGLVAO' instance has a unique
  // ID and a reference to the underyling vertex array object handle
  // created with `gl.createVertexArray()' or the extensions equivalent.
  //
  function createVAO () {
    var vao = new REGLVAO(gl)
    vaoSet[vao.id] = vao
    stats.vaoCount = vaoCount
    return vao
  }

  //
  // Destroys all `REGLVAO' instances in the internal object set.
  // by calling `gl.deleteVertexArray()' or the extensions equivalent.
  //
  function clearVAOs () {
    values(vaoSet).forEach(function (vao) {
      if (vao && typeof vao.destroy === 'function') {
        vao.destroy()
      }
    })
  }

  //
  // Creates a uniformed API for the creation, deletion, and binding
  // of vertex array objects. If there is native support, the corresponding
  // functions for these operations are bound to an object. If native support
  // is lacking and there is an extension providing support, then the
  // supporting extension methods are renamed and bound to an object.
  //
  function createVAOAPI (gl) {
    if (!hasNativeSupport && !hasExtensionSupport) {
      return null
    }

    return {
      bindVertexArray: hasNativeSupport
        ? gl.bindVertexArray.bind(gl)
        : extension.bindVertexArrayOES.bind(extension),

      createVertexArray: hasNativeSupport
        ? gl.createVertexArray.bind(gl)
        : extension.createVertexArrayOES.bind(extension),

      deleteVertexArray: hasNativeSupport
        ? gl.deleteVertexArray.bind(gl)
        : extension.deleteVertexArrayOES.bind(extension)
    }
  }

  //
  // Encapsualtes a vertex array object handle and provides methods
  // for binding, unbinding, and destroying a vertex array object.
  //
  function REGLVAO (gl) {
    var isSupported = Boolean(api && hasNativeSupport || hasExtensionSupport)

    this.id = -1
    this.handle = null

    if (isSupported) {
      this.handle = api.createVertexArray()
      if (this.handle) {
        this.id = vaoCount++
      }
    }

    this.bind = function () {
      if (api && this.handle) {
        api.bindVertexArray(this.handle)
      }
    }

    this.unbind = function () {
      if (api) {
        api.bindVertexArray(null)
      }
    }

    this.destroy = function () {
      if (api && this.handle) {
        api.deleteVertexArray(this.handle)
        vaoCount = Math.max(0, vaoCount - 1)
        stats.vaoCount = vaoCount
        this.id = -1
        this.handle = null
      }
    }
  }
}
