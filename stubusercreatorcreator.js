function createStubUserCreator(execlib) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q;
  function checkDefer(arry, d) {
    if (!d) {
      console.error('GOT NO DEFER!', arry);
      return false;
    }
    if (!q.isPromise(d.promise)) {
      console.error('GOT NO DEFER!', arry);
      return false;
    }
    return true;
  }
  function paramsstring(paramcount, methodname) {
    var ret="['"+methodname+"'", i;
    for (i=0; i<paramcount; i++) {
      ret += ',';
      ret += String.fromCharCode(97+i);
    }
    ret += ']';
    return ret;
  }
  function funcbody(paramcount, stubmethodname) {
    var prms = paramsstring(paramcount, stubmethodname), ret;
    ret = 'if(!this.checkDefer('+prms+', defer)){process.exit(-1); return;} this.forwardMethod('+prms+',defer);';
    return ret;
  }
  function methodAdder (StubUser, mdesc, mname) {
    var paramcount = ('object' === typeof mdesc ? Object.keys(mdesc).length : 0);
    switch(paramcount) {
      case 0:
        StubUser.prototype[mname] = new Function('defer', funcbody(paramcount, mname));
        break;
      case 1:
        StubUser.prototype[mname] = new Function('a', 'defer', funcbody(paramcount, mname));
        break;
      case 2:
        StubUser.prototype[mname] = new Function('a', 'b', 'defer', funcbody(paramcount, mname));
        break;
      case 3:
        StubUser.prototype[mname] = new Function('a','b','c','defer', funcbody(paramcount, mname));
        break;
      case 4:
        StubUser.prototype[mname] = new Function('a','b','c','d','defer', funcbody(paramcount, mname));
        break;
      case 5:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','defer', funcbody(paramcount, mname));
        break;
      case 6:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','defer', funcbody(paramcount, mname));
        break;
      case 7:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','g','defer', funcbody(paramcount, mname));
        break;
      case 8:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','g','h','defer', funcbody(paramcount, mname));
        break;
      case 9:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','g','h','i','defer', funcbody(paramcount, mname));
        break;
      case 10:
        StubUser.prototype[mname] = new Function('a','b','c','d','e','f','g','h','i','j','defer', funcbody(paramcount, mname));
        break;
      default:
        throw new lib.Error('TOO_MANY_INPUT_PARAMETERS', paramcount+' is too much for '+mname);
    }
  }

  return function createStubUser(GenericUser, User, sink) {
    try {
    var sessionctor = User.prototype.getSessionCtor('.'),
      genericsessionctor = GenericUser.prototype.getSessionCtor('.'),
      StubUser = function (prophash){
        GenericUser.call(this, prophash);
        this.sinkDestroyedListener = sink.destroyed.attach(this.destroy.bind(this));
      },
      StubSession = function (user, session, gate){
        genericsessionctor.call(this, user, session, gate);
      };
    genericsessionctor.inherit(StubSession, sessionctor.prototype.__methodDescriptors);
    //console.log(process.pid+' now __methodDescriptors on StubSession are', StubSession.prototype.__methodDescriptors);
    //console.log('will call User.inherit with', StubUser, sink.clientuser.__methodDescriptors, User.stateFilter);
    lib.traverseShallow(sessionctor.prototype.__methodDescriptors,methodAdder.bind(null, StubSession));
    lib.traverseShallow(genericsessionctor.prototype.__methodDescriptors, function (methoddesc, methodname) {
      StubSession.prototype[methodname] = genericsessionctor.prototype[methodname];
    });
    StubSession.prototype.forwardMethod = function (args, defer) {
      this.user.__service.forwardSessionMethod(args, defer);
    };
    StubSession.prototype.checkDefer = checkDefer;
    GenericUser.inherit(StubUser, sink.clientuser.__methodDescriptors, User.stateFilter);
    StubUser.prototype.__cleanUp = function () {
      if (this.sinkDestroyedListener) {
        this.sinkDestroyedListener.destroy();
      }
      this.sinkDestroyedListener = null;
      GenericUser.prototype.__cleanUp.call(this);
    };
    StubUser.prototype.modulename = sink.modulename;
    StubUser.prototype.role = User.prototype.role;
    StubUser.stateFilter = User.stateFilter;
    lib.traverseShallow(sink.clientuser.__methodDescriptors,methodAdder.bind(null, StubUser));
    StubUser.prototype.forwardMethod = function (args, defer) {
      this.__service.forwardMethod(args, defer);
    };
    StubUser.prototype.checkDefer = checkDefer;
    StubUser.prototype.getSessionCtor = execlib.execSuite.userSessionFactoryCreator(StubSession);

    return StubUser;
    } catch (e) {
      console.error(e.stack);
      console.error(e);
    }
  }


}

module.exports = createStubUserCreator;
