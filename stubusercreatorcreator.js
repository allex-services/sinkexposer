function createStubUserCreator(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;


  var _zeroparamfuncbody = "if(!this.checkDefer(['METHODNAME'], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME'],defer);",
    _oneparamfuncbody = "if(!this.checkDefer(['METHODNAME',a], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a],defer);",
    _twoparamfuncbody = "if(!this.checkDefer(['METHODNAME',a,b], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a,b],defer);",
    _threeparamfuncbody = "if(!this.checkDefer(['METHODNAME',a,b,c], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a,b,c],defer);",
    _fourparamfuncbody = "if(!this.checkDefer(['METHODNAME',a,b,c,d], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a,b,c,d],defer);",
    _fiveparamfuncbody = "if(!this.checkDefer(['METHODNAME',a,b,c,d,e], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a,b,c,d,e],defer);",
    _sixparamfuncbody = "if(!this.checkDefer(['METHODNAME',a,b,c,d,e,f], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a,b,c,d,e,f],defer);",
    _sevenparamfuncbody = "if(!this.checkDefer(['METHODNAME',a,b,c,d,e,f,g], defer)){process.exit(-1); return;} this.__service.forwardMethod(['METHODNAME',a,b,c,d,e,f,g],defer)";

  function methodAdder (StubUser, sink, mdesc, mname) {
    var paramcount = ('object' === typeof mdesc ? Object.keys(mdesc).length : 0);
    //console.log('User stubbing', mname, paramcount, 'params');
    switch(paramcount) {
      case 0:
        StubUser.prototype[mname] = new Function('defer', _zeroparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 1:
        StubUser.prototype[mname] = new Function('a','defer', _oneparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 2:
        StubUser.prototype[mname] = new Function('a','b','defer', _twoparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 3:
        StubUser.prototype[mname] = new Function('a','b','c','defer', _threeparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 4:
        StubUser.prototype[mname] = new Function('a','b','c','d','defer', _fourparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 5:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','defer', _fiveparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 6:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','defer', _sixparamfuncbody.replace(/METHODNAME/g, mname));
        break;
      case 7:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','g','defer', _sevenparamfuncbody.replace(/METHODNAME/g, mname));
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
    StubUser.prototype.role = User.prototype.role;
    StubUser.stateFilter = User.stateFilter;
    lib.traverseShallow(sink.clientuser.__methodDescriptors,methodAdder.bind(null, StubUser, sink));
    StubUser.prototype.checkDefer = function(arry, d) {
      if (!d) {
        console.error('GOT NO DEFER!', arry);
        return false;
      }
      if (!q.isPromise(d.promise)) {
        console.error('GOT NO DEFER!', arry);
        return false;
      }
      return true;
    };
    return StubUser;
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  }


}

module.exports = createStubUserCreator;
