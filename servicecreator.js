function createSinkExposerService(execlib, ParentServicePack) {
  'use strict';
  var lib = execlib.lib,
    q = lib.q,
    ParentService = ParentServicePack.Service;

  function factoryCreator(parentFactory) {
    return {
      'service': require('./users/serviceusercreator')(execlib, parentFactory.get('service')),
      'user': require('./users/usercreator')(execlib, parentFactory.get('user')) 
    };
  }

  function SinkExposerService(prophash) {
    ParentService.call(this, prophash);
    this.outerSink = null;
    this.waitingIdentities = [];
    this.obtainOuterSink();
  }
  
  ParentService.inherit(SinkExposerService, factoryCreator);
  
  SinkExposerService.prototype.__cleanUp = function() {
    if (this.outerSink) {
      lib.destroyASAP(this.outerSink);
    }
    this.outerSink = null;
    ParentService.prototype.__cleanUp.call(this);
  };

  SinkExposerService.prototype.setOuterSink = function (sink) {
    this.outerSink = sink;
    if (!sink) {
      //destroy all non-service role users?
      return;
    }
    //dangerous? alternative solution: introduce getModuleName method on the Service class and adjust all other software to use it
    this.modulename = sink.modulename;
    //TODO: now handle all the waiting logins etc
    console.log('outerSink set, now comes maintenance', sink.role, sink.modulename, sink.clientuser.__methodDescriptors, sink);
    while (this.waitingIdentities.length) {
      var wi = this.waitingIdentities.shift();
      wi[1].resolve(this.introduceUser(wi[0])); //the problem here is I need to be 100% sure that introduceUser will _not_ return a promise.
    }
    sink.consumeOOB(this);
  };

  SinkExposerService.prototype.introduceUser = function (userhash) {
    if (!this.outerSink) {
      var d = q.defer();
      this.waitingIdentities.push([userhash,d]);
      return d.promise;
    }
    return ParentService.prototype.introduceUser.call(this, userhash);
  };

  var _have = 'have';

  SinkExposerService.prototype.onOOBData = function (item) {
    console.log('outerSink oob item', item);
    if (item && item[1] === 's') {
      if(item[2] && item[2].p && item[2].p.indexOf(_have) === 0) {
        //haveXXX items should not be blindly copied, 
        //but appropriate subServices should be set instead
        this.exposeSubSink(item[2].p.substr(_have.length)); 
      } else {
        this.state.onStream(item);
      }
    }
  };

  SinkExposerService.prototype.exposeSubSink = function (subsinkname) {
    console.log('should start subservice', subsinkname);
  };

  return SinkExposerService;
}

module.exports = createSinkExposerService;
