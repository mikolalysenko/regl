var createContext = require('./util/create-context')
var wrapVAOState = require('../lib/vao')
var createREGL = require('../../regl')
var tape = require('tape')

var EXTENSION_NAME = 'OES_vertex_array_object'

var vaoFunctions = {
  bindVertexArray: 0,
  createVertexArray: 0,
  deleteVertexArray: 0
}

function reset() {
  Object.keys(vaoFunctions).forEach(function (fn) {
    vaoFunctions[fn] = 0
  })
}

function spy(gl) {
  var ext = gl.getExtension(EXTENSION_NAME)
  if ('createVertexArray' in gl.constructor.prototype || ext) {
    Object.keys(vaoFunctions).forEach(function (fn) {
      var oldFn
      if ('createVertexArray' in gl.constructor.prototype) {
        oldFn = gl.constructor.prototype[fn].bind(gl)
      } else {
        oldFn = ext[fn + 'OES'].bind(ext)
      }

      gl[fn] = function () {
        vaoFunctions[fn]++
        if ('createVertexArray' in gl.constructor.prototype) {
          return oldFn.apply(gl, arguments)
        } else {
          return oldFn.apply(ext, arguments)
        }
      }
    })
  }
  return gl
}

tape('vertex array object created when attributes given', function (t) {
  var gl = spy(createContext(16, 16))
  var regl = createREGL(gl)
  var vaoState = wrapVAOState(gl, regl.stats, {})

  t.assert('boolean', typeof vaoState.hasSupport)
  t.assert('boolean', typeof vaoState.hasNativeSupport)
  t.assert('boolean', typeof vaoState.hasExtensionSupport)

  if (vaoState.hasSupport === false) {
    return t.skip()
  }

  reset()
  test()
  end()

  function end () {
    regl.destroy()
    t.assert(vaoFunctions.deleteVertexArray === 1, 'deleteVertexArray called once')
    createContext.destroy(gl)
    t.end()
  }


  function test () {
    var frag = [
      'precision mediump float;',
      'void main() {',
      'gl_FragColor = vec4(1, 1, 1, 1);',
      '}'
    ].join('\n')

    var vert = [
      'precision mediump float;',
      'attribute vec3 position;',
      'void main() {',
      'gl_Position = vec4(position, 1.0);',
      '}'
    ].join('\n')

    t.assert(Object.keys(vaoFunctions).every(function (key) {
      return vaoFunctions[key] === 0
    }), 'no vertex array object function should have been called')

    t.assert(regl.stats.vaoCount === 0,
             'no vertex array objects should be created')

    var commandWithAttribute = regl({
      vert: vert,
      frag: frag,
      count: 3,
      attributes: {
        position: [
          [-1.0, -0.5 * Math.sqrt(3), 0.0],
          [1.0, -0.5 * Math.sqrt(3), 0.0],
          [0.0, 0.5 * Math.sqrt(3), 0.0]
        ]
      }
    })

    t.assert(regl.stats.vaoCount === 1,
             'one vertex array objects should be created')

    regl.clear({color: [0, 0, 0, 0]})
    commandWithAttribute()
    t.assert(vaoFunctions.bindVertexArray === 2,
             'bindVertexArray called twice for a bind and then an unbind')
  }
})

tape('vertex array object never created when attributes are not given', function (t) {
  var gl = spy(createContext(16, 16))
  var regl = createREGL(gl)
  var vaoState = wrapVAOState(gl, regl.stats, {})

  window.gl = gl

  t.assert('boolean', typeof vaoState.hasSupport)
  t.assert('boolean', typeof vaoState.hasNativeSupport)
  t.assert('boolean', typeof vaoState.hasExtensionSupport)

  if (vaoState.hasSupport === false) {
    return t.skip()
  }

  reset()
  test()
  end()

  function end () {
    regl.destroy()
    t.assert(vaoFunctions.deleteVertexArray === 0, 'deleteVertexArray never called')
    createContext.destroy(gl)
    t.end()
  }

  function test () {
    t.assert(Object.keys(vaoFunctions).every(function (key) {
      return vaoFunctions[key] === 0
    }), 'no vertex array object function should have been called')

    t.assert(regl.stats.vaoCount === 0,
             'no vertex array objects should be created')

    var commandWithOutAttributes = regl({
      context: {
        noop: function () {}
      }
    })

    t.assert(regl.stats.vaoCount === 0,
             'n0 vertex array objects should be created')

    regl.clear({color: [0, 0, 0, 0]})
    commandWithOutAttributes(function () {
    })
    t.assert(vaoFunctions.bindVertexArray === 0,
             'bindVertexArray called twice for a bind and then an unbind')
  }
})

