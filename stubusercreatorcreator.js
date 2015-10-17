function createStubUserCreator(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;


  var _zeroparamfuncbody = "this.__service.forwardMethod(['METHODNAME']).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _oneparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _twoparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a,b]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _threeparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a,b,c]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _fourparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a,b,c,d]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _fiveparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a,b,c,d,e]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _sixparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a,b,c,d,e,f]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))",
    _sevenparamfuncbody = "this.__service.forwardMethod(['METHODNAME',a,b,c,d,e,f,g]).done(defer.resolve.bind(defer),defer.reject.bind(defer),defer.notify.bind(defer))";

  function methodAdder (StubUser, sink, mdesc, mname) {
    var paramcount = ('object' === typeof mdesc ? Object.keys(mdesc).length : 0);
    //console.log(mname, paramcount, 'params');
    switch(paramcount) {
      case 0:
        StubUser.prototype[mname] = new Function('defer', _zeroparamfuncbody.replace('METHODNAME', mname));
        break;
      case 1:
        StubUser.prototype[mname] = new Function('a','defer', _oneparamfuncbody.replace('METHODNAME', mname));
        break;
      case 2:
        StubUser.prototype[mname] = new Function('a','b','defer', _twoparamfuncbody.replace('METHODNAME', mname));
        break;
      case 3:
        StubUser.prototype[mname] = new Function('a','b','c','defer', _threeparamfuncbody.replace('METHODNAME', mname));
        break;
      case 4:
        StubUser.prototype[mname] = new Function('a','b','c','d','defer', _fourparamfuncbody.replace('METHODNAME', mname));
        break;
      case 5:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','defer', _fiveparamfuncbody.replace('METHODNAME', mname));
        break;
      case 6:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','defer', _sixparamfuncbody.replace('METHODNAME', mname));
        break;
      case 7:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','g','defer', _sevenparamfuncbody.replace('METHODNAME', mname));
        break;
      default:
        throw new lib.Error('TOO_MANY_INPUT_PARAMETERS', paramcount+' is too much');
    }
  }

  return function createStubUser(GenericUser, User, sink) {
    try {
    var StubUser = function (prophash){
      GenericUser.call(this, prophash);
      this.sinkDestroyedListener = sink.destroyed.attach(this.destroy.bind(this));
    }
    //console.log('will call User.inherit with', StubUser, sink.clientuser.__methodDescriptors, User.stateFilter);
    GenericUser.inherit(StubUser, sink.clientuser.__methodDescriptors, User.stateFilter);
    StubUser.prototype.modulename = sink.modulename;
    lib.traverseShallow(sink.clientuser.__methodDescriptors,methodAdder.bind(null, StubUser, sink));
    return StubUser;
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  }


}

module.exports = createStubUserCreator;
